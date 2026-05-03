package com.epms.scheduler;

import com.epms.entity.Employee;
import com.epms.entity.OneOnOneMeeting;
import com.epms.entity.User;
import com.epms.repository.OneOnOneMeetingRepository;
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

/**
 * Why this file is updated:
 * - Sends 24-hour meeting reminders to both the selected employee and creator/manager.
 * - Does not throw and stop the whole scheduler if one old meeting has missing user data.
 */
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

        List<OneOnOneMeeting> meetings = meetingRepo.findMeetingsForReminder(now, limit);

        for (OneOnOneMeeting meeting : meetings) {
            String time = meeting.getScheduledDate() == null
                    ? "the scheduled time"
                    : meeting.getScheduledDate().format(FORMATTER);

            findUserByEmployee(meeting.getEmployee()).ifPresent(employeeUser ->
                    notificationService.send(
                            employeeUser.getId(),
                            "Meeting Reminder",
                            "Reminder: your one-on-one meeting with "
                                    + employeeName(meeting.getManager())
                                    + " will start at " + time + ".",
                            "MEETING"
                    )
            );

            findUserByEmployee(meeting.getManager()).ifPresent(managerUser ->
                    notificationService.send(
                            managerUser.getId(),
                            "Meeting Reminder",
                            "Reminder: your one-on-one meeting with "
                                    + employeeName(meeting.getEmployee())
                                    + " will start at " + time + ".",
                            "MEETING"
                    )
            );

            meeting.setReminder24hSent(true);
        }

        meetingRepo.saveAll(meetings);
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
}