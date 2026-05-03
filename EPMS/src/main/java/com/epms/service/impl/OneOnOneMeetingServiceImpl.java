//package com.epms.service.impl;
//
//import com.epms.dto.FollowUpRequestDto;
//import com.epms.dto.OneOnOneActionItemResponseDto;
//import com.epms.dto.OneOnOneMeetingRequestDto;
//import com.epms.dto.OneOnOneMeetingResponseDto;
//import com.epms.entity.OneOnOneMeeting;
//import com.epms.entity.User;
//import com.epms.entity.Employee;
//import com.epms.repository.EmployeeRepository;
//import com.epms.repository.OneOnOneMeetingRepository;
//import com.epms.repository.UserRepository;
//import com.epms.security.SecurityUtils;
//import com.epms.service.NotificationService;
//import com.epms.service.OneOnOneMeetingService;
//import lombok.RequiredArgsConstructor;
//import org.springframework.stereotype.Service;
//import org.springframework.transaction.annotation.Transactional;
//
//import java.time.LocalDateTime;
//import java.time.format.DateTimeFormatter;
//import java.util.List;
//import java.util.Objects;
//import java.util.stream.Collectors;
//
//@Service
//@RequiredArgsConstructor
//public class OneOnOneMeetingServiceImpl implements OneOnOneMeetingService {
//
//    private final OneOnOneMeetingRepository meetingRepo;
//    private final EmployeeRepository employeeRepo;
//    private final UserRepository userRepo;
//    private final NotificationService notificationService;
//
//    private static final DateTimeFormatter FORMATTER =
//            DateTimeFormatter.ofPattern("MMM dd, yyyy, hh:mm a");
//
//    @Override
//    @Transactional
//    public OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request) {
//        User currentUser = getCurrentUser();
//
//        validateCreateRequest(request);
//
//        Employee manager = employeeRepo.findById(currentUser.getEmployeeId())
//                .orElseThrow(() -> new RuntimeException("Manager employee record not found."));
//
//        Employee employee = employeeRepo.findById(request.getEmployeeId())
//                .orElseThrow(() -> new RuntimeException("Employee not found."));
//
//        OneOnOneMeeting meeting = new OneOnOneMeeting();
//
//        meeting.setEmployee(employee);
//        meeting.setManager(manager);
//        meeting.setScheduledDate(request.getScheduledDate());
//        meeting.setNotes(request.getNotes());
//        meeting.setStatus(false);
//        meeting.setIsFinalized(null);
//        meeting.setCreatedAt(LocalDateTime.now());
//        meeting.setUpdatedAt(null);
//        meeting.setParentMeetingId(request.getParentMeetingId());
//        meeting.setFollowUpNotes(request.getFollowUpNotes());
//        meeting.setReminder24hSent(false);
//
//        OneOnOneMeeting saved = meetingRepo.save(meeting);
//
//        userRepo.findByEmployeeId(employee.getId()).ifPresent(employeeUser ->
//                notificationService.send(
//                        employeeUser.getId(),
//                        "New One-on-One Meeting",
//                        manager.getFirstName() + " " + manager.getLastName()
//                                + " scheduled a one-on-one meeting with you at "
//                                + formatDateTime(saved.getScheduledDate())
//                                + buildNotesPreview(saved.getNotes()),
//                        "MEETING"
//                )
//        );
//
//        return toDto(saved);
//    }
//
//    @Override
//    @Transactional
//    public OneOnOneMeetingResponseDto updateMeeting(Integer id, OneOnOneMeetingRequestDto request) {
//        OneOnOneMeeting meeting = meetingRepo.findById(id)
//                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));
//
//        if (request.getScheduledDate() == null) {
//            throw new RuntimeException("Scheduled date is required.");
//        }
//
//        boolean scheduledDateChanged = !Objects.equals(meeting.getScheduledDate(), request.getScheduledDate());
//
//        if (scheduledDateChanged && request.getScheduledDate().isBefore(LocalDateTime.now())) {
//            throw new RuntimeException("Cannot update a meeting to a past time.");
//        }
//
//        if (request.getNotes() != null && request.getNotes().length() > 1000) {
//            throw new RuntimeException("Notes cannot exceed 1000 characters.");
//        }
//
//        if (request.getFollowUpNotes() != null && request.getFollowUpNotes().length() > 1000) {
//            throw new RuntimeException("Follow-up notes cannot exceed 1000 characters.");
//        }
//
//        meeting.setScheduledDate(request.getScheduledDate());
//        meeting.setNotes(request.getNotes());
//        meeting.setFollowUpNotes(request.getFollowUpNotes());
//        meeting.setUpdatedAt(LocalDateTime.now());
//
//        OneOnOneMeeting saved = meetingRepo.save(meeting);
//
//        if (scheduledDateChanged) {
//            userRepo.findByEmployeeId(saved.getEmployee().getId()).ifPresent(employeeUser ->
//                    notificationService.send(
//                            employeeUser.getId(),
//                            "One-on-One Meeting Updated",
//                            "Your one-on-one meeting was updated to "
//                                    + formatDateTime(saved.getScheduledDate())
//                                    + buildNotesPreview(saved.getNotes()),
//                            "MEETING"
//                    )
//            );
//        }
//
//        return toDto(saved);
//    }
//
//    @Override
//    @Transactional
//    public void deleteMeeting(Integer id) {
//        OneOnOneMeeting meeting = meetingRepo.findById(id)
//                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));
//
//        String meetingTime = formatDateTime(meeting.getScheduledDate());
//
//        userRepo.findByEmployeeId(meeting.getEmployee().getId()).ifPresent(employeeUser ->
//                notificationService.send(
//                        employeeUser.getId(),
//                        "One-on-One Meeting Cancelled",
//                        "Your one-on-one meeting at " + meetingTime + " was cancelled.",
//                        "MEETING"
//                )
//        );
//
//        userRepo.findByEmployeeId(meeting.getManager().getId()).ifPresent(managerUser ->
//                notificationService.send(
//                        managerUser.getId(),
//                        "One-on-One Meeting Cancelled",
//                        "The one-on-one meeting with "
//                                + meeting.getEmployee().getFirstName() + " "
//                                + meeting.getEmployee().getLastName()
//                                + " at " + meetingTime + " was cancelled.",
//                        "MEETING"
//                )
//        );
//
//        meetingRepo.delete(meeting);
//    }
//
//    @Override
//    public List<OneOnOneMeetingResponseDto> getUpcomingMeetings() {
//        User user = getCurrentUser();
//
//        return meetingRepo.findUpcomingForUser(user.getEmployeeId(), LocalDateTime.now())
//                .stream()
//                .map(this::toDto)
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public List<OneOnOneMeetingResponseDto> getOngoingMeetings() {
//        User user = getCurrentUser();
//
//        return meetingRepo.findOngoingForUser(user.getEmployeeId())
//                .stream()
//                .map(this::toDto)
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public List<OneOnOneMeetingResponseDto> getPastMeetings() {
//        User user = getCurrentUser();
//
//        return meetingRepo.findPastForUser(user.getEmployeeId())
//                .stream()
//                .map(this::toDto)
//                .collect(Collectors.toList());
//    }
//
//    @Override
//    public OneOnOneMeetingResponseDto getMeetingById(Integer id) {
//        OneOnOneMeeting meeting = meetingRepo.findById(id)
//                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));
//
//        return toDto(meeting);
//    }
//
//    @Override
//    @Transactional
//    public OneOnOneMeetingResponseDto finishMeeting(Integer id) {
//        OneOnOneMeeting meeting = meetingRepo.findById(id)
//                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));
//
//        meeting.setStatus(true);
//        meeting.setIsFinalized(LocalDateTime.now());
//        meeting.setUpdatedAt(LocalDateTime.now());
//
//        return toDto(meetingRepo.save(meeting));
//    }
//
//    @Override
//    @Transactional
//    public OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request) {
//        OneOnOneMeeting parentMeeting = meetingRepo.findById(id)
//                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));
//
//        if (request.getFollowUpDate() == null) {
//            throw new RuntimeException("Follow-up date is required.");
//        }
//
//        if (request.getFollowUpDate().isBefore(LocalDateTime.now())) {
//            throw new RuntimeException("Cannot create a follow-up meeting for a past time.");
//        }
//
//        parentMeeting.setFollowUpDate(request.getFollowUpDate());
//        parentMeeting.setIsFinalized(LocalDateTime.now());
//        parentMeeting.setUpdatedAt(LocalDateTime.now());
//
//        OneOnOneMeeting followUpMeeting = meetingRepo
//                .findFollowUpByParentMeetingId(parentMeeting.getId())
//                .orElse(new OneOnOneMeeting());
//
//        if (followUpMeeting.getId() == null) {
//            followUpMeeting.setCreatedAt(LocalDateTime.now());
//        }
//
//        followUpMeeting.setEmployee(parentMeeting.getEmployee());
//        followUpMeeting.setManager(parentMeeting.getManager());
//        followUpMeeting.setScheduledDate(request.getFollowUpDate());
//        followUpMeeting.setNotes(null);
//        followUpMeeting.setFollowUpNotes(null);
//        followUpMeeting.setStatus(false);
//        followUpMeeting.setIsFinalized(null);
//        followUpMeeting.setUpdatedAt(null);
//        followUpMeeting.setParentMeetingId(parentMeeting.getId());
//        followUpMeeting.setReminder24hSent(false);
//
//        meetingRepo.save(parentMeeting);
//        meetingRepo.save(followUpMeeting);
//
//        return toDto(parentMeeting);
//    }
//
//    @Override
//    @Transactional
//    public void autoActivateDueMeetings() {
//        LocalDateTime now = LocalDateTime.now();
//
//        List<OneOnOneMeeting> due = meetingRepo.findMeetingsToActivate(now);
//
//        for (OneOnOneMeeting meeting : due) {
//            meeting.setStatus(true);
//            meeting.setUpdatedAt(now);
//        }
//
//        meetingRepo.saveAll(due);
//
//        LocalDateTime eightHoursAgo = now.minusHours(8);
//
//        List<OneOnOneMeeting> oldOngoing = meetingRepo.findOngoingMeetingsToAutoClose(eightHoursAgo);
//
//        for (OneOnOneMeeting meeting : oldOngoing) {
//            meeting.setIsFinalized(now);
//            meeting.setUpdatedAt(now);
//        }
//
//        meetingRepo.saveAll(oldOngoing);
//    }
//
//    private void validateCreateRequest(OneOnOneMeetingRequestDto request) {
//        if (request.getEmployeeId() == null) {
//            throw new RuntimeException("Employee is required.");
//        }
//
//        if (request.getScheduledDate() == null) {
//            throw new RuntimeException("Scheduled date is required.");
//        }
//
//        if (request.getScheduledDate().isBefore(LocalDateTime.now())) {
//            throw new RuntimeException("Cannot create a meeting for a past time.");
//        }
//
//        if (request.getNotes() != null && request.getNotes().length() > 1000) {
//            throw new RuntimeException("Notes cannot exceed 1000 characters.");
//        }
//
//        if (request.getFollowUpNotes() != null && request.getFollowUpNotes().length() > 1000) {
//            throw new RuntimeException("Follow-up notes cannot exceed 1000 characters.");
//        }
//    }
//
//    private User getCurrentUser() {
//        Integer currentUserId = SecurityUtils.currentUserId();
//
//        User user = userRepo.findById(currentUserId)
//                .orElseThrow(() -> new RuntimeException("Current user not found."));
//
//        if (user.getEmployeeId() == null) {
//            throw new RuntimeException("Current logged-in user is not linked to an employee record.");
//        }
//
//        return user;
//    }
//
//    private OneOnOneMeetingResponseDto toDto(OneOnOneMeeting m) {
//        OneOnOneMeetingResponseDto dto = new OneOnOneMeetingResponseDto();
//
//        dto.setId(m.getId());
//
//        if (m.getEmployee() != null) {
//            dto.setEmployeeId(m.getEmployee().getId());
//            dto.setEmployeeFirstName(m.getEmployee().getFirstName());
//            dto.setEmployeeLastName(m.getEmployee().getLastName());
//        }
//
//        if (m.getManager() != null) {
//            dto.setManagerId(m.getManager().getId());
//            dto.setManagerFirstName(m.getManager().getFirstName());
//            dto.setManagerLastName(m.getManager().getLastName());
//        }
//
//        dto.setScheduledDate(m.getScheduledDate());
//        dto.setNotes(m.getNotes());
//        dto.setFollowUpNotes(m.getFollowUpNotes());
//        dto.setStatus(m.getStatus());
//        dto.setFollowUpDate(m.getFollowUpDate());
//        dto.setIsFinalized(m.getIsFinalized());
//        dto.setCreatedAt(m.getCreatedAt());
//        dto.setUpdatedAt(m.getUpdatedAt());
//        dto.setParentMeetingId(m.getParentMeetingId());
//        dto.setFollowUp(m.getParentMeetingId() != null);
//
//        if (m.getActionItem() != null) {
//            dto.setActionItem(toActionItemDto(m.getActionItem()));
//        }
//
//        if (m.getParentMeetingId() == null) {
//            meetingRepo.findFollowUpByParentMeetingId(m.getId()).ifPresent(followUp -> {
//                dto.setFollowUpMeetingId(followUp.getId());
//                dto.setFollowUpStartDate(followUp.getScheduledDate());
//                dto.setFollowUpEndDate(followUp.getIsFinalized());
//                dto.setFollowUpMeetingNotes(followUp.getFollowUpNotes());
//            });
//        }
//
//        return dto;
//    }
//
//    private OneOnOneActionItemResponseDto toActionItemDto(com.epms.entity.OneOnOneActionItem item) {
//        OneOnOneActionItemResponseDto dto = new OneOnOneActionItemResponseDto();
//
//        dto.setId(item.getId());
//        dto.setMeetingId(item.getMeeting() != null ? item.getMeeting().getId() : null);
//        dto.setDescription(item.getDescription());
//        dto.setCreatedAt(item.getCreatedAt());
//        dto.setUpdatedAt(item.getUpdatedAt());
//        dto.setDueDate(item.getDueDate());
//        dto.setOwner(item.getOwner());
//        dto.setStatus(item.getStatus());
//
//        return dto;
//    }
//
//    private String formatDateTime(LocalDateTime dateTime) {
//        if (dateTime == null) {
//            return "";
//        }
//
//        return dateTime.format(FORMATTER);
//    }
//
//    private String buildNotesPreview(String notes) {
//        if (notes == null || notes.trim().isEmpty()) {
//            return "";
//        }
//
//        String clean = notes.trim();
//
//        if (clean.length() <= 25) {
//            return ". Notes: " + clean;
//        }
//
//        return ". Notes: " + clean.substring(0, 25) + "... see more";
//    }
//}

/*
package com.epms.service.impl;

import com.epms.dto.FollowUpRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;
import com.epms.entity.Employee;
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
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

*/
/**
 * Why this file is updated:
 * - Meeting creation must notify both people: selected employee and creator/manager.
 * - If the meeting is created within the next 24 hours, the 24-hour reminder is sent immediately too.
 * - The scheduler still handles meetings created more than 24 hours in advance.
 *//*

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

        Employee manager = employeeRepo.findById(currentUser.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Manager employee record not found."));

        Employee employee = employeeRepo.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found."));

        OneOnOneMeeting meeting = new OneOnOneMeeting();
        meeting.setEmployee(employee);
        meeting.setManager(manager);
        meeting.setScheduledDate(request.getScheduledDate());
        meeting.setNotes(request.getNotes());
        meeting.setStatus(false);
        meeting.setIsFinalized(null);
        meeting.setCreatedAt(LocalDateTime.now());
        meeting.setUpdatedAt(null);
        meeting.setParentMeetingId(request.getParentMeetingId());
        meeting.setFollowUpNotes(request.getFollowUpNotes());
        meeting.setReminder24hSent(false);

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        sendCreationNotifications(saved);

        if (isWithinNext24Hours(saved.getScheduledDate())) {
            sendReminderNotifications(saved);
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

        if (request.getNotes() != null && request.getNotes().length() > 1000) {
            throw new RuntimeException("Notes cannot exceed 1000 characters.");
        }

        if (request.getFollowUpNotes() != null && request.getFollowUpNotes().length() > 1000) {
            throw new RuntimeException("Follow-up notes cannot exceed 1000 characters.");
        }

        meeting.setScheduledDate(request.getScheduledDate());
        meeting.setNotes(request.getNotes());
        meeting.setFollowUpNotes(request.getFollowUpNotes());
        meeting.setUpdatedAt(LocalDateTime.now());

        if (scheduledDateChanged) {
            meeting.setReminder24hSent(false);
        }

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        if (scheduledDateChanged) {
            sendUpdatedNotifications(saved);

            if (isWithinNext24Hours(saved.getScheduledDate())) {
                sendReminderNotifications(saved);
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

        String meetingTime = formatDateTime(meeting.getScheduledDate());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "Your one-on-one meeting at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "The one-on-one meeting with "
                                + employeeName(meeting.getEmployee())
                                + " at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        meetingRepo.delete(meeting);
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getUpcomingMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findUpcomingForUser(user.getEmployeeId(), LocalDateTime.now())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getOngoingMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findOngoingForUser(user.getEmployeeId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getPastMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findPastForUser(user.getEmployeeId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
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

        meeting.setStatus(true);
        meeting.setIsFinalized(LocalDateTime.now());
        meeting.setUpdatedAt(LocalDateTime.now());

        return toDto(meetingRepo.save(meeting));
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request) {
        OneOnOneMeeting parentMeeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        if (request.getFollowUpDate() == null) {
            throw new RuntimeException("Follow-up date is required.");
        }

        if (request.getFollowUpDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a follow-up meeting for a past time.");
        }

        parentMeeting.setFollowUpDate(request.getFollowUpDate());
        parentMeeting.setIsFinalized(LocalDateTime.now());
        parentMeeting.setUpdatedAt(LocalDateTime.now());

        OneOnOneMeeting followUpMeeting = meetingRepo
                .findFollowUpByParentMeetingId(parentMeeting.getId())
                .orElse(new OneOnOneMeeting());

        if (followUpMeeting.getId() == null) {
            followUpMeeting.setCreatedAt(LocalDateTime.now());
        }

        followUpMeeting.setEmployee(parentMeeting.getEmployee());
        followUpMeeting.setManager(parentMeeting.getManager());
        followUpMeeting.setScheduledDate(request.getFollowUpDate());
        followUpMeeting.setNotes(null);
        followUpMeeting.setFollowUpNotes(null);
        followUpMeeting.setStatus(false);
        followUpMeeting.setIsFinalized(null);
        followUpMeeting.setUpdatedAt(null);
        followUpMeeting.setParentMeetingId(parentMeeting.getId());
        followUpMeeting.setReminder24hSent(false);

        meetingRepo.save(parentMeeting);
        OneOnOneMeeting savedFollowUp = meetingRepo.save(followUpMeeting);

        sendCreationNotifications(savedFollowUp);

        if (isWithinNext24Hours(savedFollowUp.getScheduledDate())) {
            sendReminderNotifications(savedFollowUp);
            savedFollowUp.setReminder24hSent(true);
            meetingRepo.save(savedFollowUp);
        }

        return toDto(parentMeeting);
    }

    @Override
    @Transactional
    public void autoActivateDueMeetings() {
        LocalDateTime now = LocalDateTime.now();

        List<OneOnOneMeeting> due = meetingRepo.findMeetingsToActivate(now);

        for (OneOnOneMeeting meeting : due) {
            meeting.setStatus(true);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(due);

        LocalDateTime eightHoursAgo = now.minusHours(8);

        List<OneOnOneMeeting> oldOngoing = meetingRepo.findOngoingMeetingsToAutoClose(eightHoursAgo);

        for (OneOnOneMeeting meeting : oldOngoing) {
            meeting.setIsFinalized(now);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(oldOngoing);
    }

    private void sendCreationNotifications(OneOnOneMeeting meeting) {
        String meetingTime = formatDateTime(meeting.getScheduledDate());
        String managerName = employeeName(meeting.getManager());
        String employeeName = employeeName(meeting.getEmployee());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "New One-on-One Meeting",
                        managerName + " scheduled a one-on-one meeting with you at "
                                + meetingTime
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Created",
                        "You scheduled a one-on-one meeting with "
                                + employeeName
                                + " at " + meetingTime
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );
    }

    private void sendUpdatedNotifications(OneOnOneMeeting meeting) {
        String meetingTime = formatDateTime(meeting.getScheduledDate());
        String managerName = employeeName(meeting.getManager());
        String employeeName = employeeName(meeting.getEmployee());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting with " + managerName
                                + " was updated to " + meetingTime
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting with " + employeeName
                                + " was updated to " + meetingTime
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );
    }

    public void sendReminderNotifications(OneOnOneMeeting meeting) {
        String msgForEmployee = "Reminder: your one-on-one meeting with "
                + employeeName(meeting.getManager())
                + " will start at " + formatDateTime(meeting.getScheduledDate()) + ".";

        String msgForManager = "Reminder: your one-on-one meeting with "
                + employeeName(meeting.getEmployee())
                + " will start at " + formatDateTime(meeting.getScheduledDate()) + ".";

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(employeeUser.getId(), "Meeting Reminder", msgForEmployee, "MEETING")
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(managerUser.getId(), "Meeting Reminder", msgForManager, "MEETING")
        );
    }

    private Optional<User> findUserByEmployee(Employee employee) {
        if (employee == null || employee.getId() == null) {
            return Optional.empty();
        }

        return userRepo.findActiveByEmployeeId(employee.getId())
                .or(() -> userRepo.findByEmployeeId(employee.getId()));
    }

    private boolean isWithinNext24Hours(LocalDateTime scheduledDate) {
        if (scheduledDate == null) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        return !scheduledDate.isBefore(now) && !scheduledDate.isAfter(now.plusHours(24));
    }

    private void validateCreateRequest(OneOnOneMeetingRequestDto request) {
        if (request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required.");
        }

        if (request.getScheduledDate() == null) {
            throw new RuntimeException("Scheduled date is required.");
        }

        if (request.getScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a meeting for a past time.");
        }

        if (request.getNotes() != null && request.getNotes().length() > 1000) {
            throw new RuntimeException("Notes cannot exceed 1000 characters.");
        }

        if (request.getFollowUpNotes() != null && request.getFollowUpNotes().length() > 1000) {
            throw new RuntimeException("Follow-up notes cannot exceed 1000 characters.");
        }
    }

    private User getCurrentUser() {
        Integer currentUserId = SecurityUtils.currentUserId();

        User user = userRepo.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found."));

        if (user.getEmployeeId() == null) {
            throw new RuntimeException("Current logged-in user is not linked to an employee record.");
        }

        return user;
    }

    private OneOnOneMeetingResponseDto toDto(OneOnOneMeeting m) {
        OneOnOneMeetingResponseDto dto = new OneOnOneMeetingResponseDto();

        dto.setId(m.getId());

        if (m.getEmployee() != null) {
            dto.setEmployeeId(m.getEmployee().getId());
            dto.setEmployeeFirstName(m.getEmployee().getFirstName());
            dto.setEmployeeLastName(m.getEmployee().getLastName());
        }

        if (m.getManager() != null) {
            dto.setManagerId(m.getManager().getId());
            dto.setManagerFirstName(m.getManager().getFirstName());
            dto.setManagerLastName(m.getManager().getLastName());
        }

        dto.setScheduledDate(m.getScheduledDate());
        dto.setNotes(m.getNotes());
        dto.setFollowUpNotes(m.getFollowUpNotes());
        dto.setStatus(m.getStatus());
        dto.setFollowUpDate(m.getFollowUpDate());
        dto.setIsFinalized(m.getIsFinalized());
        dto.setCreatedAt(m.getCreatedAt());
        dto.setUpdatedAt(m.getUpdatedAt());
        dto.setParentMeetingId(m.getParentMeetingId());
        dto.setFollowUp(m.getParentMeetingId() != null);

        if (m.getActionItem() != null) {
            dto.setActionItem(toActionItemDto(m.getActionItem()));
        }

        if (m.getParentMeetingId() == null) {
            meetingRepo.findFollowUpByParentMeetingId(m.getId()).ifPresent(followUp -> {
                dto.setFollowUpMeetingId(followUp.getId());
                dto.setFollowUpStartDate(followUp.getScheduledDate());
                dto.setFollowUpEndDate(followUp.getIsFinalized());
                dto.setFollowUpMeetingNotes(followUp.getFollowUpNotes());
            });
        }

        return dto;
    }

    private OneOnOneActionItemResponseDto toActionItemDto(com.epms.entity.OneOnOneActionItem item) {
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

    private String employeeName(Employee employee) {
        if (employee == null) {
            return "Unknown";
        }

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();
        return fullName.isEmpty() ? "Employee #" + employee.getId() : fullName;
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
}*/









package com.epms.service.impl;

import com.epms.dto.FollowUpRequestDto;
import com.epms.dto.OneOnOneActionItemResponseDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.OneOnOneMeetingResponseDto;
import com.epms.entity.Employee;
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
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * Why this file is fixed:
 * - Meeting creation now sends notification to both:
 *   1. selected employee
 *   2. creator/manager
 * - If the meeting is within the next 24 hours, reminder is also sent immediately.
 * - Employee user lookup is safer:
 *   first by users.employee_id, then by matching employee.email.
 */
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

        Employee manager = employeeRepo.findById(currentUser.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Manager employee record not found."));

        Employee employee = employeeRepo.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found."));

        OneOnOneMeeting meeting = new OneOnOneMeeting();

        meeting.setEmployee(employee);
        meeting.setManager(manager);
        meeting.setScheduledDate(request.getScheduledDate());
        meeting.setNotes(request.getNotes());
        meeting.setStatus(false);
        meeting.setIsFinalized(null);
        meeting.setCreatedAt(LocalDateTime.now());
        meeting.setUpdatedAt(null);
        meeting.setParentMeetingId(request.getParentMeetingId());
        meeting.setFollowUpNotes(request.getFollowUpNotes());
        meeting.setReminder24hSent(false);

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        sendCreationNotifications(saved);

        if (isWithinNext24Hours(saved.getScheduledDate())) {
            sendReminderNotifications(saved);
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

        if (request.getNotes() != null && request.getNotes().length() > 1000) {
            throw new RuntimeException("Notes cannot exceed 1000 characters.");
        }

        if (request.getFollowUpNotes() != null && request.getFollowUpNotes().length() > 1000) {
            throw new RuntimeException("Follow-up notes cannot exceed 1000 characters.");
        }

        meeting.setScheduledDate(request.getScheduledDate());
        meeting.setNotes(request.getNotes());
        meeting.setFollowUpNotes(request.getFollowUpNotes());
        meeting.setUpdatedAt(LocalDateTime.now());

        if (scheduledDateChanged) {
            meeting.setReminder24hSent(false);
        }

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        if (scheduledDateChanged) {
            sendUpdatedNotifications(saved);

            if (isWithinNext24Hours(saved.getScheduledDate())) {
                sendReminderNotifications(saved);
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

        String meetingTime = formatDateTime(meeting.getScheduledDate());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "Your one-on-one meeting at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "The one-on-one meeting with "
                                + employeeName(meeting.getEmployee())
                                + " at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        meetingRepo.delete(meeting);
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getUpcomingMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findUpcomingForUser(user.getEmployeeId(), LocalDateTime.now())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getOngoingMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findOngoingForUser(user.getEmployeeId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getPastMeetings() {
        User user = getCurrentUser();

        return meetingRepo.findPastForUser(user.getEmployeeId())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
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

        meeting.setStatus(true);
        meeting.setIsFinalized(LocalDateTime.now());
        meeting.setUpdatedAt(LocalDateTime.now());

        return toDto(meetingRepo.save(meeting));
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request) {
        OneOnOneMeeting parentMeeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        if (request.getFollowUpDate() == null) {
            throw new RuntimeException("Follow-up date is required.");
        }

        if (request.getFollowUpDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a follow-up meeting for a past time.");
        }

        parentMeeting.setFollowUpDate(request.getFollowUpDate());
        parentMeeting.setIsFinalized(LocalDateTime.now());
        parentMeeting.setUpdatedAt(LocalDateTime.now());

        OneOnOneMeeting followUpMeeting = meetingRepo
                .findFollowUpByParentMeetingId(parentMeeting.getId())
                .orElse(new OneOnOneMeeting());

        if (followUpMeeting.getId() == null) {
            followUpMeeting.setCreatedAt(LocalDateTime.now());
        }

        followUpMeeting.setEmployee(parentMeeting.getEmployee());
        followUpMeeting.setManager(parentMeeting.getManager());
        followUpMeeting.setScheduledDate(request.getFollowUpDate());
        followUpMeeting.setNotes(null);
        followUpMeeting.setFollowUpNotes(null);
        followUpMeeting.setStatus(false);
        followUpMeeting.setIsFinalized(null);
        followUpMeeting.setUpdatedAt(null);
        followUpMeeting.setParentMeetingId(parentMeeting.getId());
        followUpMeeting.setReminder24hSent(false);

        meetingRepo.save(parentMeeting);
        OneOnOneMeeting savedFollowUp = meetingRepo.save(followUpMeeting);

        sendCreationNotifications(savedFollowUp);

        if (isWithinNext24Hours(savedFollowUp.getScheduledDate())) {
            sendReminderNotifications(savedFollowUp);
            savedFollowUp.setReminder24hSent(true);
            meetingRepo.save(savedFollowUp);
        }

        return toDto(parentMeeting);
    }

    @Override
    @Transactional
    public void autoActivateDueMeetings() {
        LocalDateTime now = LocalDateTime.now();

        List<OneOnOneMeeting> due = meetingRepo.findMeetingsToActivate(now);

        for (OneOnOneMeeting meeting : due) {
            meeting.setStatus(true);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(due);

        LocalDateTime eightHoursAgo = now.minusHours(8);

        List<OneOnOneMeeting> oldOngoing = meetingRepo.findOngoingMeetingsToAutoClose(eightHoursAgo);

        for (OneOnOneMeeting meeting : oldOngoing) {
            meeting.setIsFinalized(now);
            meeting.setUpdatedAt(now);
        }

        meetingRepo.saveAll(oldOngoing);
    }

    private void sendCreationNotifications(OneOnOneMeeting meeting) {
        String meetingTime = formatDateTime(meeting.getScheduledDate());
        String managerName = employeeName(meeting.getManager());
        String employeeName = employeeName(meeting.getEmployee());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "New One-on-One Meeting",
                        managerName + " scheduled a one-on-one meeting with you at "
                                + meetingTime
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Created",
                        "You scheduled a one-on-one meeting with "
                                + employeeName
                                + " at " + meetingTime
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );
    }

    private void sendUpdatedNotifications(OneOnOneMeeting meeting) {
        String meetingTime = formatDateTime(meeting.getScheduledDate());
        String managerName = employeeName(meeting.getManager());
        String employeeName = employeeName(meeting.getEmployee());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting with " + managerName
                                + " was updated to " + meetingTime
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting with " + employeeName
                                + " was updated to " + meetingTime
                                + buildNotesPreview(meeting.getNotes()),
                        "MEETING"
                )
        );
    }

    private void sendReminderNotifications(OneOnOneMeeting meeting) {
        String meetingTime = formatDateTime(meeting.getScheduledDate());

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "Meeting Reminder",
                        "Reminder: your one-on-one meeting with "
                                + employeeName(meeting.getManager())
                                + " will start at " + meetingTime + ".",
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "Meeting Reminder",
                        "Reminder: your one-on-one meeting with "
                                + employeeName(meeting.getEmployee())
                                + " will start at " + meetingTime + ".",
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

    private boolean isWithinNext24Hours(LocalDateTime scheduledDate) {
        if (scheduledDate == null) {
            return false;
        }

        LocalDateTime now = LocalDateTime.now();
        return !scheduledDate.isBefore(now) && !scheduledDate.isAfter(now.plusHours(24));
    }

    private void validateCreateRequest(OneOnOneMeetingRequestDto request) {
        if (request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required.");
        }

        if (request.getScheduledDate() == null) {
            throw new RuntimeException("Scheduled date is required.");
        }

        if (request.getScheduledDate().isBefore(LocalDateTime.now())) {
            throw new RuntimeException("Cannot create a meeting for a past time.");
        }

        if (request.getNotes() != null && request.getNotes().length() > 1000) {
            throw new RuntimeException("Notes cannot exceed 1000 characters.");
        }

        if (request.getFollowUpNotes() != null && request.getFollowUpNotes().length() > 1000) {
            throw new RuntimeException("Follow-up notes cannot exceed 1000 characters.");
        }
    }

    private User getCurrentUser() {
        Integer currentUserId = SecurityUtils.currentUserId();

        User user = userRepo.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found."));

        if (user.getEmployeeId() == null) {
            throw new RuntimeException("Current logged-in user is not linked to an employee record.");
        }

        return user;
    }

    private OneOnOneMeetingResponseDto toDto(OneOnOneMeeting m) {
        OneOnOneMeetingResponseDto dto = new OneOnOneMeetingResponseDto();

        dto.setId(m.getId());

        if (m.getEmployee() != null) {
            dto.setEmployeeId(m.getEmployee().getId());
            dto.setEmployeeFirstName(m.getEmployee().getFirstName());
            dto.setEmployeeLastName(m.getEmployee().getLastName());
        }

        if (m.getManager() != null) {
            dto.setManagerId(m.getManager().getId());
            dto.setManagerFirstName(m.getManager().getFirstName());
            dto.setManagerLastName(m.getManager().getLastName());
        }

        dto.setScheduledDate(m.getScheduledDate());
        dto.setNotes(m.getNotes());
        dto.setFollowUpNotes(m.getFollowUpNotes());
        dto.setStatus(m.getStatus());
        dto.setFollowUpDate(m.getFollowUpDate());
        dto.setIsFinalized(m.getIsFinalized());
        dto.setCreatedAt(m.getCreatedAt());
        dto.setUpdatedAt(m.getUpdatedAt());
        dto.setParentMeetingId(m.getParentMeetingId());
        dto.setFollowUp(m.getParentMeetingId() != null);

        if (m.getActionItem() != null) {
            dto.setActionItem(toActionItemDto(m.getActionItem()));
        }

        if (m.getParentMeetingId() == null) {
            meetingRepo.findFollowUpByParentMeetingId(m.getId()).ifPresent(followUp -> {
                dto.setFollowUpMeetingId(followUp.getId());
                dto.setFollowUpStartDate(followUp.getScheduledDate());
                dto.setFollowUpEndDate(followUp.getIsFinalized());
                dto.setFollowUpMeetingNotes(followUp.getFollowUpNotes());
            });
        }

        return dto;
    }

    private OneOnOneActionItemResponseDto toActionItemDto(com.epms.entity.OneOnOneActionItem item) {
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

    private String employeeName(Employee employee) {
        if (employee == null) {
            return "Unknown";
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
}