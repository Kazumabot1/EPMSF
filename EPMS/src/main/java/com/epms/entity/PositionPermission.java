package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;

/**
 * One-to-one companion table for Position.
 *
 * Keep every permission as a nullable-safe boolean. Existing columns are kept for
 * compatibility; new columns are additive only so Hibernate can create them on a
 * fresh schema without breaking older code paths.
 */
@Entity
@Table(name = "position_permissions")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(onlyExplicitlyIncluded = true)
public class PositionPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @EqualsAndHashCode.Include
    private Integer id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false, unique = true)
    private Position position;

    @Column(name = "one_on_one_create", nullable = false)
    private Boolean oneOnOneCreate = false;

    @Column(name = "one_on_one_dept_selection", nullable = false)
    private Boolean oneOnOneDeptSelection = false;

    @Column(name = "one_on_one_team_selection", nullable = false)
    private Boolean oneOnOneTeamSelection = false;

    @Column(name = "team_create", nullable = false)
    private Boolean teamCreate = false;

    @Column(name = "team_edit", nullable = false)
    private Boolean teamEdit = false;

    @Column(name = "team_history", nullable = false)
    private Boolean teamHistory = false;

    @Column(name = "team_view", nullable = false)
    private Boolean teamView = false;

    @Column(name = "team_assign_as_leader", nullable = false)
    private Boolean teamAssignAsLeader = false;

    @Column(name = "team_assign_as_pm", nullable = false)
    private Boolean teamAssignAsPm = false;

    @Column(name = "team_assign_as_member", nullable = false)
    private Boolean teamAssignAsMember = false;

    @Column(name = "pip_create", nullable = false)
    private Boolean pipCreate = false;

    @Column(name = "pip_edit", nullable = false)
    private Boolean pipEdit = false;

    /** Allows HR-style all PIP record viewing. Does not allow creating or editing PIPs. */
    @Column(name = "pip_view_all", nullable = false)
    private Boolean pipViewAll = false;

    @Column(name = "appraisal_review", nullable = false)
    private Boolean appraisalReview = false;

    @Column(name = "appraisal_approve", nullable = false)
    private Boolean appraisalApprove = false;

    @Column(name = "appraisal_view", nullable = false)
    private Boolean appraisalView = false;

    @Column(name = "appraisal_score_input", nullable = false)
    private Boolean appraisalScoreInput = false;

    @Column(name = "appraisal_sign", nullable = false)
    private Boolean appraisalSign = false;

    @Column(name = "kpi_create", nullable = false)
    private Boolean kpiCreate = false;

    @Column(name = "kpi_edit", nullable = false)
    private Boolean kpiEdit = false;

    @Column(name = "kpi_score", nullable = false)
    private Boolean kpiScore = false;

    @Column(name = "kpi_view", nullable = false)
    private Boolean kpiView = false;

    @Column(name = "kpi_input", nullable = false)
    private Boolean kpiInput = false;

    @Column(name = "self_assessment_view", nullable = false)
    private Boolean selfAssessmentView = false;

    @Column(name = "self_assessment_input", nullable = false)
    private Boolean selfAssessmentInput = false;

    @Column(name = "self_assessment_lock", nullable = false)
    private Boolean selfAssessmentLock = false;

    @Column(name = "self_assessment_sign", nullable = false)
    private Boolean selfAssessmentSign = false;

    @Column(name = "feedback_form_create", nullable = false)
    private Boolean feedbackFormCreate = false;

    @Column(name = "feedback_send", nullable = false)
    private Boolean feedbackSend = false;

    @Column(name = "continuous_feedback_view", nullable = false)
    private Boolean continuousFeedbackView = false;

    @Column(name = "continuous_feedback_give", nullable = false)
    private Boolean continuousFeedbackGive = false;

    @Column(name = "department_crud", nullable = false)
    private Boolean departmentCrud = false;

    @Column(name = "department_comparison_view", nullable = false)
    private Boolean departmentComparisonView = false;

    @Column(name = "position_crud", nullable = false)
    private Boolean positionCrud = false;

    @Column(name = "employee_crud", nullable = false)
    private Boolean employeeCrud = false;

    @Column(name = "employee_excel_import", nullable = false)
    private Boolean employeeExcelImport = false;

    @PrePersist
    @PreUpdate
    public void normalizeNulls() {
        if (oneOnOneCreate == null) oneOnOneCreate = false;
        if (oneOnOneDeptSelection == null) oneOnOneDeptSelection = false;
        if (oneOnOneTeamSelection == null) oneOnOneTeamSelection = false;
        if (teamCreate == null) teamCreate = false;
        if (teamEdit == null) teamEdit = false;
        if (teamHistory == null) teamHistory = false;
        if (teamView == null) teamView = false;
        if (teamAssignAsLeader == null) teamAssignAsLeader = false;
        if (teamAssignAsPm == null) teamAssignAsPm = false;
        if (teamAssignAsMember == null) teamAssignAsMember = false;
        if (pipCreate == null) pipCreate = false;
        if (pipEdit == null) pipEdit = false;
        if (pipViewAll == null) pipViewAll = false;
        if (appraisalReview == null) appraisalReview = false;
        if (appraisalApprove == null) appraisalApprove = false;
        if (appraisalView == null) appraisalView = false;
        if (appraisalScoreInput == null) appraisalScoreInput = false;
        if (appraisalSign == null) appraisalSign = false;
        if (kpiCreate == null) kpiCreate = false;
        if (kpiEdit == null) kpiEdit = false;
        if (kpiScore == null) kpiScore = false;
        if (kpiView == null) kpiView = false;
        if (kpiInput == null) kpiInput = false;
        if (selfAssessmentView == null) selfAssessmentView = false;
        if (selfAssessmentInput == null) selfAssessmentInput = false;
        if (selfAssessmentLock == null) selfAssessmentLock = false;
        if (selfAssessmentSign == null) selfAssessmentSign = false;
        if (feedbackFormCreate == null) feedbackFormCreate = false;
        if (feedbackSend == null) feedbackSend = false;
        if (continuousFeedbackView == null) continuousFeedbackView = false;
        if (continuousFeedbackGive == null) continuousFeedbackGive = false;
        if (departmentCrud == null) departmentCrud = false;
        if (departmentComparisonView == null) departmentComparisonView = false;
        if (positionCrud == null) positionCrud = false;
        if (employeeCrud == null) employeeCrud = false;
        if (employeeExcelImport == null) employeeExcelImport = false;
    }
}
