package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignActivationReadinessResponse {
    private Long campaignId;
    private String campaignName;
    private String campaignStatus;
    private Boolean ready;
    private Boolean canMarkReady;
    private Boolean canActivate;
    private FeedbackCampaignActivationSummary summary;
    private List<FeedbackCampaignActivationCheck> checks;
    private List<String> blockingIssues;
    private List<String> warnings;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedbackCampaignActivationSummary {
        private Integer targetCount;
        private Integer assignmentCount;
        private Integer questionSelectionCount;
        private Integer assignmentQuestionSnapshotCount;
        private Integer pendingAssignmentCount;
        private Integer inProgressAssignmentCount;
        private Integer submittedAssignmentCount;
        private Double completionPercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedbackCampaignActivationCheck {
        private String key;
        private String label;
        private String status;
        private String message;
    }
}
