package com.epms.dto;

import com.epms.entity.enums.EmployeeChangeRequestStatus;
import com.epms.entity.enums.EmployeeChangeRequestType;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public class EmployeeChangeRequestDtos {

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PositionChangeCreateRequest {
        private Integer employeeId;
        private Integer newPositionId;
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentChangeCreateRequest {
        private Integer employeeId;
        private Integer newCurrentDepartmentId;
        private Integer newParentDepartmentId;
        private String reason;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewRequest {
        private String reason;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class SummaryResponse {
        private Long id;
        private EmployeeChangeRequestType requestType;
        private EmployeeChangeRequestStatus status;

        private Integer employeeId;
        private String employeeName;
        private String employeeEmail;

        private String requestedByName;
        private String reviewedByName;

        private LocalDateTime requestedAt;
        private LocalDateTime reviewedAt;

        private String oldPositionName;
        private String newPositionName;

        private String oldCurrentDepartmentName;
        private String newCurrentDepartmentName;

        private String oldParentDepartmentName;
        private String newParentDepartmentName;

        private String oldWorkingDepartmentName;
        private String newWorkingDepartmentName;

        private String oldTeamName;

        private String requestReason;
        private String ceoReviewReason;

        private String validationSummary;
        private String blockingSummary;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DetailResponse {
        private SummaryResponse request;
        private List<AuditResponse> audits;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AuditResponse {
        private Long id;
        private String action;
        private EmployeeChangeRequestStatus oldStatus;
        private EmployeeChangeRequestStatus newStatus;
        private String performedByName;
        private LocalDateTime performedAt;
        private String reason;
        private String details;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeChangeProfileResponse {
        private EmployeeSnapshot employee;

        private KpiSnapshot currentOrLatestKpi;
        private List<KpiSnapshot> allKpis;

        private PipSnapshot currentOrLatestPip;
        private List<PipSnapshot> allPips;

        private FeedbackSnapshot latestContinuousFeedback;
        private List<FeedbackSnapshot> allContinuousFeedback;

        private TeamHistorySnapshot activeTeam;
        private List<TeamHistorySnapshot> teamHistory;

        private DepartmentHistorySnapshot currentDepartmentAssignment;
        private List<DepartmentHistorySnapshot> departmentHistory;

        private List<EmployeeAuditSnapshot> auditHistory;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeSnapshot {
        private Integer employeeId;
        private String employeeName;
        private String employeeEmail;

        private Integer userId;
        private String userEmail;

        private Integer positionId;
        private String positionName;
        private String positionLevel;
        private String roleName;

        private Integer currentDepartmentId;
        private String currentDepartmentName;

        private Integer parentDepartmentId;
        private String parentDepartmentName;

        private Integer workingDepartmentId;
        private String workingDepartmentName;

        private String activeTeamName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiSnapshot {
        private Number id;
        private String title;
        private String status;
        private String cycleName;
        private String periodName;
        private String assignedAt;
        private String finalizedAt;
        private Double totalScore;
        private Double totalWeightedScore;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PipSnapshot {
        private Number id;
        private String goal;
        private String expectedOutcomes;
        private String comments;
        private Boolean active;
        private String startDate;
        private String endDate;
        private String createdAt;
        private String finishedAt;
        private Integer phaseCount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedbackSnapshot {
        private Number id;
        private String category;
        private Integer rating;
        private String feedbackText;
        private String giverName;
        private String teamName;
        private String createdAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TeamHistorySnapshot {
        private Number teamId;
        private String teamName;
        private String roleInTeam;
        private String departmentName;
        private String status;
        private String startedDate;
        private String endedDate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentHistorySnapshot {
        private Number id;
        private Integer currentDepartmentId;
        private String currentDepartmentName;
        private Integer parentDepartmentId;
        private String parentDepartmentName;
        private Integer workingDepartmentId;
        private String workingDepartmentName;
        private String startDate;
        private String endDate;
        private String assignedBy;
        private Boolean active;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeAuditSnapshot {
        private Number id;
        private String fieldName;
        private String oldValue;
        private String newValue;
        private String editedByName;
        private String editedAt;
        private String reason;
    }
}