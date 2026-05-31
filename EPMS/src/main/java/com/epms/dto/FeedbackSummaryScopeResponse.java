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
public class FeedbackSummaryScopeResponse {

    /**
     * Role-aware scope metadata for published 360 summaries.
     *
     * Manager and Department Head pages can share the same endpoint while still
     * rendering different responsibilities. The frontend should prefer this
     * object over legacy top-level aliases when both are present.
     */
    private String viewerRole;
    private String scopeType;
    private String title;
    private String description;
    private String ownerName;

    private Integer departmentId;
    private String departmentName;

    private Integer employeeCount;
    private Integer directReportCount;
    private Integer managedTeamCount;
    private Integer departmentTeamCount;

    @Builder.Default
    private List<String> teamNames = new ArrayList<>();

    private String privacyNotice;
    private String emptyStateMessage;
}
