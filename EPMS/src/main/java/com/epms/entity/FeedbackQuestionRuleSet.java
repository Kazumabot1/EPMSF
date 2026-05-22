package com.epms.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.Set;

@Entity
@Table(name = "feedback_question_rule_sets")
@Getter
@Setter
@NoArgsConstructor
public class FeedbackQuestionRuleSet {

    private static final Set<String> SUPPORTED_STATUSES = Set.of("DRAFT", "ACTIVE", "DISABLED", "ARCHIVED");

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false, length = 180)
    private String name;

    @Column(name = "description", length = 500)
    private String description;

    @Column(name = "status", nullable = false, length = 20)
    private String status = "ACTIVE";

    @Column(name = "target_level_min_rank", nullable = false)
    private Integer targetLevelMinRank;

    @Column(name = "target_level_max_rank", nullable = false)
    private Integer targetLevelMaxRank;

    @Column(name = "target_position_id")
    private Long targetPositionId;

    @Column(name = "target_department_id")
    private Long targetDepartmentId;

    /**
     * Compatibility flag for existing queries/schema. Product workflow uses status.
     * ACTIVE => true; DRAFT/DISABLED/ARCHIVED => false.
     */
    @Column(name = "active", nullable = false)
    private Boolean active = true;

    @OneToMany(mappedBy = "ruleSet", fetch = FetchType.LAZY)
    private List<FeedbackQuestionApplicabilityRule> rules = new ArrayList<>();

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
        if (this.targetLevelMinRank == null) {
            this.targetLevelMinRank = 1;
        }
        if (this.targetLevelMaxRank == null) {
            this.targetLevelMaxRank = 9;
        }
        if (this.name == null || this.name.isBlank()) {
            this.name = buildDefaultName();
        }
        if (this.status == null || this.status.isBlank()) {
            this.status = Boolean.TRUE.equals(this.active) ? "ACTIVE" : "DISABLED";
        }
        this.status = this.status.trim().toUpperCase(Locale.ROOT).replace('-', '_').replace(' ', '_');
        if (!SUPPORTED_STATUSES.contains(this.status)) {
            this.status = Boolean.TRUE.equals(this.active) ? "ACTIVE" : "DISABLED";
        }
        this.active = "ACTIVE".equals(this.status);
    }

    private String buildDefaultName() {
        int min = targetLevelMinRank == null ? 1 : targetLevelMinRank;
        int max = targetLevelMaxRank == null ? 9 : targetLevelMaxRank;
        return "L" + String.format("%02d", min) + "–L" + String.format("%02d", max) + " Rule Set";
    }
}
