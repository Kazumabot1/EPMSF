package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class ReportingDtos {

    private ReportingDtos() {
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportingDashboardResponse {
        private ReportingAccessResponse access;
        private ReportingSummaryResponse summary;

        @Builder.Default
        private List<DepartmentPerformanceRow> departmentPerformance = new ArrayList<>();

        @Builder.Default
        private List<EmployeePerformanceRow> employeePerformance = new ArrayList<>();

        @Builder.Default
        private List<StatusBreakdownRow> assessmentStatusBreakdown = new ArrayList<>();

        @Builder.Default
        private List<PipReportRow> pipStatusReport = new ArrayList<>();

        @Builder.Default
        private List<FeedbackParticipationRow> feedbackParticipation = new ArrayList<>();

        @Builder.Default
        private List<RecommendationRow> promotionRecommendations = new ArrayList<>();

        @Builder.Default
        private List<KpiPerformanceRow> kpiPerformance = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportingAccessResponse {
        private Integer userId;
        private String role;
        private Integer departmentId;
        private String scopeLabel;
        private Boolean canViewAllDepartments;
        private Boolean canExport;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReportingSummaryResponse {
        private Long totalEmployees;
        private Long activeEmployees;
        private Long totalAssessments;
        private Long submittedAssessments;
        private Long approvedAssessments;
        private Long pendingAssessments;
        private Long activePips;
        private Long completedPips;
        private Long feedbackCampaigns;
        private Long activeFeedbackCampaigns;
        private Double averageAssessmentScore;
        private Long totalKpiRecords;
        private Long finalizedKpiRecords;
        private Double averageKpiScore;
        private Long highKpiPerformers;
        private Long lowKpiPerformers;
        private Double overallPerformanceScore;
        private Double feedbackCompletionRate;
        private Long highPerformers;
        private Long lowPerformers;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentPerformanceRow {
        private Integer departmentId;
        private String departmentName;
        private Long employeeCount;
        private Long assessmentCount;
        private Long approvedCount;
        private Long pendingCount;
        private Long activePipCount;
        private Long kpiRecordCount;
        private Double averageScore;
        private Double averageKpiScore;
        private Double overallScore;
        private String performanceLabel;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeePerformanceRow {
        private Integer assessmentId;
        private Integer employeeId;
        private Integer userId;
        private String employeeName;
        private String employeeCode;
        private Integer departmentId;
        private String departmentName;
        private String position;
        private String managerName;
        private String formName;
        private String period;
        private String status;
        private Double totalScore;
        private Double maxScore;
        private Double scorePercent;
        private String performanceLabel;
        private LocalDate assessmentDate;
        private LocalDateTime submittedAt;
        private LocalDateTime approvedAt;
    }


    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiPerformanceRow {
        private Integer employeeKpiFormId;
        private Integer employeeId;
        private String employeeName;
        private String employeeCode;
        private Integer departmentId;
        private String departmentName;
        private String position;
        private String kpiTitle;
        private String status;
        private Double totalScore;
        private Double totalWeightedScore;
        private String performanceLabel;
        private LocalDate periodStartDate;
        private LocalDate periodEndDate;
        private LocalDateTime finalizedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class StatusBreakdownRow {
        private String status;
        private Long count;
        private Double percentage;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PipReportRow {
        private Integer pipId;
        private Integer employeeUserId;
        private String employeeName;
        private String employeeCode;
        private Integer departmentId;
        private String departmentName;
        private String goal;
        private Boolean active;
        private LocalDate startDate;
        private LocalDate endDate;
        private LocalDateTime createdAt;
        private LocalDateTime finishedAt;
        private String createdByName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class FeedbackParticipationRow {
        private Long campaignId;
        private String campaignName;
        private String status;
        private LocalDate startDate;
        private LocalDate endDate;
        private Long assignedCount;
        private Long submittedCount;
        private Long pendingCount;
        private Double completionRate;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class RecommendationRow {
        private Integer employeeId;
        private Integer userId;
        private String employeeName;
        private String employeeCode;
        private String departmentName;
        private String recommendationType;
        private Double scorePercent;
        private String performanceLabel;
        private String reason;
    }
}