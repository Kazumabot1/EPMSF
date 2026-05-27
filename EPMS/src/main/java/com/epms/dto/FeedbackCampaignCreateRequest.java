package com.epms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
public class FeedbackCampaignCreateRequest {

    @NotBlank(message = "Campaign name is required.")
    private String name;

    /**
     * Kept for backward compatibility. The redesigned campaign setup uses one 360 feedback flow,
     * so callers may omit this and the service will store the default value.
     */
    private String campaignType;

    @Min(value = 2000, message = "Review year is invalid.")
    @Max(value = 2100, message = "Review year is invalid.")
    private Integer reviewYear;

    /**
     * Preferred precise submission window used by the HR dashboard.
     * startDate/endDate are kept as a backwards-compatible fallback for older screens.
     */
    private LocalDateTime startAt;

    private LocalDateTime endAt;

    private LocalDate startDate;

    private LocalDate endDate;

    /**
     * Legacy static form link. Optional for the new dynamic campaign wizard; activation/question review
     * will create campaign-specific snapshots in a later patch.
     */
    @Deprecated
    private Long formId;

    private String description;

    private String instructions;

    private Boolean managerFeedbackAnonymous = false;

    private Boolean peerFeedbackAnonymous = true;

    private Boolean subordinateFeedbackAnonymous = true;

    private Boolean selfFeedbackAnonymous = false;

    private Boolean redistributeMissingRelationshipWeight = true;

    private Boolean autoSubmitCompletedDraftsOnClose = false;
}
