package com.epms.entity;

import com.epms.entity.enums.AppraisalCycleStatus;
import com.epms.entity.enums.AppraisalCycleType;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "appraisal_cycle")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalCycle {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, length = 180)
    private String cycleName;

    @Column(columnDefinition = "TEXT")
    private String description;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "template_id", nullable = false)
    private AppraisalFormTemplate template;

    @Enumerated(EnumType.STRING)
    @Column(name = "cycle_type", nullable = false, length = 30)
    private AppraisalCycleType cycleType;

    @Column(name = "cycle_year", nullable = false)
    private Integer cycleYear;

    /** annual = 1, semi-annual = 1 or 2 */
    @Column(name = "period_no", nullable = false)
    private Integer periodNo = 1;

    @Column(nullable = false)
    private LocalDate startDate;

    @Column(nullable = false)
    private LocalDate endDate;

    @Column(nullable = false)
    private LocalDate submissionDeadline;

    @Column(name = "manager_submission_deadline")
    private LocalDate managerSubmissionDeadline;

    @Column(name = "dept_head_submission_deadline")
    private LocalDate deptHeadSubmissionDeadline;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private AppraisalCycleStatus status = AppraisalCycleStatus.DRAFT;

    @Column(nullable = false)
    private Boolean locked = false;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "created_by_user_id")
    private User createdByUser;

    @Temporal(TemporalType.TIMESTAMP)
    private Date activatedAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date completedAt;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(nullable = false)
    private Date createdAt;

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    @OneToMany(mappedBy = "cycle", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<AppraisalCycleDepartment> cycleDepartments = new ArrayList<>();

    @OneToMany(mappedBy = "cycle", fetch = FetchType.LAZY)
    private List<EmployeeAppraisalForm> employeeAppraisalForms = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        Date now = new Date();
        this.createdAt = now;
        this.updatedAt = now;
        if (this.periodNo == null) {
            this.periodNo = 1;
        }
        if (this.status == null) {
            this.status = AppraisalCycleStatus.DRAFT;
        }
        if (this.locked == null) {
            this.locked = false;
        }
    }

    @PreUpdate
    public void preUpdate() {
        this.updatedAt = new Date();
    }
}
