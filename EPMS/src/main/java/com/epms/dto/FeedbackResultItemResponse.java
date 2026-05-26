package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class FeedbackResultItemResponse {
    Long campaignId;
    String campaignName;
    Long targetEmployeeId;
    String targetEmployeeName;
    /** Official normalized 0-100 feedback-only score. */
    Double averageScore;
    Double rawAverageScore;
    String scoreCategory;
    Long totalResponses;
    Long managerResponses;
    Long peerResponses;
    Long subordinateResponses;
    Long selfResponses;
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
    String scoreCalculationMethod;
    String scoreCalculationNote;
    String visibilityStatus;
    LocalDateTime publishedAt;
    Long publishedByUserId;
    String publishNote;
    LocalDateTime summarizedAt;
}
