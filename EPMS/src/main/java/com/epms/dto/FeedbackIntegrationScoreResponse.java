package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

/**
 * Stable integration DTO for other EPMS modules.
 * It exposes the 360 feedback score only; it does not decide overall appraisal,
 * promotion eligibility, or salary increment.
 */
@Value
@Builder
public class FeedbackIntegrationScoreResponse {
    Long campaignId;
    String campaignName;
    String campaignStatus;
    Long targetEmployeeId;
    String targetEmployeeName;
    Double feedbackScore;
    Double rawFeedbackScore;
    String scoreBand;
    Long assignedEvaluatorCount;
    Long submittedEvaluatorCount;
    Long pendingEvaluatorCount;
    Double completionRate;
    String confidenceLevel;
    Boolean insufficientFeedback;
    Double managerAverageScore;
    Double peerAverageScore;
    Double subordinateAverageScore;
    Double selfAverageScore;
    Long managerResponses;
    Long peerResponses;
    Long subordinateResponses;
    Long selfResponses;
    String scoreCalculationMethod;
    String scoreCalculationNote;
    String visibilityStatus;
    LocalDateTime publishedAt;
    Long publishedByUserId;
    String publishNote;
    LocalDateTime summarizedAt;
}
