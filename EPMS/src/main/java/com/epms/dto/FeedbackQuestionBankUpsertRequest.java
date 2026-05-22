package com.epms.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class FeedbackQuestionBankUpsertRequest {

    /** Optional on create. Backend generates a stable code when omitted. */
    private String questionCode;

    @NotBlank(message = "Competency code is required")
    private String competencyCode;

    @NotBlank(message = "Question text is required")
    private String questionText;

    private String responseType = "RATING_WITH_COMMENT";

    /** Fixed to SCORED for performance 360 feedback. */
    private String scoringBehavior;

    private Integer ratingScaleId;

    /** Ignored by the backend. Question-level weight is fixed to 1; competency weights drive scoring. */
    @DecimalMin(value = "0.01", message = "Weight must be greater than zero")
    private Double weight = 1.0;

    private Boolean required = true;

    private String helpText;


    private String status = "DRAFT";
}
