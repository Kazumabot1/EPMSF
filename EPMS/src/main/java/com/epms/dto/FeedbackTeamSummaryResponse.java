package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackTeamSummaryResponse {

    /**
     * Production-quality role/scope object for Manager and Department Head 360 summaries.
     * New frontend code should prefer this object. Legacy aliases below are retained so
     * Patch D and existing screens continue to compile while we redesign one role at a time.
     */
    private FeedbackSummaryScopeResponse scope;

    /**
     * Role-aware scope aliases.
     */
    private String viewerRole;
    private String scopeType;
    private String scopeTitle;
    private String scopeDescription;
    private String scopeOwnerName;

    /**
     * Compatibility aliases.
     *
     * Some existing service code uses departmentName(...), while newer UI code reads
     * scopeDepartmentName. Keep both so builder calls compile and old/new frontends
     * receive stable values.
     */
    private Integer departmentId;
    private String departmentName;
    private String scopeDepartmentName;

    private Integer scopeEmployeeCount;

    @Builder.Default
    private List<String> scopeTeamNames = new ArrayList<>();

    private Integer publishedResultCount;
    private Integer visibleOverallScoreCount;
    private Double visibleAverageScore;
    private Integer privacyProtectedCount;
    private Integer coachingPriorityCount;

    /**
     * Backward-compatible Patch D fields.
     * Do not remove while Manager and Department Head pages still share the endpoint.
     */
    private Long managerUserId;
    private Long ownerUserId;
    private String viewScope;
    private Integer totalDirectReports;
    private Integer totalManagedEmployees;
    private Integer totalDepartmentEmployees;
    private Integer totalManagedTeams;
    private Integer totalDepartmentTeams;
    private Integer totalClosedResults;
    private String accessTitle;
    private String accessDescription;
    private String privacyNotice;
    private String emptyStateMessage;

    @Builder.Default
    private List<FeedbackResultItemResponse> items = new ArrayList<>();

    /**
     * Alias for newer frontend code. It can point to the same data as items.
     */
    @Builder.Default
    private List<FeedbackResultItemResponse> results = new ArrayList<>();
}
