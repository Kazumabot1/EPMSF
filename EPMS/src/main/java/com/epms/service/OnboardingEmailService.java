/*
package com.epms.service;

import com.epms.dto.EmailSendResult;
import com.epms.util.SmtpErrorSanitizer;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
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
            "^[A-Za-z0-9+._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );

    private final JavaMailSender mailSender;

    @Value("${app.onboarding.login-url:http://localhost:5173/login}")
    private String loginUrl;

    @Value("${app.mail.from:}")
    private String fromAddressRaw;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    public EmailSendResult sendTestEmail(String toEmail) {
        String body = """
                This is a test message from EPMS.

                If you received this email, SMTP is configured correctly.
                """;

        return sendMimeEmail(
                toEmail,
                "EPMS test email",
                body,
                false
        );
    }

    public EmailSendResult sendTemporaryPasswordEmail(
            String toEmail,
            String employeeName,
            String temporaryPassword
    ) {
        if (!StringUtils.hasText(temporaryPassword)) {
            return EmailSendResult.builder()
                    .sent(false)
                    .safeErrorDetail("Temporary password is empty.")
                    .build();
        }

        String name = StringUtils.hasText(employeeName)
                ? employeeName.trim()
                : "Employee";

        String body = """
                Hello %s,

                Your password is %s.

                Please log in and change your password immediately.

                Login here: %s

                Thank you.
                """.formatted(name, temporaryPassword, loginUrl);

        return sendMimeEmail(
                toEmail,
                "Your temporary password",
                body,
                true
        );
    }

    private EmailSendResult sendMimeEmail(
            String toEmail,
            String subject,
            String text,
            boolean bodyContainsPassword
    ) {
        if (!isValidRecipient(toEmail)) {
            return failed("Invalid or empty recipient email address.");
        }

        if (!StringUtils.hasText(smtpHost)) {
            return failed("SMTP host is missing. Set spring.mail.host=smtp.gmail.com.");
        }

        if (!StringUtils.hasText(smtpUsername)) {
            return failed("SMTP username is missing. Set spring.mail.username.");
        }

        if (!StringUtils.hasText(smtpPassword)) {
            return failed("SMTP password is missing. For Gmail, use a Google App Password.");
        }

        String to = toEmail.trim().toLowerCase();

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    mimeMessage,
                    false,
                    "UTF-8"
            );

            helper.setFrom(resolveFromAddress());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, false);

            mailSender.send(mimeMessage);

            if (bodyContainsPassword) {
                log.info("Temporary password email accepted by SMTP for recipient {}.", to);
            } else {
                log.info("Email accepted by SMTP for recipient {} subject='{}'.", to, subject);
            }

            return EmailSendResult.builder()
                    .sent(true)
                    .build();

        } catch (MailException ex) {
            String safe = SmtpErrorSanitizer.summarize(ex);
            log.warn("SMTP send failed to {}: {}", to, safe);
            return failed(safe);

        } catch (Exception ex) {
            String safe = SmtpErrorSanitizer.summarize(ex);
            log.warn("Email send failed to {}: {}", to, safe);
            return failed(safe);
        }
    }

    private InternetAddress resolveFromAddress() throws Exception {
        String rawFrom = stripOuterQuotes(fromAddressRaw);

        if (!StringUtils.hasText(rawFrom)) {
            return new InternetAddress(smtpUsername, "EPMS HR");
        }

        try {
            InternetAddress[] parsed = InternetAddress.parse(rawFrom, false);

            if (parsed.length == 0) {
                return new InternetAddress(smtpUsername, "EPMS HR");
            }

            InternetAddress parsedFrom = parsed[0];
            String fromMailbox = parsedFrom.getAddress();

            if (isGmailSmtp()
                    && StringUtils.hasText(fromMailbox)
                    && !fromMailbox.equalsIgnoreCase(smtpUsername)) {

                log.warn(
                        "Gmail requires From email to match SMTP username. Using {} instead of {}.",
                        smtpUsername,
                        fromMailbox
                );

                return new InternetAddress(smtpUsername, "EPMS HR");
            }

            return parsedFrom;

        } catch (Exception ex) {
            log.warn("Invalid app.mail.from='{}'. Using SMTP username.", rawFrom);
            return new InternetAddress(smtpUsername, "EPMS HR");
        }
    }

    private EmailSendResult failed(String message) {
        return EmailSendResult.builder()
                .sent(false)
                .safeErrorDetail(message)
                .build();
    }

    private boolean isValidRecipient(String email) {
        if (!StringUtils.hasText(email)) {
            return false;
        }

        String trimmed = email.trim();

        return trimmed.length() <= 254 && EMAIL.matcher(trimmed).matches();
    }

    private boolean isGmailSmtp() {
        return StringUtils.hasText(smtpHost)
                && smtpHost.toLowerCase().contains("gmail.com");
    }

    private String stripOuterQuotes(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();

        if (trimmed.length() >= 2
                && trimmed.startsWith("\"")
                && trimmed.endsWith("\"")) {
            return trimmed.substring(1, trimmed.length() - 1).trim();
        }

        return trimmed;
    }
}*/







