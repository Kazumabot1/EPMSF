package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionPermissionDto {
    private Integer positionId;
    private String positionTitle;

    private Boolean oneOnOneCreate;
    private Boolean oneOnOneDeptSelection;
    private Boolean oneOnOneTeamSelection;

    private Boolean teamCreate;
    private Boolean teamEdit;
    private Boolean teamHistory;
    private Boolean teamView;
    private Boolean teamAssignAsLeader;
    private Boolean teamAssignAsPm;
    private Boolean teamAssignAsMember;

    private Boolean pipCreate;
    private Boolean pipEdit;
    private Boolean pipViewAll;

    private Boolean appraisalReview;
    private Boolean appraisalApprove;
    private Boolean appraisalView;
    private Boolean appraisalScoreInput;
    private Boolean appraisalSign;

    private Boolean kpiCreate;
    private Boolean kpiEdit;
    private Boolean kpiScore;
    private Boolean kpiView;
    private Boolean kpiInput;

    private Boolean selfAssessmentView;
    private Boolean selfAssessmentInput;
    private Boolean selfAssessmentLock;
    private Boolean selfAssessmentSign;

    private Boolean feedbackFormCreate;
    private Boolean feedbackSend;
    private Boolean continuousFeedbackView;
    private Boolean continuousFeedbackGive;

    private Boolean departmentCrud;
    private Boolean departmentComparisonView;
    private Boolean positionCrud;
    private Boolean employeeCrud;
    private Boolean employeeExcelImport;
}