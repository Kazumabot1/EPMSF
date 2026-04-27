package com.epms.dto.mail;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MailTestResult {
    private boolean emailSent;
    private String message;
    private String smtpErrorDetail;
}
