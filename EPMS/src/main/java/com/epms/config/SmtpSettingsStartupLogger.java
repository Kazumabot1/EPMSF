package com.epms.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * Logs whether outbound SMTP is configured (never logs passwords). Helps diagnose missing env/.env.
 */
@Component
@Order(1)
@Slf4j
public class SmtpSettingsStartupLogger implements ApplicationRunner {

    @Value("${spring.mail.host:}")
    private String host;

    @Value("${spring.mail.port:0}")
    private int port;

    @Value("${spring.mail.username:}")
    private String username;

    @Value("${spring.mail.password:}")
    private String password;

    @Value("${app.mail.from:}")
    private String from;

    @Value("${app.onboarding.login-url:}")
    private String loginUrl;

    @Override
    public void run(ApplicationArguments args) {
        log.info("SMTP: host='{}' port={} userConfigured={} passwordConfigured={} from='{}' appLoginUrl='{}'",
                StringUtils.hasText(host) ? host : "(not set — temporary-password emails will fail)",
                port,
                StringUtils.hasText(username),
                StringUtils.hasText(password),
                from,
                loginUrl);
    }
}
