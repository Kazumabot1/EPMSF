package com.epms.scheduler;

import com.epms.service.AppraisalCycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class AppraisalCycleAutoLockScheduler {

    private final AppraisalCycleService appraisalCycleService;

    @Scheduled(cron = "0 0 0 * * *")
    @Scheduled(fixedDelay = 3600000, initialDelay = 60000)
    public void autoLockExpiredActiveCycles() {
        appraisalCycleService.autoLockExpiredActiveCycles();
    }

    @Scheduled(cron = "0 15 8 * * *")
    @Scheduled(fixedDelay = 3600000, initialDelay = 120000)
    public void sendUpcomingDeadlineNotifications() {
        appraisalCycleService.sendUpcomingDeadlineNotifications();
    }
}
