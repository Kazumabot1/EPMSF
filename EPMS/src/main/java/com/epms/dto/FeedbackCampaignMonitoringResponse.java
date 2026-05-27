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
public class FeedbackCampaignMonitoringResponse {
    private Long campaignId;
    private String campaignName;
    private String campaignStatus;
    private Integer targetCount;
    private Integer assignmentCount;
    private Integer notStartedCount;
    private Integer inProgressCount;
    private Integer submittedCount;
    private Integer cancelledCount;
    private Double completionPercent;
    @Builder.Default
    private List<RoleProgress> byRole = List.of();
    @Builder.Default
    private List<TargetProgress> targets = List.of();
    @Builder.Default
    private List<String> warnings = List.of();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RoleProgress {
        private String role;
        private Integer total;
        private Integer notStarted;
        private Integer inProgress;
        private Integer submitted;
        private Integer cancelled;
        private Double completionPercent;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TargetProgress {
        private Long requestId;
        private Long targetEmployeeId;
        private String targetEmployeeName;
        private String currentDepartmentName;
        private Integer assignmentCount;
        private Integer notStartedCount;
        private Integer inProgressCount;
        private Integer submittedCount;
        private Integer cancelledCount;
        private Double completionPercent;
        private String status;
    }
}
