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
    private List<FeedbackSubmissionStatusResponse> pendingFeedbackToSubmit;
    private List<FeedbackReceivedItemResponse> ownFeedbackResults;
    private List<TeamFeedbackSummaryResponse> teamFeedbackSummary;
    private List<CampaignDashboardItemResponse> campaigns;
}
