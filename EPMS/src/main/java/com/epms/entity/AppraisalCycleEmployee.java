package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

/**
 * Hub/pivot entity that anchors an Employee's participation in a specific
 * AppraisalCycle. All feedback requests, appraisal results, and KPI
 * evaluations hang off this record — preventing orphaned data.
 *
 * UNIQUE(cycle_id, employee_id) enforced at DB level to prevent duplicate
 * enrollments.
 */
@Entity
@Table(
    name = "appraisal_cycle_employees",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_cycle_employee", columnNames = {"cycle_id", "employee_id"})
    },
    indexes = {
        @Index(name = "idx_ace_cycle_id",    columnList = "cycle_id"),
        @Index(name = "idx_ace_employee_id", columnList = "employee_id")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class AppraisalCycleEmployee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Cycle Participation ──────────────────────────────────────────────────

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id", nullable = false)
    private AppraisalCycle cycle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    /**
     * Participation status within this cycle.
     * e.g. ENROLLED, IN_PROGRESS, COMPLETED, WITHDRAWN
     */
    @Column(name = "status", nullable = false, length = 30)
    private String status = "ENROLLED";

    // ── Audit ────────────────────────────────────────────────────────────────

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Relationships ────────────────────────────────────────────────────────

    /**
     * All feedback requests raised for this cycle-participant.
     * Cascade removal ensures orphaned requests are cleaned up.
     */
    @OneToMany(mappedBy = "cycleEmployee", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<FeedbackRequest> feedbackRequests = new ArrayList<>();

    // ── Lifecycle Hooks ──────────────────────────────────────────────────────

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