package com.epms.service;

import com.epms.dto.EmailSendResult;
import com.epms.util.SmtpErrorSanitizer;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
/*
@Slf4j
*/
public class OnboardingEmailService {

    private static final Logger log = LoggerFactory.getLogger(OnboardingEmailService.class);


    private static final Pattern EMAIL = Pattern.compile(
            "^[A-Za-z0-9+._%+-]+@[A-Za-z0-9.-]+\\.[A-Za-z]{2,}$"
    );

    private final JavaMailSender mailSender;

    @Value("${app.onboarding.login-url:http://localhost:5173/login}")
    private String loginUrl;

    @Value("${app.mail.from:}")
    private String fromAddressRaw;

    @Value("${spring.mail.host:}")
    private String smtpHost;

    @Value("${spring.mail.username:}")
    private String smtpUsername;

    @Value("${spring.mail.password:}")
    private String smtpPassword;

    public EmailSendResult sendTestEmail(String toEmail) {
        String body = """
                This is a test message from EPMS.

                If you received this email, SMTP is configured correctly.
                """;

        return sendMimeEmail(
                toEmail,
                "EPMS test email",
                body,
                false
        );
    }

    public EmailSendResult sendTemporaryPasswordEmail(
            String toEmail,
            String employeeName,
            String temporaryPassword
    ) {
        if (!StringUtils.hasText(temporaryPassword)) {
            return EmailSendResult.builder()
                    .sent(false)
                    .safeErrorDetail("Temporary password is empty.")
                    .build();
        }

        String name = StringUtils.hasText(employeeName)
                ? employeeName.trim()
                : "Employee";

        String body = """
                Hello %s,

                Your password is %s.

                Please log in and change your password immediately.

                Login here: %s

                Thank you.
                """.formatted(name, temporaryPassword, loginUrl);

        return sendMimeEmail(
                toEmail,
                "Your temporary password",
                body,
                true
        );
    }

    public EmailSendResult sendForgotPasswordOtpEmail(
            String toEmail,
            String employeeName,
            String otp,
            int expiresInMinutes
    ) {
        if (!StringUtils.hasText(otp)) {
            return EmailSendResult.builder()
                    .sent(false)
                    .safeErrorDetail("OTP is empty.")
                    .build();
        }

        String name = StringUtils.hasText(employeeName)
                ? employeeName.trim()
                : "Employee";

        String body = """
                Hello %s,

                Your EPMS password reset OTP is %s.

                This code expires in %d minutes. If you did not request this reset, please ignore this email.

                Login here: %s

                Thank you.
                """.formatted(name, otp, expiresInMinutes, loginUrl);

        return sendMimeEmail(
                toEmail,
                "Your EPMS password reset OTP",
                body,
                false
        );
    }

