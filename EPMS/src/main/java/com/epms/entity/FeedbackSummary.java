package com.epms.entity;

import jakarta.persistence.*;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_summary", uniqueConstraints = {
        @UniqueConstraint(columnNames = {"campaign_id", "target_employee_id"})
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackSummary {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private FeedbackCampaign campaign;

    @Column(name = "target_employee_id", nullable = false)
    private Long targetEmployeeId;

    /**
     * Official normalized 360 feedback score for this campaign target.
     * This is a feedback-only score, not a final performance/appraisal score.
     */
    @Column(name = "average_score")
    private Double averageScore;

    /** Raw submitted-response average before any future confidence or policy adjustment. */
    @Column(name = "raw_average_score")
    private Double rawAverageScore;

    @Column(name = "total_responses", nullable = false)
    private Long totalResponses;

    @Column(name = "manager_responses", nullable = false)
    private Long managerResponses;

    @Column(name = "peer_responses", nullable = false)
    private Long peerResponses;

    @Column(name = "subordinate_responses", nullable = false)
    private Long subordinateResponses;

    @Column(name = "self_responses", nullable = false)
    private Long selfResponses;

    @Column(name = "assigned_evaluator_count", nullable = false)
    private Long assignedEvaluatorCount;

    @Column(name = "submitted_evaluator_count", nullable = false)
    private Long submittedEvaluatorCount;

    @Column(name = "pending_evaluator_count", nullable = false)
    private Long pendingEvaluatorCount;

    @Column(name = "completion_rate", nullable = false)
    private Double completionRate;

    @Column(name = "confidence_level", nullable = false, length = 32)
    private String confidenceLevel;

    @Column(name = "insufficient_feedback", nullable = false)
    private Boolean insufficientFeedback;

    @Column(name = "score_calculation_method", nullable = false, length = 64)
    private String scoreCalculationMethod;

    @Column(name = "score_calculation_note", length = 500)
    private String scoreCalculationNote;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility_status", nullable = false, length = 30)
    private FeedbackSummaryVisibilityStatus visibilityStatus;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;

    @Column(name = "published_by_user_id")
    private Long publishedByUserId;

    @Column(name = "publish_note", columnDefinition = "TEXT")
    private String publishNote;

    @Column(name = "manager_average_score")
    private Double managerAverageScore;

    @Column(name = "peer_average_score")
    private Double peerAverageScore;

    @Column(name = "subordinate_average_score")
    private Double subordinateAverageScore;

    @Column(name = "self_average_score")
    private Double selfAverageScore;

    @Column(name = "summarized_at", nullable = false)
    private LocalDateTime summarizedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        applyDefaults();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        applyDefaults();
    }

    private void applyDefaults() {
        if (totalResponses == null) totalResponses = 0L;
        if (managerResponses == null) managerResponses = 0L;
        if (peerResponses == null) peerResponses = 0L;
        if (subordinateResponses == null) subordinateResponses = 0L;
        if (selfResponses == null) selfResponses = 0L;
        if (assignedEvaluatorCount == null) assignedEvaluatorCount = 0L;
        if (submittedEvaluatorCount == null) submittedEvaluatorCount = 0L;
        if (pendingEvaluatorCount == null) pendingEvaluatorCount = 0L;
        if (completionRate == null) completionRate = 0.0;
        if (confidenceLevel == null || confidenceLevel.isBlank()) confidenceLevel = "INSUFFICIENT";
        if (insufficientFeedback == null) insufficientFeedback = true;
        if (scoreCalculationMethod == null || scoreCalculationMethod.isBlank()) {
            scoreCalculationMethod = "SUBMITTED_RESPONSE_AVERAGE";
        }
        if (visibilityStatus == null) visibilityStatus = FeedbackSummaryVisibilityStatus.HIDDEN;
        if (summarizedAt == null) summarizedAt = LocalDateTime.now();
    }
}
