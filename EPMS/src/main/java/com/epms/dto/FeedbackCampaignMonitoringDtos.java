package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public final class FeedbackCampaignMonitoringDtos {

    private FeedbackCampaignMonitoringDtos() {
    }

    public enum MonitoringHealthStatus {
        READY,
        ON_TRACK,
        NEEDS_ATTENTION,
        AT_RISK,
        BLOCKED
    }

    public enum AlertSeverity {
        INFO,
        WARNING,
        CRITICAL
    }

    public enum AlertType {
        NO_TARGETS,
        NO_ASSIGNMENTS,
        MISSING_REQUIRED_MANAGER,
        MISSING_REQUIRED_SELF,
        PEER_PRIVACY_THRESHOLD_NOT_MET,
        SUBORDINATE_PRIVACY_THRESHOLD_NOT_MET,
        TARGET_AT_RISK,
        TARGET_BLOCKED,
        OVERDUE_ASSIGNMENTS,
        HEAVY_EVALUATOR_LOAD,
        CAMPAIGN_BEHIND_SCHEDULE,
        READY_TO_CLOSE,
        NOT_READY_TO_CLOSE
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedbackCampaignMonitoringResponse {
        private Long campaignId;
        private String campaignName;
        private String campaignStatus;
        private Integer reviewYear;
        private LocalDate startDate;
        private LocalTime startTime;
        private LocalDate endDate;
        private LocalTime endTime;
        private Integer daysRemaining;
        private Integer totalCampaignDays;
        private Double expectedProgressPercent;
        private Double progressGapPercent;
        private String campaignHealthStatus;
        private Boolean readyToClose;
        private Boolean closeWithWarnings;
        private MonitoringOverviewDto overview;
        private CloseReadinessDto closeReadiness;

        @Builder.Default
        private List<RelationshipProgressDto> relationships = new ArrayList<>();

        @Builder.Default
        private List<TargetHealthDto> targets = new ArrayList<>();

        @Builder.Default
        private List<EvaluatorWorkloadDto> evaluators = new ArrayList<>();

        @Builder.Default
        private List<MonitoringAlertDto> alerts = new ArrayList<>();

        @Builder.Default
        private List<MonitoringActivityItemDto> activity = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonitoringOverviewDto {
        private Integer totalTargets;
        private Integer totalAssignments;
        private Integer notStartedCount;
        private Integer inProgressCount;
        private Integer submittedCount;
        private Integer cancelledCount;
        private Integer declinedCount;
        private Integer overdueCount;
        private Integer pendingCount;
        private Double completionPercent;
        private Integer readyTargetCount;
        private Integer onTrackTargetCount;
        private Integer needsAttentionTargetCount;
        private Integer atRiskTargetCount;
        private Integer blockedTargetCount;
        private Integer readyToCloseTargetCount;
        private Double requiredCoveragePercent;
        private Integer privacyRiskTargetCount;
    }



    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CloseReadinessDto {
        private String status;
        private String statusLabel;
        private Boolean canClose;
        private Boolean canCloseWithWarnings;
        private Boolean requiresAcknowledgement;
        private Integer hardBlockerCount;
        private Integer warningCount;
        private Integer passCount;
        private Integer totalTargets;
        private Integer readyTargets;
        private Integer pendingAssignments;
        private Integer overdueAssignments;
        private Integer privacyRiskTargets;
        private String summary;
        private String primaryActionLabel;

        @Builder.Default
        private List<CloseReadinessChecklistItemDto> checklist = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CloseReadinessChecklistItemDto {
        private String key;
        private String category;
        private String status;
        private String title;
        private String message;
        private Integer affectedCount;
        private Boolean blocking;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RelationshipProgressDto {
        private String relationshipType;
        private String label;
        private Integer assignedCount;
        private Integer submittedCount;
        private Integer notStartedCount;
        private Integer inProgressCount;
        private Integer cancelledCount;
        private Integer declinedCount;
        private Integer overdueCount;
        private Integer pendingCount;
        private Double completionPercent;
        private Boolean protectedRelationship;
        private Integer minimumProtectedResponses;
        private Integer targetsWithRelationship;
        private Integer targetsPassingPrivacy;
        private Integer targetsFailingPrivacy;
        private String warning;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TargetHealthDto {
        private Long feedbackRequestId;
        private Long targetEmployeeId;
        private Long targetUserId;
        private String targetEmployeeCode;
        private String targetEmployeeName;
        private String targetEmployeeEmail;
        private Long departmentId;
        private String departmentName;
        private Long positionId;
        private String positionName;
        private Long managerEmployeeId;
        private String managerName;
        private String requestStatus;
        private LocalDateTime dueAt;
        private Integer assignedCount;
        private Integer submittedCount;
        private Integer pendingCount;
        private Integer overdueCount;
        private Double completionPercent;
        private Integer requiredRelationshipCount;
        private Integer completedRequiredRelationshipCount;
        private Double requiredCoveragePercent;
        private Boolean privacyCoveragePassed;
        private String healthStatus;
        private Boolean readyToClose;
        private String recommendedAction;
        private LocalDateTime lastActivityAt;

        @Builder.Default
        private List<TargetRelationshipStatusDto> relationshipStatuses = new ArrayList<>();

        @Builder.Default
        private List<String> blockingReasons = new ArrayList<>();

        @Builder.Default
        private List<String> warnings = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TargetRelationshipStatusDto {
        private String relationshipType;
        private String label;
        private Integer assignedCount;
        private Integer submittedCount;
        private Integer pendingCount;
        private Integer overdueCount;
        private Boolean required;
        private Boolean protectedRelationship;
        private Integer minimumResponses;
        private Boolean completed;
        private Boolean privacyPassed;
        private String status;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EvaluatorWorkloadDto {
        private Long evaluatorEmployeeId;
        private Long evaluatorUserId;
        private String evaluatorEmployeeCode;
        private String evaluatorEmployeeName;
        private String evaluatorEmployeeEmail;
        private Long evaluatorDepartmentId;
        private Long evaluatorPositionId;
        private String evaluatorPositionName;
        private Integer assignedCount;
        private Integer submittedCount;
        private Integer pendingCount;
        private Integer overdueCount;
        private Double completionPercent;
        private String workloadStatus;
        private LocalDateTime lastActivityAt;

        @Builder.Default
        private Map<String, Integer> relationshipCounts = Map.of();

        @Builder.Default
        private List<String> targetNames = new ArrayList<>();
    }


    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonitoringActivityItemDto {
        private Long id;
        private String activityType;
        private String title;
        private String message;
        private String severity;
        private String actorName;
        private String actorRole;
        private Integer actorUserId;
        private String metadata;
        private LocalDateTime occurredAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class MonitoringAlertDto {
        private AlertType alertType;
        private AlertSeverity severity;
        private String title;
        private String message;
        private Integer affectedCount;
        private String actionType;
        private String filterKey;
    }
}
