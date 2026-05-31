package com.epms.entity;

import com.epms.entity.enums.AssessmentStatus;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Lob;
import jakarta.persistence.OneToMany;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "employee_assessments")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAssessment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Integer userId;

    @Column(name = "employee_id")
    private Integer employeeId;

    @Column(name = "employee_name", nullable = false)
    private String employeeName;

    @Column(name = "employee_code")
    private String employeeCode;

    @Column(name = "current_position")
    private String currentPosition;

    @Column(name = "department_id")
    private Integer departmentId;

    @Column(name = "department_name")
    private String departmentName;

    @Column(name = "manager_user_id")
    private Integer managerUserId;

    @Column(name = "manager_name")
    private String managerName;

    @Column(name = "department_head_user_id")
    private Integer departmentHeadUserId;

    @Column(name = "department_head_name")
    private String departmentHeadName;

    @Column(name = "assessment_form_id")
    private Integer assessmentFormId;

    @Column(name = "form_name")
    private String formName;

    @Column(name = "company_name")
    private String companyName;

    @Column(name = "assessment_date")
    private LocalDate assessmentDate;

    @Column(name = "period_label", nullable = false)
    private String period;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AssessmentStatus status;

    @Column(name = "total_score")
    private Double totalScore;

    @Column(name = "max_score")
    private Double maxScore;

    @Column(name = "score_percent")
    private Double scorePercent;

    @Column(name = "performance_label")
    private String performanceLabel;

    @Column(name = "remarks", columnDefinition = "TEXT")
    private String remarks;

    @Column(name = "manager_comment", columnDefinition = "TEXT")
    private String managerComment;

    @Column(name = "hr_comment", columnDefinition = "TEXT")
    private String hrComment;

    @Column(name = "department_head_comment", columnDefinition = "TEXT")
    private String departmentHeadComment;

    @Column(name = "decline_reason", columnDefinition = "TEXT")
    private String declineReason;

    @Column(name = "rejected_by_role", length = 40)
    private String rejectedByRole;

    @Column(name = "rejected_by_user_id")
    private Integer rejectedByUserId;

    @Column(name = "rejected_by_name")
    private String rejectedByName;

    @Column(name = "rejected_at")
    private LocalDateTime rejectedAt;

    @Column(name = "employee_signature_id")
    private Long employeeSignatureId;

    @Column(name = "employee_signature_name")
    private String employeeSignatureName;

    @Lob
    @Column(name = "employee_signature_image_data", columnDefinition = "LONGTEXT")
    private String employeeSignatureImageData;

    @Column(name = "employee_signature_image_type", length = 50)
    private String employeeSignatureImageType;

    @Column(name = "employee_signed_at")
    private LocalDateTime employeeSignedAt;

    @Column(name = "manager_signature_id")
    private Long managerSignatureId;

    @Column(name = "manager_signature_name")
    private String managerSignatureName;

    @Lob
    @Column(name = "manager_signature_image_data", columnDefinition = "LONGTEXT")
    private String managerSignatureImageData;

    @Column(name = "manager_signature_image_type", length = 50)
    private String managerSignatureImageType;

    @Column(name = "manager_signed_at")
    private LocalDateTime managerSignedAt;

    @Column(name = "department_head_signature_id")
    private Long departmentHeadSignatureId;

    @Column(name = "department_head_signature_name")
    private String departmentHeadSignatureName;

    @Lob
    @Column(name = "department_head_signature_image_data", columnDefinition = "LONGTEXT")
    private String departmentHeadSignatureImageData;

    @Column(name = "department_head_signature_image_type", length = 50)
    private String departmentHeadSignatureImageType;

    @Column(name = "department_head_signed_at")
    private LocalDateTime departmentHeadSignedAt;

    @Column(name = "hr_signature_id")
    private Long hrSignatureId;

    @Column(name = "hr_signature_name")
    private String hrSignatureName;

    @Lob
    @Column(name = "hr_signature_image_data", columnDefinition = "LONGTEXT")
    private String hrSignatureImageData;

    @Column(name = "hr_signature_image_type", length = 50)
    private String hrSignatureImageType;

    @Column(name = "hr_signed_at")
    private LocalDateTime hrSignedAt;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;

    @Column(name = "declined_at")
    private LocalDateTime declinedAt;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder.Default
    @OneToMany(
            mappedBy = "assessment",
            cascade = CascadeType.ALL,
            orphanRemoval = true,
            fetch = FetchType.LAZY
    )
    private List<EmployeeAssessmentAnswer> answers = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        LocalDateTime now = LocalDateTime.now();

        if (createdAt == null) {
            createdAt = now;
        }

        updatedAt = now;

        if (status == null) {
            status = AssessmentStatus.DRAFT;
        }

        if (period == null || period.isBlank()) {
            period = String.valueOf(now.getYear());
        }

        if (assessmentDate == null) {
            assessmentDate = LocalDate.now();
        }

        if (totalScore == null) {
            totalScore = 0.0;
        }

        if (maxScore == null) {
            maxScore = 0.0;
        }

        if (scorePercent == null) {
            scorePercent = 0.0;
        }

        if (performanceLabel == null || performanceLabel.isBlank()) {
            performanceLabel = "Not scored";
        }
    }

    @PreUpdate
    public void preUpdate() {
        updatedAt = LocalDateTime.now();

        if (assessmentDate == null) {
            assessmentDate = LocalDate.now();
        }
    }

    public void addAnswer(EmployeeAssessmentAnswer answer) {
        answers.add(answer);
        answer.setAssessment(this);
    }
}