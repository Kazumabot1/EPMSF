package com.epms.entity;

import com.epms.entity.enums.EmployeeKpiStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.OptionalDouble;
import java.util.Set;

@Entity
@Table(name = "employee_kpi_forms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class EmployeeKpiForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_form_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private KpiForm kpiForm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_template_cycle_id")
    @EqualsAndHashCode.Exclude
    private KpiTemplateCycle kpiTemplateCycle;

    @Column(name = "assigned_at", nullable = false)
    private LocalDateTime assignedAt;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private EmployeeKpiStatus status;

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

    @Column(name = "early_finalized_reason", columnDefinition = "TEXT")
    private String earlyFinalizedReason;

    @Column(name = "finalized_before_end_date")
    private Boolean finalizedBeforeEndDate;

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @Builder.Default
    @OneToMany(mappedBy = "employeeKpiForm", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    @EqualsAndHashCode.Exclude
    private Set<EmployeeKpiScore> scores = new LinkedHashSet<>();

    @PrePersist
    public void prePersist() {
        if (assignedAt == null) assignedAt = LocalDateTime.now();
        if (status == null) status = EmployeeKpiStatus.ASSIGNED;
        ensureScoresMutable();
    }

    private void ensureScoresMutable() {
        if (scores == null) {
            scores = new LinkedHashSet<>();
        }
    }

    /**
     * {@code totalWeightedScore}: Σ (achievement% × weight / 100) per row — rollup when weights sum to 100.
     * {@code totalScore}: weight‑weighted average of achievement % across rows that have a score (same KPI weights).
     */
    public void calculateTotals() {
        ensureScoresMutable();
        boolean anyScored = scores.stream().anyMatch(s -> s.getScore() != null);
        if (!anyScored) {
            this.totalScore = null;
            this.totalWeightedScore = null;
            return;
        }

        this.totalWeightedScore = scores.stream()
                .mapToDouble(score -> score.getWeightedScore() == null ? 0.0 : score.getWeightedScore())
                .sum();

        double weightWithScore = scores.stream()
                .filter(s -> s.getScore() != null)
                .mapToDouble(s ->
                        s.getKpiFormItem() != null && s.getKpiFormItem().getWeight() != null
                                ? s.getKpiFormItem().getWeight()
                                : 0.0)
                .sum();

        if (weightWithScore > 0) {
            double weightedAchievementSum = scores.stream()
                    .filter(s -> s.getScore() != null)
                    .mapToDouble(s -> {
                        double w = s.getKpiFormItem() != null && s.getKpiFormItem().getWeight() != null
                                ? s.getKpiFormItem().getWeight()
                                : 0.0;
                        return s.getScore() * w;
                    })
                    .sum();
            this.totalScore = weightedAchievementSum / weightWithScore;
        } else {
            OptionalDouble avg = scores.stream()
                    .filter(s -> s.getScore() != null)
                    .mapToDouble(EmployeeKpiScore::getScore)
                    .average();
            this.totalScore = avg.isPresent() ? avg.getAsDouble() : null;
        }
    }

    public void addScore(EmployeeKpiScore score) {
        ensureScoresMutable();
        scores.add(score);
        score.setEmployeeKpiForm(this);
    }

    public void removeScore(EmployeeKpiScore score) {
        if (scores == null) {
            return;
        }
        scores.remove(score);
        score.setEmployeeKpiForm(null);
    }
}
