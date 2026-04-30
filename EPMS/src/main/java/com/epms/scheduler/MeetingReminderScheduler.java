package com.epms.scheduler;

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
import java.util.List;

@Component
@RequiredArgsConstructor
public class MeetingReminderScheduler {

    private final OneOnOneMeetingRepository meetingRepo;
    private final NotificationService notificationService;
    private final UserRepository userRepo;

    @Scheduled(fixedRate = 60000)
    @Transactional
    public void sendReminders() {
        LocalDateTime now = LocalDateTime.now();
        LocalDateTime limit = now.plusHours(24);

        List<OneOnOneMeeting> meetings =
                meetingRepo.findMeetingsForReminder(now, limit);

        for (OneOnOneMeeting m : meetings) {
            User empUser = userRepo.findByEmployeeId(m.getEmployee().getId())
                    .orElseThrow(() -> new RuntimeException("Employee user not found"));

            User mgrUser = userRepo.findByEmployeeId(m.getManager().getId())
                    .orElseThrow(() -> new RuntimeException("Manager user not found"));

            String msg = "One-on-one meeting will start at " + m.getScheduledDate();

            notificationService.send(empUser.getId(), "Meeting Reminder", msg, "MEETING");
            notificationService.send(mgrUser.getId(), "Meeting Reminder", msg, "MEETING");

            m.setReminder24hSent(true);
        }

        meetingRepo.saveAll(meetings);
    }
}