package com.epms.scheduler;

import com.epms.entity.Employee;
import com.epms.entity.OneOnOneMeeting;
import com.epms.entity.User;
import com.epms.repository.OneOnOneMeetingRepository;
import com.epms.notification.NotificationEventKey;
import com.epms.repository.UserRepository;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Optional;

@Component
@RequiredArgsConstructor
public class MeetingReminderScheduler {

    private static final DateTimeFormatter FORMATTER =
            DateTimeFormatter.ofPattern("MMM dd, yyyy, hh:mm a");

    private final OneOnOneMeetingRepository meetingRepo;
    private final NotificationService notificationService;
    private final UserRepository userRepo;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sendReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime limit = now.plusHours(24);

        List<OneOnOneMeeting> firstMeetings = meetingRepo.findFirstMeetingsForReminder(now, limit);

        for (OneOnOneMeeting meeting : firstMeetings) {
            sendReminder(meeting, false);
            meeting.setReminder24hSent(true);
        }

        meetingRepo.saveAll(firstMeetings);

        List<OneOnOneMeeting> followUpMeetings = meetingRepo.findFollowUpMeetingsForReminder(now, limit);

        for (OneOnOneMeeting meeting : followUpMeetings) {
            sendReminder(meeting, true);
            meeting.setFollowUpReminder24hSent(true);
        }

        meetingRepo.saveAll(followUpMeetings);
    }

    private void sendReminder(OneOnOneMeeting meeting, boolean followUpStage) {
        LocalDateTime startDate = followUpStage ? meeting.getFollowUpDate() : meeting.getScheduledDate();
        String time = startDate == null ? "the scheduled time" : startDate.format(FORMATTER);
        String location = followUpStage ? meeting.getFollowUpLocation() : meeting.getLocation();
        String label = followUpStage ? "follow-up meeting" : "meeting";

        findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                notificationService.sendEvent(
                        employeeUser.getId(),
                        NotificationEventKey.MEETING_REMINDER,
                        "Meeting Reminder",
                        "Reminder: your one-on-one "
                                + label
                                + " with "
                                + employeeName(meeting.getManager())
                                + " will start at "
                                + time
                                + locationPreview(location)
                                + ".",
                        "MEETING"
                )
        );

        findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                notificationService.sendEvent(
                        managerUser.getId(),
                        NotificationEventKey.MEETING_REMINDER,
                        "Meeting Reminder",
                        "Reminder: your one-on-one "
                                + label
                                + " with "
                                + employeeName(meeting.getEmployee())
                                + " will start at "
                                + time
                                + locationPreview(location)
                                + ".",
                        "MEETING"
                )
        );
    }

    private Optional<User> findUserByEmployee(Employee employee) {
        if (employee == null || employee.getId() == null) {
            return Optional.empty();
        }

        return userRepo.findActiveByEmployeeId(employee.getId())
                .or(() -> userRepo.findByEmployeeId(employee.getId()));
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

    private String locationPreview(String location) {
        if (location == null || location.trim().isEmpty()) {
            return "";
        }

        return " at " + location.trim();
    }
}