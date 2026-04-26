package com.epms.config;

import com.epms.util.SmtpErrorSanitizer;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.core.annotation.Order;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.stereotype.Component;
import org.springframework.util.StringUtils;

/**
 * {@link org.springframework.mail.javamail.JavaMailSenderImpl#testConnection()} is the
 * JavaMail equivalent of a transporter "verify" — it authenticates to SMTP without sending mail.
 */
@Component
@Order(2)
@RequiredArgsConstructor
@Slf4j
public class SmtpConnectionVerifier implements ApplicationRunner {

    private final JavaMailSender mailSender;

    @Override
    public void run(ApplicationArguments args) {
        if (!(mailSender instanceof JavaMailSenderImpl impl)) {
            log.info("SMTP: JavaMailSender is not JavaMailSenderImpl; skipping testConnection().");
            return;
        }
        if (!StringUtils.hasText(impl.getHost())) {
            log.warn("SMTP: host is empty; fix .env (SMTP_HOST) and restart. testConnection() skipped.");
            return;
        }
        try {
            impl.testConnection();
            log.info("SMTP: testConnection() succeeded (host={}).", impl.getHost());
        } catch (Exception ex) {
            String safe = SmtpErrorSanitizer.summarize(ex);
            log.warn("SMTP: testConnection() failed — email delivery will not work until fixed. host={} | {}",
                    impl.getHost(), safe);
        }
    }
}
