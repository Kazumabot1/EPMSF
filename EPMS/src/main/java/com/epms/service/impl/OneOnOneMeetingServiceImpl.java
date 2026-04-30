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
        Integer currentUserId = SecurityUtils.currentUserId();

        User currentUser = userRepo.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));

        if (currentUser.getEmployeeId() == null) {
            throw new RuntimeException("Current logged-in user is not linked to an employee record.");
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

        if (request.getNotes() != null && request.getNotes().length() > 1000) {
            throw new RuntimeException("Notes cannot exceed 1000 characters.");
        }

        if (request.getFollowUpNotes() != null && request.getFollowUpNotes().length() > 1000) {
            throw new RuntimeException("Follow-up notes cannot exceed 1000 characters.");
        }

        Employee manager = employeeRepo.findById(currentUser.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Manager employee record not found"));

        Employee employee = employeeRepo.findById(request.getEmployeeId())
                .orElseThrow(() -> new RuntimeException("Employee not found"));

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

        userRepo.findByEmployeeId(employee.getId()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "New One-on-One Meeting",
                        manager.getFirstName() + " " + manager.getLastName()
                                + " scheduled a one-on-one meeting with you at "
                                + formatDateTime(saved.getScheduledDate())
                                + buildNotesPreview(saved.getNotes()),
                        "MEETING"
                )
        );

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

        if (request.getScheduledDate().isBefore(LocalDateTime.now())) {
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

        OneOnOneMeeting saved = meetingRepo.save(meeting);

        userRepo.findByEmployeeId(saved.getEmployee().getId()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Updated",
                        "Your one-on-one meeting was updated to "
                                + formatDateTime(saved.getScheduledDate())
                                + buildNotesPreview(saved.getNotes()),
                        "MEETING"
                )
        );

        return toDto(saved);
    }

    @Override
    @Transactional
    public void deleteMeeting(Integer id) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        String meetingTime = formatDateTime(meeting.getScheduledDate());

        userRepo.findByEmployeeId(meeting.getEmployee().getId()).ifPresent(employeeUser ->
                notificationService.send(
                        employeeUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "Your one-on-one meeting at " + meetingTime + " was cancelled.",
                        "MEETING"
                )
        );

        userRepo.findByEmployeeId(meeting.getManager().getId()).ifPresent(managerUser ->
                notificationService.send(
                        managerUser.getId(),
                        "One-on-One Meeting Cancelled",
                        "The one-on-one meeting with "
                                + meeting.getEmployee().getFirstName() + " "
                                + meeting.getEmployee().getLastName()
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

        OneOnOneMeeting followUpMeeting = new OneOnOneMeeting();
        followUpMeeting.setEmployee(parentMeeting.getEmployee());
        followUpMeeting.setManager(parentMeeting.getManager());
        followUpMeeting.setScheduledDate(request.getFollowUpDate());
        followUpMeeting.setNotes(parentMeeting.getNotes());
        followUpMeeting.setFollowUpNotes(null);
        followUpMeeting.setStatus(false);
        followUpMeeting.setIsFinalized(null);
        followUpMeeting.setCreatedAt(LocalDateTime.now());
        followUpMeeting.setUpdatedAt(null);
        followUpMeeting.setParentMeetingId(parentMeeting.getId());
        followUpMeeting.setReminder24hSent(false);

        meetingRepo.save(parentMeeting);
        OneOnOneMeeting savedFollowUp = meetingRepo.save(followUpMeeting);

        return toDto(savedFollowUp);
    }

    @Override
    @Transactional
    public void autoActivateDueMeetings() {
        List<OneOnOneMeeting> due = meetingRepo.findMeetingsToActivate(LocalDateTime.now());

        for (OneOnOneMeeting meeting : due) {
            meeting.setStatus(true);
            meeting.setUpdatedAt(LocalDateTime.now());
        }

        meetingRepo.saveAll(due);
    }

    private User getCurrentUser() {
        Integer currentUserId = SecurityUtils.currentUserId();

        User user = userRepo.findById(currentUserId)
                .orElseThrow(() -> new RuntimeException("Current user not found"));

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
            OneOnOneActionItemResponseDto ai = new OneOnOneActionItemResponseDto();
            ai.setId(m.getActionItem().getId());
            ai.setMeetingId(m.getId());
            ai.setDescription(m.getActionItem().getDescription());
            ai.setUpdatedAt(m.getActionItem().getUpdatedAt());
            dto.setActionItem(ai);
        }

        return dto;
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