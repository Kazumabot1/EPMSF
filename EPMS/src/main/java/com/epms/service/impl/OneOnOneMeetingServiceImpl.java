package com.epms.service.impl;

import com.epms.dto.FollowUpRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;
import com.epms.entity.Employee;
import com.epms.entity.OneOnOneActionItem;
import com.epms.entity.OneOnOneMeeting;
import com.epms.entity.User;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.OneOnOneMeetingRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.NotificationService;
import com.epms.service.OneOnOneMeetingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class OneOnOneMeetingServiceImpl implements OneOnOneMeetingService {

    private final OneOnOneMeetingRepository meetingRepo;
    private final EmployeeRepository employeeRepo;
    private final UserRepository userRepo;
    private final NotificationService notificationService;

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("MMM dd, yyyy, hh:mm a");

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request) {
        User currentUser = getCurrentUser();
        validateCreateRequest(request);

        Employee selectedEmployee = employeeRepo.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found."));

        Optional<Employee> creatorEmployee = resolveCurrentUserEmployee(currentUser);

        OneOnOneMeeting meeting = new OneOnOneMeeting();
        meeting.setEmployee(selectedEmployee);
        meeting.setManager(creatorEmployee.orElse(null));
        meeting.setCreatedByUser(currentUser);
        meeting.setScheduledDate(request.getScheduledDate());
        meeting.setLocation(cleanNullable(request.getLocation()));
        meeting.setNotes(cleanNullable(request.getNotes()));
        meeting.setStatus(false);
        meeting.setFirstMeetingEndDate(null);
        meeting.setFollowUpDate(null);
        meeting.setFollowUpGoal(null);
        meeting.setFollowUpNotes(null);
        meeting.setFollowUpLocation(null);
        meeting.setFollowUpStatus(false);
        meeting.setFollowUpEndDate(null);
        meeting.setIsFinalized(null);
        meeting.setCreatedAt(LocalDateTime.now());
        meeting.setUpdatedAt(null);
        meeting.setParentMeetingId(null);
        meeting.setReminder24hSent(false);
        meeting.setFollowUpReminder24hSent(false);

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        sendCreationNotifications(saved, false);

        if (isWithinNext24Hours(saved.getScheduledDate())) {
            sendReminderNotifications(saved, false);
            saved.setReminder24hSent(true);
            saved = meetingRepo.save(saved);
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto updateMeeting(Integer id, OneOnOneMeetingRequestDto request) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        if (request.getScheduledDate() == null) {
            throw new RuntimeException("Scheduled date is required.");
        }

        boolean scheduledDateChanged = !Objects.equals(meeting.getScheduledDate(), request.getScheduledDate());

        if (scheduledDateChanged && request.getScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot update a meeting to a past time.");
        }

        validateTextLimit(request.getNotes(), "Notes", 1000);
        validateTextLimit(request.getFollowUpNotes(), "Follow-up notes", 1000);
        validateTextLimit(request.getLocation(), "Location", 500);

        meeting.setScheduledDate(request.getScheduledDate());

        if (request.getLocation() != null) {
            meeting.setLocation(cleanNullable(request.getLocation()));
        }

        if (request.getNotes() != null) {
            meeting.setNotes(cleanNullable(request.getNotes()));
        }

        if (request.getFollowUpNotes() != null) {
            meeting.setFollowUpNotes(cleanNullable(request.getFollowUpNotes()));
        }

        if (meeting.getCreatedByUser() == null) {
            meeting.setCreatedByUser(getCurrentUser());
        }

        meeting.setUpdatedAt(LocalDateTime.now());

        if (scheduledDateChanged) {
            meeting.setReminder24hSent(false);
        }

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        if (scheduledDateChanged) {
            sendUpdatedNotifications(saved, false);

            if (isWithinNext24Hours(saved.getScheduledDate())) {
                sendReminderNotifications(saved, false);
                saved.setReminder24hSent(true);
                saved = meetingRepo.save(saved);
            }
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public void deleteMeeting(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        String meetingTime = formatDateTime(stageStartDate(meeting));

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "Your one-on-one meeting at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        notifyCreator(
                meeting,
                "One-on-One Meeting Cancelled",
                "The one-on-one meeting with "
                        + employeeName(meeting.getEmployee())
                        + " at " + meetingTime + " was cancelled."
        );

        meetingRepo.delete(meeting);
    }

    @Override
    @Transactional(readOnly = true)
    public List<OneOnOneMeetingResponseDto> getUpcomingMeetings() {
        Optional<Integer> currentEmployeeId = getCurrentUserEmployeeId();

        if (currentEmployeeId.isEmpty()) {
            return meetingRepo.findAll()
                    .stream()
                    .filter(meeting -> meeting.getParentMeetingId() == null)
                    .filter(meeting -> meeting.getIsFinalized() == null)
                    .filter(this::isUpcoming)
                    .sorted(Comparator.comparing(this::stageStartDate, Comparator.nullsLast(Comparator.naturalOrder())))
                    .map(this::toDto)
                    .toList();
        }

        return meetingRepo.findUpcomingForUser(currentEmployeeId.get(), LocalDateTime.now())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OneOnOneMeetingResponseDto> getOngoingMeetings() {
        Optional<Integer> currentEmployeeId = getCurrentUserEmployeeId();

        if (currentEmployeeId.isEmpty()) {
            return meetingRepo.findAll()
                    .stream()
                    .filter(meeting -> meeting.getParentMeetingId() == null)
                    .filter(meeting -> meeting.getIsFinalized() == null)
                    .filter(this::isOngoing)
                    .sorted(Comparator.comparing(this::stageStartDate, Comparator.nullsLast(Comparator.naturalOrder())))
                    .map(this::toDto)
                    .toList();
        }

        return meetingRepo.findOngoingForUser(currentEmployeeId.get())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<OneOnOneMeetingResponseDto> getPastMeetings() {
        Optional<Integer> currentEmployeeId = getCurrentUserEmployeeId();

        if (currentEmployeeId.isEmpty()) {
            return meetingRepo.findAll()
                    .stream()
                    .filter(meeting -> meeting.getParentMeetingId() == null)
                    .filter(meeting -> meeting.getIsFinalized() != null)
                    .sorted(Comparator.comparing(
                            OneOnOneMeeting::getIsFinalized,
                            Comparator.nullsLast(Comparator.reverseOrder())
                    ))
                    .map(this::toDto)
                    .toList();
        }

        return meetingRepo.findPastForUser(currentEmployeeId.get())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public OneOnOneMeetingResponseDto getMeetingById(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        return toDto(meeting);
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto finishMeeting(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        LocalDateTime now = LocalDateTime.now();

        if (isInFollowUpStage(meeting)) {
            meeting.setFollowUpStatus(true);
            meeting.setFollowUpEndDate(now);
            meeting.setIsFinalized(now);
        } else {
            meeting.setStatus(true);
            meeting.setFirstMeetingEndDate(now);
            meeting.setIsFinalized(now);
        }

        if (meeting.getCreatedByUser() == null) {
            meeting.setCreatedByUser(getCurrentUser());
        }

        meeting.setUpdatedAt(now);

        return toDto(meetingRepo.save(meeting));
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        if (request.getFollowUpDate() == null) {
            throw new RuntimeException("Follow-up date is required.");
        }

        if (request.getFollowUpDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a follow-up meeting for a past time.");
        }

        validateTextLimit(request.getFollowUpGoal(), "Follow-up goal", 1000);
        validateTextLimit(request.getFollowUpNotes(), "Follow-up notes", 1000);
        validateTextLimit(request.getLocation(), "Follow-up location", 500);

        LocalDateTime now = LocalDateTime.now();

        if (meeting.getCreatedByUser() == null) {
            meeting.setCreatedByUser(getCurrentUser());
        }

        meeting.setFirstMeetingEndDate(now);
        meeting.setStatus(false);
        meeting.setFollowUpDate(request.getFollowUpDate());
        meeting.setFollowUpGoal(cleanNullable(request.getFollowUpGoal()));
        meeting.setFollowUpLocation(cleanNullable(request.getLocation()));

        if (request.getFollowUpNotes() != null) {
            meeting.setFollowUpNotes(cleanNullable(request.getFollowUpNotes()));
        }

        meeting.setFollowUpStatus(false);
        meeting.setFollowUpEndDate(null);
        meeting.setFollowUpReminder24hSent(false);
        meeting.setIsFinalized(null);
        meeting.setUpdatedAt(now);
        meeting.setParentMeetingId(null);

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        sendCreationNotifications(saved, true);

        if (isWithinNext24Hours(saved.getFollowUpDate())) {
            sendReminderNotifications(saved, true);
            saved.setFollowUpReminder24hSent(true);
            saved = meetingRepo.save(saved);
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public void autoActivateDueMeetings() {
        LocalDateTime now = LocalDateTime.now();

        List<OneOnOneMeeting> firstMeetings = meetingRepo.findFirstMeetingsToActivate(now);

        for (OneOnOneMeeting meeting : firstMeetings) {
            meeting.setStatus(true);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(firstMeetings);

        List<OneOnOneMeeting> followUpMeetings = meetingRepo.findFollowUpMeetingsToActivate(now);

        for (OneOnOneMeeting meeting : followUpMeetings) {
            meeting.setFollowUpStatus(true);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(followUpMeetings);

        LocalDateTime eightHoursAgo = now.minusHours(8);

        List<OneOnOneMeeting> oldFirstMeetings = meetingRepo.findFirstOngoingMeetingsToAutoClose(eightHoursAgo);

        for (OneOnOneMeeting meeting : oldFirstMeetings) {
            meeting.setFirstMeetingEndDate(now);
            meeting.setIsFinalized(now);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(oldFirstMeetings);

        List<OneOnOneMeeting> oldFollowUpMeetings = meetingRepo.findFollowUpOngoingMeetingsToAutoClose(eightHoursAgo);

        for (OneOnOneMeeting meeting : oldFollowUpMeetings) {
            meeting.setFollowUpEndDate(now);
            meeting.setIsFinalized(now);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(oldFollowUpMeetings);
    }

    private void sendCreationNotifications(OneOnOneMeeting meeting, boolean followUpStage) {
        LocalDateTime startDate = followUpStage ? meeting.getFollowUpDate() : meeting.getScheduledDate();
        String meetingTime = formatDateTime(startDate);
        String location = followUpStage ? meeting.getFollowUpLocation() : meeting.getLocation();
        String notes = followUpStage ? meeting.getFollowUpGoal() : meeting.getNotes();
        String creatorName = creatorName(meeting);
        String employeeName = employeeName(meeting.getEmployee());
        String title = followUpStage ? "New One-on-One Follow-Up Meeting" : "New One-on-One Meeting";
        String creatorTitle = followUpStage ? "One-on-One Follow-Up Created" : "One-on-One Meeting Created";

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        title,
                        creatorName + " scheduled a one-on-one "
                                + (followUpStage ? "follow-up " : "")
                                + "meeting with you at "
                                + meetingTime
                                + buildLocationPreview(location)
                                + buildNotesPreview(notes),
                        "MEETING"
                )
        );

        notifyCreator(
                meeting,
                creatorTitle,
                "You scheduled a one-on-one "
                        + (followUpStage ? "follow-up " : "")
                        + "meeting with "
                        + employeeName
                        + " at " + meetingTime
                        + buildLocationPreview(location)
                        + buildNotesPreview(notes)
        );
    }

    private void sendUpdatedNotifications(OneOnOneMeeting meeting, boolean followUpStage) {
        LocalDateTime startDate = followUpStage ? meeting.getFollowUpDate() : meeting.getScheduledDate();
        String meetingTime = formatDateTime(startDate);
        String location = followUpStage ? meeting.getFollowUpLocation() : meeting.getLocation();
        String notes = followUpStage ? meeting.getFollowUpGoal() : meeting.getNotes();
        String creatorName = creatorName(meeting);
        String employeeName = employeeName(meeting.getEmployee());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting with " + creatorName
                                + " was updated to " + meetingTime
                                + buildLocationPreview(location)
                                + buildNotesPreview(notes),
                        "MEETING"
                )
        );

        notifyCreator(
                meeting,
                "One-on-One Meeting Updated",
                "Your one-on-one meeting with " + employeeName
                        + " was updated to " + meetingTime
                        + buildLocationPreview(location)
                        + buildNotesPreview(notes)
        );
    }

    private void sendReminderNotifications(OneOnOneMeeting meeting, boolean followUpStage) {
        LocalDateTime startDate = followUpStage ? meeting.getFollowUpDate() : meeting.getScheduledDate();
        String meetingTime = formatDateTime(startDate);
        String location = followUpStage ? meeting.getFollowUpLocation() : meeting.getLocation();
        String label = followUpStage ? "follow-up meeting" : "meeting";

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "Meeting Reminder",
                        "Reminder: your one-on-one "
                                + label
                                + " with "
                                + creatorName(meeting)
                                + " will start at " + meetingTime
                                + buildLocationPreview(location)
                                + ".",
                        "MEETING"
                )
        );

        notifyCreator(
                meeting,
                "Meeting Reminder",
                "Reminder: your one-on-one "
                        + label
                        + " with "
                        + employeeName(meeting.getEmployee())
                        + " will start at " + meetingTime
                        + buildLocationPreview(location)
                        + "."
        );
    }

    private void notifyCreator(OneOnOneMeeting meeting, String title, String message) {
        if (meeting.getCreatedByUser() != null && meeting.getCreatedByUser().getId() != null) {
            notificationService.send(
                    meeting.getCreatedByUser().getId(),
                    title,
                    message,
                    "MEETING"
            );
            return;
        }

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        title,
                        message,
                        "MEETING"
                )
        );
    }

    private Optional<User> findUserByEmployee(Employee employee) {
        if (employee == null) {
            return Optional.empty();
        }

        if (employee.getId() != null) {
            Optional<User> byEmployeeId = userRepo.findActiveByEmployeeId(employee.getId())
                    .or(() -> userRepo.findByEmployeeId(employee.getId()));

            if (byEmployeeId.isPresent()) {
                return byEmployeeId;
            }
        }

        if (employee.getEmail() != null && !employee.getEmail().trim().isEmpty()) {
            return userRepo.findActiveByEmail(employee.getEmail().trim())
                    .or(() -> userRepo.findByEmail(employee.getEmail().trim()));
        }

        return Optional.empty();
    }

    private User getCurrentUser() {
        Integer currentUserId = SecurityUtils.currentUserId();

        return userRepo.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found."));
    }

    private Optional<Integer> getCurrentUserEmployeeId() {
        User currentUser = getCurrentUser();

        if (currentUser.getEmployeeId() != null) {
            return Optional.of(currentUser.getEmployeeId());
        }

        if (currentUser.getEmail() != null && !currentUser.getEmail().isBlank()) {
            return employeeRepo.findByEmail(currentUser.getEmail().trim())
                    .map(Employee::getId);
        }

        return Optional.empty();
    }

    private Optional<Employee> resolveCurrentUserEmployee(User currentUser) {
        if (currentUser == null) {
            return Optional.empty();
        }

        if (currentUser.getEmployeeId() != null) {
            Optional<Employee> byEmployeeId = employeeRepo.findById(currentUser.getEmployeeId());

            if (byEmployeeId.isPresent()) {
                return byEmployeeId;
            }
        }

        if (currentUser.getEmail() != null && !currentUser.getEmail().isBlank()) {
            return employeeRepo.findByEmail(currentUser.getEmail().trim());
        }

        return Optional.empty();
    }

    private boolean isWithinNext24Hours(LocalDateTime scheduledDate) {
        if (scheduledDate == null) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        return !scheduledDate.isBefore(now) && !scheduledDate.isAfter(now.plusHours(24));
    }

    private void validateCreateRequest(OneOnOneMeetingRequestDto request) {
        if (request == null) {
            throw new RuntimeException("Meeting request is required.");
        }

        if (request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required.");
        }

        if (request.getScheduledDate() == null) {
            throw new RuntimeException("Scheduled date is required.");
        }

        if (request.getScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a meeting for a past time.");
        }

        validateTextLimit(request.getNotes(), "Notes", 1000);
        validateTextLimit(request.getLocation(), "Location", 500);
    }

    private void validateTextLimit(String value, String fieldName, int maxLength) {
        if (value != null && value.length() > maxLength) {
            throw new RuntimeException(fieldName + " cannot exceed " + maxLength + " characters.");
        }
    }

    private boolean isUpcoming(OneOnOneMeeting meeting) {
        LocalDateTime now = LocalDateTime.now();

        if (meeting.getIsFinalized() != null) {
            return false;
        }

        if (meeting.getFirstMeetingEndDate() == null) {
            return meeting.getScheduledDate() != null
                    && meeting.getScheduledDate().isAfter(now)
                    && !Boolean.TRUE.equals(meeting.getStatus());
        }

        return meeting.getFollowUpDate() != null
                && meeting.getFollowUpDate().isAfter(now)
                && meeting.getFollowUpEndDate() == null
                && !Boolean.TRUE.equals(meeting.getFollowUpStatus());
    }

    private boolean isOngoing(OneOnOneMeeting meeting) {
        if (meeting.getIsFinalized() != null) {
            return false;
        }

        if (meeting.getFirstMeetingEndDate() == null) {
            return Boolean.TRUE.equals(meeting.getStatus());
        }

        return Boolean.TRUE.equals(meeting.getFollowUpStatus())
                && meeting.getFollowUpEndDate() == null;
    }

    private boolean isInFollowUpStage(OneOnOneMeeting meeting) {
        return meeting.getFirstMeetingEndDate() != null
                && meeting.getFollowUpDate() != null
                && meeting.getFollowUpEndDate() == null
                && meeting.getIsFinalized() == null;
    }

    private LocalDateTime stageStartDate(OneOnOneMeeting meeting) {
        if (meeting == null) {
            return null;
        }

        if (isInFollowUpStage(meeting)) {
            return meeting.getFollowUpDate();
        }

        return meeting.getScheduledDate();
    }

    private OneOnOneMeetingResponseDto toDto(OneOnOneMeeting meeting) {
        OneOnOneMeetingResponseDto dto = new OneOnOneMeetingResponseDto();

        dto.setId(meeting.getId());

        if (meeting.getEmployee() != null) {
            dto.setEmployeeId(meeting.getEmployee().getId());
            dto.setEmployeeFirstName(meeting.getEmployee().getFirstName());
            dto.setEmployeeLastName(meeting.getEmployee().getLastName());
        }

        if (meeting.getManager() != null) {
            dto.setManagerId(meeting.getManager().getId());
            dto.setManagerFirstName(meeting.getManager().getFirstName());
            dto.setManagerLastName(meeting.getManager().getLastName());
        }

        if (meeting.getCreatedByUser() != null) {
            dto.setCreatorUserId(meeting.getCreatedByUser().getId());
            dto.setCreatorName(creatorName(meeting));
            dto.setCreatorEmail(meeting.getCreatedByUser().getEmail());
        } else {
            dto.setCreatorUserId(null);
            dto.setCreatorName(creatorName(meeting));
            dto.setCreatorEmail(null);
        }

        dto.setScheduledDate(meeting.getScheduledDate());
        dto.setLocation(meeting.getLocation());
        dto.setNotes(meeting.getNotes());
        dto.setStatus(meeting.getStatus());
        dto.setFirstMeetingEndDate(meeting.getFirstMeetingEndDate());

        dto.setFollowUpDate(meeting.getFollowUpDate());
        dto.setFollowUpGoal(meeting.getFollowUpGoal());
        dto.setFollowUpNotes(meeting.getFollowUpNotes());
        dto.setFollowUpLocation(meeting.getFollowUpLocation());
        dto.setFollowUpStatus(meeting.getFollowUpStatus());
        dto.setFollowUpEndDate(meeting.getFollowUpEndDate());
        dto.setFollowUpReminder24hSent(meeting.getFollowUpReminder24hSent());

        dto.setIsFinalized(meeting.getIsFinalized());
        dto.setCreatedAt(meeting.getCreatedAt());
        dto.setUpdatedAt(meeting.getUpdatedAt());
        dto.setParentMeetingId(meeting.getParentMeetingId());

        boolean followUpStage = isInFollowUpStage(meeting);
        dto.setFollowUp(followUpStage);

        dto.setFollowUpMeetingId(meeting.getFollowUpDate() != null ? meeting.getId() : null);
        dto.setFollowUpStartDate(meeting.getFollowUpDate());
        dto.setFollowUpMeetingNotes(meeting.getFollowUpNotes());

        if (meeting.getActionItem() != null) {
            dto.setActionItem(toActionItemDto(meeting.getActionItem()));
        }

        return dto;
    }

    private OneOnOneActionItemResponseDto toActionItemDto(OneOnOneActionItem item) {
        OneOnOneActionItemResponseDto dto = new OneOnOneActionItemResponseDto();

        dto.setId(item.getId());
        dto.setMeetingId(item.getMeeting() != null ? item.getMeeting().getId() : null);
        dto.setDescription(item.getDescription());
        dto.setCreatedAt(item.getCreatedAt());
        dto.setUpdatedAt(item.getUpdatedAt());
        dto.setDueDate(item.getDueDate());
        dto.setOwner(item.getOwner());
        dto.setStatus(item.getStatus());

        return dto;
    }

    private String creatorName(OneOnOneMeeting meeting) {
        if (meeting == null) {
            return "Creator";
        }

        if (meeting.getCreatedByUser() != null) {
            User creator = meeting.getCreatedByUser();

            if (creator.getFullName() != null && !creator.getFullName().isBlank()) {
                return creator.getFullName().trim();
            }

            if (creator.getEmail() != null && !creator.getEmail().isBlank()) {
                return creator.getEmail().trim();
            }

            return "User #" + creator.getId();
        }

        if (meeting.getManager() != null) {
            return employeeName(meeting.getManager());
        }

        return "HR";
    }

    private String employeeName(Employee employee) {
        if (employee == null) {
            return "Employee";
        }

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        if (!fullName.isEmpty()) {
            return fullName;
        }

        if (employee.getEmail() != null && !employee.getEmail().trim().isEmpty()) {
            return employee.getEmail().trim();
        }

        return "Employee #" + employee.getId();
    }

    private String formatDateTime(LocalDateTime dateTime) {
        if (dateTime == null) {
            return "";
        }

        return dateTime.format(FORMATTER);
    }

    private String buildNotesPreview(String notes) {
        if (notes == null || notes.trim().isEmpty()) {
            return "";
        }

        String clean = notes.trim();

        if (clean.length() <= 25) {
            return ". Notes: " + clean;
        }

        return ". Notes: " + clean.substring(0, 25) + "... see more";
    }

    private String buildLocationPreview(String location) {
        if (location == null || location.trim().isEmpty()) {
            return "";
        }

        return " at " + location.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}
