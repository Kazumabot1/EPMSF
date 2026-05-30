package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignCloseRequest {
    /**
     * STANDARD or WITH_WARNINGS. The backend derives the final close mode from readiness;
     * this value is kept for an explicit HR intent and audit-friendly request payloads.
     */
    private String closeMode;

    /**
     * Required when the readiness result is CLOSE_WITH_WARNINGS.
     */
    private Boolean acknowledgedWarnings;

    /**
     * Optional HR note. Stored in the close audit reason; it does not expose scores/comments.
     */
    private String reason;
}
