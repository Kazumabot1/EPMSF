package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Aggregated summary view of all feedback responses for a specific
 * FeedbackRequest. Pre-computed and stored to avoid expensive on-demand
 * aggregation across feedback_response_items at reporting time.
 *
 * Generation strategy:
 *  - Populated by a scheduled job or triggered after all evaluators submit.
 *  - Can be regenerated (update generated_at) when new responses arrive
 *    before the deadline.
 *
 * Constraint:
 *  - UNIQUE(request_id): one summary per feedback request, ever.
 *    Use upsert (merge) semantics when refreshing.
 */
@Entity
@Table(
    name = "feedback_summaries",
    uniqueConstraints = {
        @UniqueConstraint(name = "uq_summary_request_id", columnNames = {"request_id"})
    },
    indexes = {
        @Index(name = "idx_fsum_request_id",        columnList = "request_id"),
        @Index(name = "idx_fsum_cycle_employee_id", columnList = "cycle_employee_id"),
        @Index(name = "idx_fsum_generated_at",      columnList = "generated_at")
    }
)
@Getter
@Setter
@NoArgsConstructor
public class FeedbackSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // ── Core Reference ────────────────────────────────────────────────────────

    /**
     * The feedback request this summary aggregates.
     * UNIQUE — one summary per request.
     */
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "request_id", nullable = false, unique = true)
    private FeedbackRequest request;

    /**
     * Denormalized FK for fast dashboard/analytics queries.
     * Mirrors request.cycleEmployee — kept in sync at service layer.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_employee_id", nullable = false)
    private AppraisalCycleEmployee cycleEmployee;

    // ── Aggregated Metrics ────────────────────────────────────────────────────

    /**
     * Mean score across all submitted feedback_response_items.
     * DECIMAL(5,2): supports values like 99.99 / 5.00 etc.
     */
    @Column(name = "average_score", precision = 5, scale = 2)
    private BigDecimal averageScore;

    /**
     * Count of feedback_responses with status = SUBMITTED.
     * Used to track completion rate vs. total assigned evaluators.
     */
    @Column(name = "total_responses", nullable = false)
    private Integer totalResponses = 0;

    /**
     * Evaluator breakdown by source_type:
     * Stored as JSON string for flexible reporting without extra join tables.
     * Example: {"MANAGER":1,"PEER":3,"SUBORDINATE":2,"SELF":1}
     */
    @Column(name = "response_breakdown", columnDefinition = "TEXT")
    private String responseBreakdown;

    /**
     * Timestamp of last (re)generation. Lets consumers detect staleness.
     */
    @Column(name = "generated_at", nullable = false)
    private LocalDateTime generatedAt;

    // ── Audit ────────────────────────────────────────────────────────────────

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    // ── Lifecycle Hooks ──────────────────────────────────────────────────────

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.generatedAt == null) {
            this.generatedAt = LocalDateTime.now();
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt    = LocalDateTime.now();
        this.generatedAt  = LocalDateTime.now();
    }
}
