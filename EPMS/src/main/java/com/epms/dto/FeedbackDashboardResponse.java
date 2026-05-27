package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FeedbackDashboardResponse {
    private String dashboardType;
    private Long userId;
    private Long totalForms;
    private Long totalRequests;
    private Long totalResponses;
    private Long totalPendingAssignments;
    private Double averageScore;
    @Builder.Default
    private List<FeedbackSubmissionStatusResponse> pendingFeedbackToSubmit = List.of();
    @Builder.Default
    private List<FeedbackReceivedItemResponse> ownFeedbackResults = List.of();
    @Builder.Default
    private List<TeamFeedbackSummaryResponse> teamFeedbackSummary = List.of();
    @Builder.Default
    private List<CampaignDashboardItemResponse> campaigns = List.of();
}
