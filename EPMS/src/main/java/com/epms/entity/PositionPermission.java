package com.epms.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "position_permissions")
@Getter
@Setter
public class PositionPermission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "position_id", nullable = false, unique = true)
    private Integer positionId;


    @Column(name = "team_permission", nullable = false)
    private Boolean teamPermission = false;

    @Column(name = "organization_permission", nullable = false)
    private Boolean organizationPermission = false;

    @Column(name = "assessment_permission", nullable = false)
    private Boolean assessmentPermission = false;

    @Column(name = "assessment_scores_view", nullable = false)
    private Boolean assessmentScoresView = false;

    @Column(name = "assessment_form_create", nullable = false)
    private Boolean assessmentFormCreate = false;

    @Column(name = "appraisal_permission", nullable = false)
    private Boolean appraisalPermission = false;

    @Column(name = "feedback360_permission", nullable = false)
    private Boolean feedback360Permission = false;

    @Column(name = "one_on_one_permission", nullable = false)
    private Boolean oneOnOnePermission = false;

    @Column(name = "position_permission", nullable = false)
    private Boolean positionPermission = false;

    @Column(name = "kpi_permission", nullable = false)
    private Boolean kpiPermission = false;

    @Column(name = "department_kpi_permission", nullable = false)
    private Boolean departmentKpiPermission = false;

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

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @PrePersist
    void onCreate() {
        LocalDateTime now = LocalDateTime.now();
        createdAt = now;
        updatedAt = now;
        normalizeNullBooleans();
    }

    @PreUpdate
    void onUpdate() {
        updatedAt = LocalDateTime.now();
        normalizeNullBooleans();
    }

    public void normalizeNullBooleans() {
        teamPermission = bool(teamPermission);
        organizationPermission = bool(organizationPermission);
        assessmentPermission = bool(assessmentPermission);
        assessmentScoresView = bool(assessmentScoresView);
        assessmentFormCreate = bool(assessmentFormCreate);
        appraisalPermission = bool(appraisalPermission);
        feedback360Permission = bool(feedback360Permission);
        oneOnOnePermission = bool(oneOnOnePermission);
        positionPermission = bool(positionPermission);
        kpiPermission = bool(kpiPermission);
        departmentKpiPermission = bool(departmentKpiPermission);

        oneOnOneCreate = bool(oneOnOneCreate);
        oneOnOneDeptSelection = bool(oneOnOneDeptSelection);
        oneOnOneTeamSelection = bool(oneOnOneTeamSelection);

        teamCreate = bool(teamCreate);
        teamEdit = bool(teamEdit);
        teamHistory = bool(teamHistory);
        teamView = bool(teamView);
        teamAssignAsLeader = bool(teamAssignAsLeader);
        teamAssignAsPm = bool(teamAssignAsPm);
        teamAssignAsMember = bool(teamAssignAsMember);

        pipCreate = bool(pipCreate);
        pipEdit = bool(pipEdit);
        pipViewAll = bool(pipViewAll);

        appraisalReview = bool(appraisalReview);
        appraisalApprove = bool(appraisalApprove);
        appraisalView = bool(appraisalView);
        appraisalScoreInput = bool(appraisalScoreInput);
        appraisalSign = bool(appraisalSign);

        kpiCreate = bool(kpiCreate);
        kpiEdit = bool(kpiEdit);
        kpiScore = bool(kpiScore);
        kpiView = bool(kpiView);
        kpiInput = bool(kpiInput);

        selfAssessmentView = bool(selfAssessmentView);
        selfAssessmentInput = bool(selfAssessmentInput);
        selfAssessmentLock = bool(selfAssessmentLock);
        selfAssessmentSign = bool(selfAssessmentSign);

        feedbackFormCreate = bool(feedbackFormCreate);
        feedbackSend = bool(feedbackSend);
        continuousFeedbackView = bool(continuousFeedbackView);
        continuousFeedbackGive = bool(continuousFeedbackGive);

        departmentCrud = bool(departmentCrud);
        departmentComparisonView = bool(departmentComparisonView);
        positionCrud = bool(positionCrud);
        employeeCrud = bool(employeeCrud);
        employeeExcelImport = bool(employeeExcelImport);
    }

    private Boolean bool(Boolean value) {
        return Boolean.TRUE.equals(value);
    }
}