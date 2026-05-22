package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class FeedbackCampaignSummaryResponse {
    Long campaignId;
    String campaignName;
    String status;
    /** Normalized 0-100 average across target feedback summaries. */
    Double overallAverageScore;
    String overallScoreCategory;
    Long totalEmployees;
    Long totalResponses;
    Long assignedEvaluatorCount;
    Long submittedEvaluatorCount;
    Long pendingEvaluatorCount;
    Double completionRate;
    Long insufficientFeedbackCount;
    String visibilityStatus;
    LocalDateTime publishedAt;
    Long publishedByUserId;
    String publishNote;
    LocalDateTime summarizedAt;
    List<FeedbackScoreDistributionResponse> scoreDistribution;
    List<FeedbackRelationshipAverageResponse> relationshipAverages;
    List<FeedbackCompetencyAverageResponse> competencyAverages;
    List<FeedbackConfidenceBreakdownResponse> confidenceBreakdown;
    List<FeedbackResultItemResponse> items;
}
