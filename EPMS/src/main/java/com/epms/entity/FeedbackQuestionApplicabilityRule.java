package com.epms.entity;

import jakarta.persistence.*;
import org.hibernate.annotations.NotFound;
import org.hibernate.annotations.NotFoundAction;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_question_applicability_rules")
@Getter
@Setter
@NoArgsConstructor
public class FeedbackQuestionApplicabilityRule {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;


    /**
     * Real parent identity for the Rule Sets UI. Internal applicability rows remain
     * role-specific, but activate/disable/duplicate/edit operations must be scoped to
     * this parent so separate rule sets never silently merge.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(
            name = "rule_set_id",
            nullable = true,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
    )
    private FeedbackQuestionRuleSet ruleSet;

    /**
     * Rules reference the master question bank item. The exact active question version is
     * resolved only when previewing or snapshotting a campaign/assignment.
     */
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(
            name = "question_bank_id",
            nullable = true,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
    )
    private FeedbackQuestionBank questionBank;

    /**
     * Legacy compatibility column. Product logic references questionBank, not a
     * specific version; campaign activation snapshots the exact active version later.
     *
     * Some existing databases still have question_version_id as NOT NULL because
     * it was required before the Rule Sets redesign. New rows therefore write the
     * current active version here only to satisfy old schemas and keep legacy
     * reporting queries safe. Resolver logic must not use this as the rule source.
     */
    @Deprecated
    @ManyToOne(fetch = FetchType.LAZY, optional = true)
    @NotFound(action = NotFoundAction.IGNORE)
    @JoinColumn(
            name = "question_version_id",
            nullable = true,
            foreignKey = @ForeignKey(ConstraintMode.NO_CONSTRAINT)
    )
    private FeedbackQuestionVersion legacyQuestionVersion;

    @Column(name = "target_level_min_rank", nullable = false)
    private Integer targetLevelMinRank;

    @Column(name = "target_level_max_rank", nullable = false)
    private Integer targetLevelMaxRank;

    @Column(name = "target_position_id")
    private Long targetPositionId;

    @Column(name = "target_department_id")
    private Long targetDepartmentId;

    @Column(name = "evaluator_relationship_type", nullable = false, length = 40)
    private String evaluatorRelationshipType;

    /**
     * Database compatibility only. Section has been removed from the Question Rules
     * product model and must not be exposed through DTOs, UI, resolver logic, preview,
     * campaign setup, or reports. Some existing MySQL databases still have these legacy
     * NOT NULL columns because Hibernate ddl-auto=update does not relax old column
     * constraints. Writing neutral placeholders keeps new sectionless rules insertable
     * until the table is fully cleaned up by an explicit DBA/migration step.
     */
    @Deprecated
    @Column(name = "section_code", length = 80)
    private String legacySectionCode = "SECTION_REMOVED";

    @Deprecated
    @Column(name = "section_title", length = 150)
    private String legacySectionTitle = "Question Rules";

    @Deprecated
    @Column(name = "section_order")
    private Integer legacySectionOrder = 1;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 1;

    @Column(name = "rule_priority", nullable = false)
    private Integer rulePriority = 100;

    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.legacySectionCode == null || this.legacySectionCode.isBlank()) {
            this.legacySectionCode = "SECTION_REMOVED";
        }
        if (this.legacySectionTitle == null || this.legacySectionTitle.isBlank()) {
            this.legacySectionTitle = "Question Rules";
        }
        if (this.legacySectionOrder == null) {
            this.legacySectionOrder = 1;
        }
        if (this.displayOrder == null) {
            this.displayOrder = 1;
        }
        if (this.rulePriority == null) {
            this.rulePriority = 100;
        }
        if (this.active == null) {
            this.active = true;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
