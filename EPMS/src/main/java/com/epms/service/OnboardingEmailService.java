package com.epms.service;

import com.epms.dto.EmailSendResult;
import com.epms.util.SmtpErrorSanitizer;
import jakarta.annotation.PostConstruct;
import jakarta.mail.internet.InternetAddress;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
@Slf4j
public class OnboardingEmailService {

    private static final Pattern EMAIL = Pattern.compile(
            "^[A-Za-z0-9+._-]+@[A-Za-z0-9._-]+\\.[A-Za-z]{2,}$"
    );

    private final JavaMailSender mailSender;
    private final Environment environment;

    @Value("${app.onboarding.login-url:http://localhost:5173/login}")
    private String loginUrl;

    @Value("${app.mail.from:no-reply@epms.local}")
    private String fromAddressRaw;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    @PostConstruct
    public void logEffectiveMailConfig() {
        // Confirms what Spring actually resolved (including values loaded from .env into system properties at startup)
        String host = environment.getProperty("spring.mail.host", "");
        String user = environment.getProperty("spring.mail.username", "");
        String from = environment.getProperty("app.mail.from", "");
        log.info("Mail config (resolved): host='{}' userSet={} from='{}' — if host is empty, set SMTP_HOST in .env and restart.",
                StringUtils.hasText(host) ? host : "(empty)",
                StringUtils.hasText(user),
                from);
    }

    /**
     * Test mail — no temporary password, safe to use for connectivity checks.
     */
    public EmailSendResult sendTestEmail(String toEmail) {
        return sendMimeEmail(
                toEmail,
                "EPMS test email",
                "This is a test message from EPMS.\n\nIf you received this, SMTP is configured correctly.\n",
                false
        );
    }

    /**
     * Plain text password is only used in the outgoing message body, never stored or logged.
     * {@code to} must be the employee/user mailbox.
     */
    public EmailSendResult sendTemporaryPasswordEmail(String toEmail, String employeeName, String temporaryPassword) {
        if (!isValidRecipient(toEmail)) {
            return EmailSendResult.builder()
                    .sent(false)
                    .safeErrorDetail("Invalid or empty recipient email address.")
                    .build();
        }
        String to = toEmail.trim();
        String name = (employeeName == null || employeeName.isBlank()) ? "Employee" : employeeName;
        String body = "Hello " + name + ",\n\n"
                + "Your password is " + temporaryPassword + ".\n\n"
                + "Please log in and change your password immediately.\n\n"
                + "Login here: " + loginUrl + "\n\n"
                + "Thank you.\n";
        return sendMimeEmail(to, "Your temporary password", body, true);
    }

    private EmailSendResult sendMimeEmail(String to, String subject, String text, boolean bodyContainsPassword) {
        if (!isValidRecipient(to)) {
            return EmailSendResult.builder()
                    .sent(false)
                    .safeErrorDetail("Invalid recipient address.")
                    .build();
        }
        if (!StringUtils.hasText(smtpHost)) {
            String detail = "SMTP is not configured: set SMTP_HOST (e.g. smtp.gmail.com) in .env and restart the backend.";
            log.warn("Email not sent: {}", detail);
            return EmailSendResult.builder().sent(false).safeErrorDetail(detail).build();
        }
        if (!StringUtils.hasText(smtpUsername) || !StringUtils.hasText(smtpPassword)) {
            String detail = "SMTP auth missing: set SMTP_USER and SMTP_PASS (Gmail: 16-char app password).";
            log.warn("Email not sent: {}", detail);
            return EmailSendResult.builder().sent(false).safeErrorDetail(detail).build();
        }

        final String toAddress = to.trim();
        try {
            InternetAddress from = resolveFromInternetAddress();
            var mime = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(mime, "UTF-8");
            helper.setFrom(from);
            helper.setTo(toAddress);
            helper.setSubject(subject);
            helper.setText(text, false);
            mailSender.send(mime);
            if (bodyContainsPassword) {
                log.info("Temporary-password email accepted by SMTP for recipient {} (message body is not logged).", toAddress);
            } else {
                log.info("Email sent to {} subject='{}'.", toAddress, subject);
            }
            return EmailSendResult.builder().sent(true).build();
        } catch (MailException ex) {
            String safe = SmtpErrorSanitizer.summarize(ex);
            log.warn("SMTP send failed to {}: {} | {}", toAddress, ex.getClass().getName(), safe);
            return EmailSendResult.builder().sent(false).safeErrorDetail(safe).build();
        } catch (Exception ex) {
            String safe = SmtpErrorSanitizer.summarize(ex);
            log.warn("Email send failed to {}: {} | {}", toAddress, ex.getClass().getName(), safe);
            return EmailSendResult.builder().sent(false).safeErrorDetail(safe).build();
        }
    }

    private InternetAddress resolveFromInternetAddress() throws Exception {
        String raw = stripOuterQuotes(fromAddressRaw);
        if (!StringUtils.hasText(raw)) {
            return new InternetAddress(smtpUsername);
        }
        try {
            InternetAddress[] parsed = InternetAddress.parse(raw, false);
            if (parsed.length == 0) {
                return new InternetAddress(smtpUsername);
            }
            InternetAddress addr = parsed[0];
            String box = addr.getAddress();
            if (isGmailHost() && StringUtils.hasText(smtpUsername) && StringUtils.hasText(box)
                    && !box.trim().equalsIgnoreCase(smtpUsername.trim())) {
                log.warn("Gmail: From mailbox ({}) != SMTP user ({}). Using SMTP user. Set SMTP_FROM to \"Name <{}>\".",
                        box, smtpUsername, smtpUsername);
                return new InternetAddress(smtpUsername);
            }
            return addr;
        } catch (Exception e) {
            log.warn("Could not parse app.mail.from '{}', using SMTP user: {}", raw, e.getMessage());
            return new InternetAddress(smtpUsername);
        }
    }

    private String stripOuterQuotes(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        if (t.length() >= 2 && t.startsWith("\"") && t.endsWith("\"")) {
            return t.substring(1, t.length() - 1).trim();
        }
        return t;
    }

    private boolean isGmailHost() {
        if (smtpHost == null) {
            return false;
        }
        return smtpHost.toLowerCase().contains("gmail.com");
    }

    private boolean isValidRecipient(String toEmail) {
        if (toEmail == null) {
            return false;
        }
        String t = toEmail.trim();
        return t.length() <= 254 && EMAIL.matcher(t).matches();
    }
}
