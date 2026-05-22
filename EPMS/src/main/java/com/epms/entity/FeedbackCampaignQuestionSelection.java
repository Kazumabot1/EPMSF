package com.epms.entity;

import com.epms.entity.enums.FeedbackRelationshipType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "feedback_campaign_question_selections", uniqueConstraints = {
        @UniqueConstraint(name = "uk_campaign_question_selection", columnNames = {
                "campaign_id", "relationship_type", "target_level_code", "question_code"
        })
})
@Getter
@Setter
@NoArgsConstructor
public class FeedbackCampaignQuestionSelection {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "campaign_id", nullable = false)
    private FeedbackCampaign campaign;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "question_version_id")
    private FeedbackQuestionVersion questionVersion;

    @Column(name = "question_bank_id")
    private Long questionBankId;

    @Column(name = "source_rule_id")
    private Long sourceRuleId;

    @Enumerated(EnumType.STRING)
    @Column(name = "relationship_type", nullable = false, length = 40)
    private FeedbackRelationshipType relationshipType;

    @Column(name = "target_level_code", nullable = false, length = 80)
    private String targetLevelCode = "UNSPECIFIED";

    @Column(name = "target_level_rank")
    private Integer targetLevelRank;

    @Column(name = "target_position_id")
    private Long targetPositionId;

    @Column(name = "target_department_id")
    private Long targetDepartmentId;

    @Column(name = "target_count", nullable = false)
    private Integer targetCount = 0;

    @Column(name = "assignment_count", nullable = false)
    private Integer assignmentCount = 0;

    @Column(name = "question_code", nullable = false, length = 80)
    private String questionCode;

    @Column(name = "competency_code", length = 80)
    private String competencyCode;

    @Column(name = "question_text_snapshot", nullable = false, columnDefinition = "TEXT")
    private String questionTextSnapshot;

    @Column(name = "response_type", nullable = false, length = 40)
    private String responseType = "RATING_WITH_COMMENT";

    @Column(name = "scoring_behavior", nullable = false, length = 30)
    private String scoringBehavior = "SCORED";

    @Column(name = "rating_scale_id")
    private Integer ratingScaleId;

    @Column(name = "is_required", nullable = false)
    private Boolean required = true;

    @Column(name = "is_included", nullable = false)
    private Boolean included = true;

    @Column(name = "weight", nullable = false)
    private Double weight = 1.0;

    @Column(name = "section_code", nullable = false, length = 80)
    private String sectionCode = "GENERAL";

    @Column(name = "section_title", nullable = false, length = 150)
    private String sectionTitle = "General Feedback";

    @Column(name = "section_order", nullable = false)
    private Integer sectionOrder = 1;

    @Column(name = "display_order", nullable = false)
    private Integer displayOrder = 1;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        normalizeDefaults();
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
        normalizeDefaults();
    }

    private void normalizeDefaults() {
        if (this.targetLevelCode == null || this.targetLevelCode.isBlank()) {
            this.targetLevelCode = "UNSPECIFIED";
        }
        if (this.responseType == null || this.responseType.isBlank()) {
            this.responseType = "RATING_WITH_COMMENT";
        }
        if (this.scoringBehavior == null || this.scoringBehavior.isBlank()) {
            this.scoringBehavior = "SCORED";
        }
        if (this.required == null) {
            this.required = true;
        }
        if (this.included == null) {
            this.included = true;
        }
        if (this.weight == null || this.weight <= 0) {
            this.weight = 1.0;
        }
        if (this.sectionCode == null || this.sectionCode.isBlank()) {
            this.sectionCode = "GENERAL";
        }
        if (this.sectionTitle == null || this.sectionTitle.isBlank()) {
            this.sectionTitle = "General Feedback";
        }
        if (this.sectionOrder == null) {
            this.sectionOrder = 1;
        }
        if (this.displayOrder == null) {
            this.displayOrder = 1;
        }
        if (this.targetCount == null) {
            this.targetCount = 0;
        }
        if (this.assignmentCount == null) {
            this.assignmentCount = 0;
        }
    }
}
