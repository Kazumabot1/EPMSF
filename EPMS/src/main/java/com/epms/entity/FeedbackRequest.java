package com.epms.entity;

import com.epms.entity.enums.FeedbackRequestStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "feedback_requests", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"campaign_id", "target_employee_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackRequest {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "form_id")
    private FeedbackForm form;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private FeedbackCampaign campaign;

    @Column(name = "target_employee_id", nullable = false)
    private Long targetEmployeeId;

    @Column(name = "target_user_id")
    private Integer targetUserId;

    @Column(name = "target_employee_code", length = 80)
    private String targetEmployeeCode;

    @Column(name = "target_employee_name", length = 255)
    private String targetEmployeeName;

    @Column(name = "target_employee_email", length = 255)
    private String targetEmployeeEmail;

    @Column(name = "target_parent_department_id")
    private Integer targetParentDepartmentId;

    @Column(name = "target_parent_department_name", length = 255)
    private String targetParentDepartmentName;

    @Column(name = "target_current_department_id")
    private Integer targetCurrentDepartmentId;

    @Column(name = "target_current_department_name", length = 255)
    private String targetCurrentDepartmentName;

    @Column(name = "target_position_id")
    private Integer targetPositionId;

    @Column(name = "target_position_name", length = 255)
    private String targetPositionName;

    @Column(name = "target_level_code", length = 80)
    private String targetLevelCode;

    @Column(name = "target_manager_user_id")
    private Integer targetManagerUserId;

    @Column(name = "target_manager_employee_id")
    private Integer targetManagerEmployeeId;

    @Column(name = "target_manager_name", length = 255)
    private String targetManagerName;

    @Column(name = "target_employment_status", length = 80)
    private String targetEmploymentStatus;

    @Lob
    @Column(name = "target_warning_snapshot")
    private String targetWarningSnapshot;

    @Column(name = "selected_at")
    private LocalDateTime selectedAt;

    @Column(name = "selected_by_user_id")
    private Long selectedByUserId;

    @Column(name = "requested_by_user_id", nullable = false)
    private Long requestedByUserId;

    @Column(name = "due_at")
    private LocalDateTime dueAt;

    @Column(name = "is_anonymous_enabled", nullable = false)
    private Boolean isAnonymousEnabled;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FeedbackRequestStatus status;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "feedbackRequest", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FeedbackEvaluatorAssignment> assignments = new ArrayList<>();

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
