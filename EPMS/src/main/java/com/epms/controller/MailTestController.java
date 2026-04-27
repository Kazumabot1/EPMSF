package com.epms.controller;

import com.epms.dto.EmailSendResult;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.mail.MailTestResult;
import com.epms.dto.mail.TestMailRequest;
import com.epms.service.OnboardingEmailService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Manual SMTP test (authenticated). Use after configuring .env and restarting the server.
 */
@RestController
@RequestMapping("/api/mail")
@RequiredArgsConstructor
public class MailTestController {

    private final OnboardingEmailService onboardingEmailService;

    @PostMapping("/test")
    public ResponseEntity<GenericApiResponse<MailTestResult>> sendTest(@Valid @RequestBody TestMailRequest request) {
        EmailSendResult r = onboardingEmailService.sendTestEmail(request.getTo().trim().toLowerCase());
        MailTestResult out = MailTestResult.builder()
                .emailSent(r.isSent())
                .smtpErrorDetail(r.getSafeErrorDetail())
                .message(
                        r.isSent()
                                ? "Test email was accepted for delivery. If it does not arrive, check Spam/Junk and Gmail filters."
                                : (r.getSafeErrorDetail() != null
                                ? r.getSafeErrorDetail()
                                : "Test email could not be sent."))
                .build();
        return ResponseEntity.ok(GenericApiResponse.success("Mail test", out));
    }
}
