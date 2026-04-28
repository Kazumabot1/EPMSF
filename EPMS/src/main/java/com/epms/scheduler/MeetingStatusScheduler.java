package com.epms.scheduler;

import com.epms.service.OneOnOneMeetingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class MeetingStatusScheduler {

    private final OneOnOneMeetingService meetingService;

    /**
     * Runs every 60 seconds.
     * Finds all meetings whose scheduledDate has passed but whose status is still false,
     * and flips them to status=true (ongoing).
     */
    @Scheduled(fixedDelay = 60_000)
    public void activateDueMeetings() {
        log.debug("MeetingStatusScheduler: checking for meetings to activate...");
        meetingService.autoActivateDueMeetings();
    }
}
