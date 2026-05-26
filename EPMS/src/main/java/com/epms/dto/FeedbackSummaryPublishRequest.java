package com.epms.dto;

import lombok.Data;

import java.util.List;

@Data
public class FeedbackSummaryPublishRequest {
    /** ALL_READY or SELECTED_EMPLOYEES. Defaults to ALL_READY for backward compatibility. */
    private String scope;
    private List<Long> targetEmployeeIds;
    private Boolean includeOverallScore;
    private Boolean includeCompetencyBreakdown;
    private Boolean includeSelfVsOthers;
    private Boolean includeComments;
    private Boolean includeScoreExplanation;
    private Boolean notifyEmployees;
}
