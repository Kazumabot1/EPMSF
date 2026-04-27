package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Outcome of attempting to send a transactional email. Never includes secrets or passwords.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmailSendResult {
    private boolean sent;
    /**
     * Sanitized, short summary safe to show in API/UI (no credentials).
     */
    private String safeErrorDetail;
}
