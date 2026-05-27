package com.epms.dto;

import lombok.Data;

import java.util.List;

@Data
public class FeedbackSummaryPublishRequest {
    /** ALL_READY or SELECTED_EMPLOYEES. Defaults to ALL_READY for backward compatibility. */
    private String scope = "ALL_READY";
    private List<Long> targetEmployeeIds = List.of();
    private Boolean includeOverallScore = true;
    private Boolean includeCompetencyBreakdown = true;
    private Boolean includeSelfVsOthers = true;
    private Boolean includeComments = false;
    private Boolean includeScoreExplanation = true;
    private Boolean notifyEmployees = true;
}
