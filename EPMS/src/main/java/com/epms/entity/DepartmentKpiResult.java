package com.epms.entity;

import com.epms.entity.enums.DepartmentKpiResultStatus;
import com.epms.entity.enums.KpiEarlyCloseReviewDecision;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.LinkedHashSet;
import java.util.OptionalDouble;
import java.util.Set;

@Entity
@Table(
        name = "department_kpi_result",
        uniqueConstraints = @UniqueConstraint(name = "uk_department_kpi_result_scope", columnNames = {"department_id", "template_id", "cycle_period_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentKpiResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private Department department;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private DepartmentKpiTemplate template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id")
    @EqualsAndHashCode.Exclude
    private DepartmentKpiCycle cycle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_period_id")
    @EqualsAndHashCode.Exclude
    private DepartmentKpiCyclePeriod cyclePeriod;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private DepartmentKpiResultStatus status = DepartmentKpiResultStatus.ASSIGNED;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Column(name = "total_score")
    private Double totalScore;

    @Column(name = "total_weighted_score")
    private Double totalWeightedScore;

    @Column(name = "finalized_at")
    private LocalDateTime finalizedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finalized_by_user_id", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    private User finalizedByUser;

    @Column(name = "finalization_request_reason", length = 1000)
    private String finalizationRequestReason;

    @Column(name = "finalization_requested_at")
    private LocalDateTime finalizationRequestedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finalization_requested_by_user_id", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    private User finalizationRequestedByUser;

    @Enumerated(EnumType.STRING)
    @Column(name = "finalization_review_decision", length = 30)
    private KpiEarlyCloseReviewDecision finalizationReviewDecision;

    @Column(name = "finalization_review_reason", length = 1000)
    private String finalizationReviewReason;

    @Column(name = "finalization_reviewed_at")
    private LocalDateTime finalizationReviewedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "finalization_reviewed_by_user_id", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    private User finalizationReviewedByUser;

    @Builder.Default
    @OneToMany(mappedBy = "result", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @EqualsAndHashCode.Exclude
    private Set<DepartmentKpiScore> scores = new LinkedHashSet<>();

    @PrePersist
    public void prePersist() {
        if (assignedAt == null) assignedAt = LocalDateTime.now();
        if (status == null) status = DepartmentKpiResultStatus.ASSIGNED;
    }

    public void addScore(DepartmentKpiScore score) {
        scores.add(score);
        score.setResult(this);
    }

    public void calculateTotals() {
        boolean anyScored = scores != null && scores.stream().anyMatch(s -> s.getScore() != null);
        if (!anyScored) {
            totalScore = null;
            totalWeightedScore = null;
            return;
        }
        totalWeightedScore = scores.stream().mapToDouble(s -> s.getWeightedScore() == null ? 0.0 : s.getWeightedScore()).sum();
        double weightWithScore = scores.stream()
                .filter(s -> s.getScore() != null)
                .mapToDouble(s -> s.getTemplateRow() != null && s.getTemplateRow().getWeight() != null ? s.getTemplateRow().getWeight() : 0.0)
                .sum();
        if (weightWithScore > 0) {
            totalScore = scores.stream()
                    .filter(s -> s.getScore() != null)
                    .mapToDouble(s -> s.getScore() * (s.getTemplateRow() != null && s.getTemplateRow().getWeight() != null ? s.getTemplateRow().getWeight() : 0.0))
                    .sum() / weightWithScore;
        } else {
            OptionalDouble avg = scores.stream().filter(s -> s.getScore() != null).mapToDouble(DepartmentKpiScore::getScore).average();
            totalScore = avg.isPresent() ? avg.getAsDouble() : null;
        }
    }
}