    public EmailSendResult sendNotificationTemplateEmail(
            String toEmail,
            String subject,
            String body
    ) {
        return sendMimeEmail(
                toEmail,
                StringUtils.hasText(subject) ? subject.trim() : "EPMS Notification",
                StringUtils.hasText(body) ? body.trim() : "",
                false
        );
    }

    private EmailSendResult sendMimeEmail(
            String toEmail,
            String subject,
            String text,
            boolean bodyContainsPassword
    ) {
        if (!isValidRecipient(toEmail)) {
            return failed("Invalid or empty recipient email address.");
        }

        if (!StringUtils.hasText(smtpHost)) {
            return failed("SMTP host is missing. Set spring.mail.host=smtp.gmail.com.");
        }

        if (!StringUtils.hasText(smtpUsername)) {
            return failed("SMTP username is missing. Set spring.mail.username.");
        }

        if (!StringUtils.hasText(smtpPassword)) {
            return failed("SMTP password is missing. For Gmail, use a Google App Password.");
        }

        String to = toEmail.trim().toLowerCase();

        try {
            MimeMessage mimeMessage = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(
                    mimeMessage,
                    false,
                    "UTF-8"
            );

            helper.setFrom(resolveFromAddress());
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(text, false);

            mailSender.send(mimeMessage);

            if (bodyContainsPassword) {
                log.info("Temporary password email accepted by SMTP for recipient {}.", to);
            } else {
                log.info("Email accepted by SMTP for recipient {} subject='{}'.", to, subject);
            }

            return EmailSendResult.builder()
                    .sent(true)
                    .build();

        } catch (MailException ex) {
            String safe = SmtpErrorSanitizer.summarize(ex);
            log.warn("SMTP send failed to {}: {}", to, safe);
            return failed(safe);

        } catch (Exception ex) {
            String safe = SmtpErrorSanitizer.summarize(ex);
            log.warn("Email send failed to {}: {}", to, safe);
            return failed(safe);
        }
    }

    private InternetAddress resolveFromAddress() throws Exception {
        String rawFrom = stripOuterQuotes(fromAddressRaw);

        if (!StringUtils.hasText(rawFrom)) {
            return new InternetAddress(smtpUsername, "EPMS HR");
        }

        try {
            InternetAddress[] parsed = InternetAddress.parse(rawFrom, false);

            if (parsed.length == 0) {
                return new InternetAddress(smtpUsername, "EPMS HR");
            }

            InternetAddress parsedFrom = parsed[0];
            String fromMailbox = parsedFrom.getAddress();

            if (isGmailSmtp()
                    && StringUtils.hasText(fromMailbox)
                    && !fromMailbox.equalsIgnoreCase(smtpUsername)) {

                log.warn(
                        "Gmail requires From email to match SMTP username. Using {} instead of {}.",
                        smtpUsername,
                        fromMailbox
                );

                return new InternetAddress(smtpUsername, "EPMS HR");
            }

            return parsedFrom;

        } catch (Exception ex) {
            log.warn("Invalid app.mail.from='{}'. Using SMTP username.", rawFrom);
            return new InternetAddress(smtpUsername, "EPMS HR");
        }
    }

    private EmailSendResult failed(String message) {
        return EmailSendResult.builder()
                .sent(false)
                .safeErrorDetail(message)
                .build();
    }

    private boolean isValidRecipient(String email) {
        if (!StringUtils.hasText(email)) {
            return false;
        }

        String trimmed = email.trim();

        return trimmed.length() <= 254 && EMAIL.matcher(trimmed).matches();
    }

    private boolean isGmailSmtp() {
        return StringUtils.hasText(smtpHost)
                && smtpHost.toLowerCase().contains("gmail.com");
    }

    private String stripOuterQuotes(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();

        if (trimmed.length() >= 2
                && trimmed.startsWith("\"")
                && trimmed.endsWith("\"")) {
            return trimmed.substring(1, trimmed.length() - 1).trim();
        }

        return trimmed;
    }
}
