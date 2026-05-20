package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Carries all permission flags for a position.
 * Role decides the dashboard. Position permissions decide which actions are enabled.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionPermissionDto {

    private Boolean oneOnOneCreate = false;
    private Boolean oneOnOneDeptSelection = false;
    private Boolean oneOnOneTeamSelection = false;

    private Boolean teamCreate = false;
    private Boolean teamEdit = false;
    private Boolean teamHistory = false;
    private Boolean teamView = false;
    private Boolean teamAssignAsLeader = false;
    private Boolean teamAssignAsPm = false;
    private Boolean teamAssignAsMember = false;

    private Boolean pipCreate = false;
    private Boolean pipEdit = false;
    private Boolean pipViewAll = false;

    private Boolean appraisalReview = false;
    private Boolean appraisalApprove = false;
    private Boolean appraisalView = false;
    private Boolean appraisalScoreInput = false;
    private Boolean appraisalSign = false;

    private Boolean kpiCreate = false;
    private Boolean kpiEdit = false;
    private Boolean kpiScore = false;
    private Boolean kpiView = false;
    private Boolean kpiInput = false;

    private Boolean selfAssessmentView = false;
    private Boolean selfAssessmentInput = false;
    private Boolean selfAssessmentLock = false;
    private Boolean selfAssessmentSign = false;

    private Boolean feedbackFormCreate = false;
    private Boolean feedbackSend = false;
    private Boolean continuousFeedbackView = false;
    private Boolean continuousFeedbackGive = false;

    private Boolean departmentCrud = false;
    private Boolean departmentComparisonView = false;
    private Boolean positionCrud = false;
    private Boolean employeeCrud = false;
    private Boolean employeeExcelImport = false;

    public static boolean safe(Boolean value) {
        return Boolean.TRUE.equals(value);
    }
}
