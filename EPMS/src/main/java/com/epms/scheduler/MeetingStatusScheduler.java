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

    @Scheduled(fixedDelay = 60000)
    public void activateDueMeetings() {
        log.debug("Checking meetings...");
        meetingService.autoActivateDueMeetings();
    }
}