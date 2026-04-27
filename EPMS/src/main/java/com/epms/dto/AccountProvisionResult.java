package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AccountProvisionResult {
    private Integer userId;
    private boolean success;
    private boolean accountCreated;
    private boolean accountLinked;
    private boolean temporaryPasswordEmailSent;
    private String message;
    /**
     * Sanitized SMTP / transport error for UI (no secrets). Null if not applicable or send succeeded.
     */
    private String smtpErrorDetail;
}
