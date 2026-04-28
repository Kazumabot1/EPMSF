//package com.epms.service.impl;
//
//import com.epms.dto.FollowUpRequestDto;
//import com.epms.dto.OneOnOneActionItemResponseDto;
//import com.epms.dto.OneOnOneMeetingRequestDto;
//import com.epms.dto.OneOnOneMeetingResponseDto;
//import com.epms.entity.Employee;
//import com.epms.entity.OneOnOneMeeting;
//import com.epms.entity.User;
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
//import java.util.List;
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
//    // ---------------------------------------------------------------
//    // CREATE
//    // ---------------------------------------------------------------
////    @Override
////    @Transactional
////    public OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request) {
////        // Resolve the logged-in HR user's employee ID for manager_id
////        Integer currentUserId = SecurityUtils.currentUserId();
////        User currentUser = userRepo.findById(currentUserId)
////                .orElseThrow(() -> new RuntimeException("Current user not found"));
////
////        if (currentUser.getEmployeeId() == null) {
////            throw new RuntimeException("Current logged-in user is not linked to an employee record.");
////        }
////        Employee manager = employeeRepo.findById(currentUser.getEmployeeId())
////                .orElseThrow(() -> new RuntimeException("Manager employee record not found"));
////
////        if (request.getEmployeeId() == null) {
////            throw new RuntimeException("Employee is required to create a meeting.");
////        }
////        Employee employee = employeeRepo.findById(request.getEmployeeId())
////                .orElseThrow(() -> new RuntimeException("Employee not found: " + request.getEmployeeId()));
////
////        OneOnOneMeeting meeting = new OneOnOneMeeting();
////        meeting.setEmployee(employee);
////        meeting.setManager(manager);
////        meeting.setScheduledDate(request.getScheduledDate());
////        meeting.setNotes(request.getNotes());
////        meeting.setStatus(false);
////        meeting.setCreatedAt(LocalDateTime.now());
////        meeting.setParentMeetingId(request.getParentMeetingId());
////
////        return toDto(meetingRepo.save(meeting));
////    }
//    // added by KHN ( ChatGpt)
////    @Override
////    @Transactional
////    public OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request) {
////        Integer currentUserId = SecurityUtils.currentUserId();
////
////        User currentUser = userRepo.findById(currentUserId)
////                .orElseThrow(() -> new RuntimeException("Current user not found"));
////
////        if (currentUser.getEmployeeId() == null) {
////            throw new RuntimeException("Current logged-in user is not linked to an employee record.");
////        }
////
////        if (request.getEmployeeId() == null) {
////            throw new RuntimeException("Employee is required to create a meeting.");
////        }
////
////        Employee manager = employeeRepo.findById(currentUser.getEmployeeId())
////                .orElseThrow(() -> new RuntimeException("Manager employee record not found"));
////
////        Employee employee = employeeRepo.findById(request.getEmployeeId())
////                .orElseThrow(() -> new RuntimeException("Employee not found: " + request.getEmployeeId()));
////
////        OneOnOneMeeting meeting = new OneOnOneMeeting();
////        meeting.setEmployee(employee);
////        meeting.setManager(manager);
////        meeting.setScheduledDate(request.getScheduledDate());
////        meeting.setNotes(request.getNotes());
////        meeting.setStatus(false);
////        meeting.setCreatedAt(LocalDateTime.now());
////        meeting.setParentMeetingId(request.getParentMeetingId());
////
////        return toDto(meetingRepo.save(meeting));
////    }
//
//    // added by KHN ( ChatGpt)
//    @Override
//    @Transactional
//    public OneOnOneMeetingResponseDto createMeeting(OneOnOneMeetingRequestDto request) {
//
//        Integer currentUserId = SecurityUtils.currentUserId();
//        User currentUser = userRepo.findById(currentUserId).orElseThrow();
//
//        Employee manager = employeeRepo.findById(currentUser.getEmployeeId()).orElseThrow();
//        Employee employee = employeeRepo.findById(request.getEmployeeId()).orElseThrow();
//
//        // ⚠ conflict check
//        List<OneOnOneMeeting> existing = meetingRepo.findActiveMeetingsByEmployee(employee.getId());
//
////        for (OneOnOneMeeting m : existing) {
////            if (m.getScheduledDate() != null &&
////                    m.getScheduledDate().toLocalDate().equals(request.getScheduledDate().toLocalDate())) {
////
////                throw new RuntimeException("Employee already has meeting on this day at " + m.getScheduledDate());
////            }
////        }
//        for (OneOnOneMeeting m : existing) {
//            if (m.getScheduledDate() != null &&
//                    m.getScheduledDate().equals(request.getScheduledDate())) {
//
//                throw new RuntimeException("Employee already has meeting at exactly this time: " + m.getScheduledDate());
//            }
//        }
//
//        OneOnOneMeeting meeting = new OneOnOneMeeting();
//        meeting.setEmployee(employee);
//        meeting.setManager(manager);
//        meeting.setScheduledDate(request.getScheduledDate());
//        meeting.setNotes(request.getNotes());
//        meeting.setCreatedAt(LocalDateTime.now());
//
//        OneOnOneMeeting saved = meetingRepo.save(meeting);
//
//        // 🔔 notify employee
//     //   User employeeUser = userRepo.findByEmployeeId(employee.getId());
//        User employeeUser = userRepo.findByEmployeeId(employee.getId())
//                .orElseThrow(() -> new RuntimeException("Employee user account not found"));
//
//        notificationService.send(
//                employeeUser.getId(),
//                "New Meeting",
//                manager.getFirstName() + " scheduled meeting at " + request.getScheduledDate(),
//                "MEETING"
//        );
//
//        return toDto(saved);
//    }
//
//    @Override
//    @Transactional
//    public OneOnOneMeetingResponseDto updateMeeting(Integer id, OneOnOneMeetingRequestDto request) {
//        OneOnOneMeeting m = meetingRepo.findById(id).orElseThrow();
//
//        m.setScheduledDate(request.getScheduledDate());
//        m.setNotes(request.getNotes());
//        m.setUpdatedAt(LocalDateTime.now());
//
//        OneOnOneMeeting saved = meetingRepo.save(m);
//
//       // User employeeUser = userRepo.findByEmployeeId(m.getEmployee().getId());
//        User employeeUser = userRepo.findByEmployeeId(m.getEmployee().getId())
//                .orElseThrow(() -> new RuntimeException("Employee user account not found"));
//        notificationService.send(
//                employeeUser.getId(),
//                "Meeting Updated",
//                "Your meeting has been updated to " + request.getScheduledDate(),
//                "MEETING"
//        );
//
//        return toDto(saved);
//    }
//
//    @Override
//    @Transactional
//    public void deleteMeeting(Integer id) {
//        OneOnOneMeeting m = meetingRepo.findById(id).orElseThrow();
//
////        User employeeUser = userRepo.findByEmployeeId(m.getEmployee().getId());
////        User managerUser = userRepo.findByEmployeeId(m.getManager().getId());
//        User employeeUser = userRepo.findByEmployeeId(m.getEmployee().getId())
//                .orElseThrow(() -> new RuntimeException("Employee user account not found"));
//
//        User managerUser = userRepo.findByEmployeeId(m.getManager().getId())
//                .orElseThrow(() -> new RuntimeException("Manager user account not found"));
//
//        notificationService.send(employeeUser.getId(), "Meeting Cancelled", "Meeting cancelled", "MEETING");
//        notificationService.send(managerUser.getId(), "Meeting Cancelled", "Meeting cancelled", "MEETING");
//
//        meetingRepo.deleteById(id);
//    }
//
//
//    // ---------------------------------------------------------------
//    // READ
//    // ---------------------------------------------------------------
//    @Override
//    public List<OneOnOneMeetingResponseDto> getUpcomingMeetings() {
//        return meetingRepo.findUpcoming(LocalDateTime.now())
//                .stream().map(this::toDto).collect(Collectors.toList());
//    }
//
//    @Override
//    public List<OneOnOneMeetingResponseDto> getOngoingMeetings() {
//        return meetingRepo.findOngoing()
//                .stream().map(this::toDto).collect(Collectors.toList());
//    }
//
//    @Override
//    public List<OneOnOneMeetingResponseDto> getPastMeetings() {
//        return meetingRepo.findPast()
//                .stream().map(this::toDto).collect(Collectors.toList());
//    }
//
//    @Override
//    public OneOnOneMeetingResponseDto getMeetingById(Integer id) {
//        OneOnOneMeeting meeting = meetingRepo.findById(id)
//                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));
//        return toDto(meeting);
//    }
//
//    // ---------------------------------------------------------------
//    // FINISH — auto-stamps isFinalized with server time
//    // ---------------------------------------------------------------
//    @Override
//    @Transactional
//    public OneOnOneMeetingResponseDto finishMeeting(Integer id) {
//        OneOnOneMeeting meeting = meetingRepo.findById(id)
//                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));
//        meeting.setIsFinalized(LocalDateTime.now());
//        return toDto(meetingRepo.save(meeting));
//    }
//
//    // ---------------------------------------------------------------
//    // FOLLOW-UP — sets a follow-up datetime without finalizing
//    // ---------------------------------------------------------------
//    @Override
//    @Transactional
//    public OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request) {
//        OneOnOneMeeting meeting = meetingRepo.findById(id)
//                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));
//        meeting.setFollowUpDate(request.getFollowUpDate());
//        return toDto(meetingRepo.save(meeting));
//    }
//
//    // ---------------------------------------------------------------
//    // SCHEDULER — flip status for meetings whose time has arrived
//    // ---------------------------------------------------------------
//    @Override
//    @Transactional
//    public void autoActivateDueMeetings() {
//        List<OneOnOneMeeting> due = meetingRepo.findMeetingsToActivate(LocalDateTime.now());
//        for (OneOnOneMeeting m : due) {
//            m.setStatus(true);
//        }
//        meetingRepo.saveAll(due);
//    }
//
//    // ---------------------------------------------------------------
//    // MAPPING HELPER
//    // ---------------------------------------------------------------
//    private OneOnOneMeetingResponseDto toDto(OneOnOneMeeting m) {
//        OneOnOneMeetingResponseDto dto = new OneOnOneMeetingResponseDto();
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
//        dto.setStatus(m.getStatus());
//        dto.setFollowUpDate(m.getFollowUpDate());
//        dto.setIsFinalized(m.getIsFinalized());
//        dto.setCreatedAt(m.getCreatedAt());
//        dto.setParentMeetingId(m.getParentMeetingId());
//        dto.setFollowUp(m.getParentMeetingId() != null);
//
//        // Map embedded action item if it exists
//        if (m.getActionItem() != null) {
//            OneOnOneActionItemResponseDto ai = new OneOnOneActionItemResponseDto();
//            ai.setId(m.getActionItem().getId());
//            ai.setMeetingId(m.getId());
//            ai.setDescription(m.getActionItem().getDescription());
//            ai.setUpdatedAt(m.getActionItem().getUpdatedAt());
//            dto.setActionItem(ai);
//        }
//
//        return dto;
//    }
//}

// khn (chatgpt)
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
        meeting.setCreatedAt(LocalDateTime.now());
        meeting.setParentMeetingId(request.getParentMeetingId());

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

        meeting.setScheduledDate(request.getScheduledDate());
        meeting.setNotes(request.getNotes());
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
        return meetingRepo.findUpcoming(LocalDateTime.now())
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getOngoingMeetings() {
        return meetingRepo.findOngoing()
                .stream()
                .map(this::toDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<OneOnOneMeetingResponseDto> getPastMeetings() {
        return meetingRepo.findPast()
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

        meeting.setIsFinalized(LocalDateTime.now());
        meeting.setUpdatedAt(LocalDateTime.now());

        return toDto(meetingRepo.save(meeting));
    }

    @Override
    @Transactional
    public OneOnOneMeetingResponseDto setFollowUp(Integer id, FollowUpRequestDto request) {
        OneOnOneMeeting meeting = meetingRepo.findById(id)
                .orElseThrow(() -> new RuntimeException("Meeting not found: " + id));

        meeting.setFollowUpDate(request.getFollowUpDate());
        meeting.setUpdatedAt(LocalDateTime.now());

        return toDto(meetingRepo.save(meeting));
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