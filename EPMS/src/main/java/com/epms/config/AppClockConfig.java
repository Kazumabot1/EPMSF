package com.epms.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneId;

@Configuration
public class AppClockConfig {

    @Bean
    public Clock appClock(
            @Value("${app.clock.zone:Asia/Rangoon}") String zone,
            @Value("${app.clock.fixed-instant:}") String fixedInstant
    ) {
        ZoneId zoneId = ZoneId.of(zone);
        if (fixedInstant != null && !fixedInstant.isBlank()) {
            return Clock.fixed(Instant.parse(fixedInstant.trim()), zoneId);
        }
        return Clock.system(zoneId);
    }
}
