package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class FeedbackCompletionDashboardResponse {
    private Long campaignId;
    private String campaignName;
    private String campaignStatus;
    private LocalDateTime campaignStartAt;
    private LocalDateTime campaignEndAt;

    private Long totalRequests;
    private Long totalTargets;
    private Long totalAssignments;
    private Long submittedAssignments;
    private Long pendingAssignments;
    /** Legacy alias used by older frontend code. Kept equal to pendingAssignments. */
    private Long pendingUsers;
    private Long inProgressAssignments;
    private Long notStartedAssignments;
    private Long overdueAssignments;
    private Long declinedAssignments;
    private Long cancelledAssignments;

    private Long completedTargets;
    private Long targetsWithPending;
    private Long targetsWithOverdue;

    private Long managerAssignments;
    private Long peerAssignments;
    private Long subordinateAssignments;
    private Long selfAssignments;

    private FeedbackAssignmentStatusBreakdownResponse statusBreakdown;
    private FeedbackTargetStatusBreakdownResponse targetStatusBreakdown;
    private List<FeedbackRelationshipProgressResponse> relationshipProgress;

    private Double completionPercent;
    private String healthStatus;
    private String healthMessage;
    private LocalDateTime generatedAt;

    private List<FeedbackCompletionItemResponse> requests;
}
