package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "kpi_positions")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiPosition {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_id", nullable = false)
    private Kpi kpiForm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = false)
    private Position position;

    @Column(name = "score")
    private Double score;

    @Column(name = "weighted_score")
    private Double weightedScore;

    @Column(name = "target_value")
    private Double targetValue;

    @Column(name = "actual_value")
    private Double actualValue;

    @Column(name = "status")
    private String status = "ACTIVE";

    @Column(name = "assigned_date")
    @Temporal(TemporalType.TIMESTAMP)
    private java.util.Date assignedDate;

    @Column(name = "last_evaluated_date")
    @Temporal(TemporalType.TIMESTAMP)
    private java.util.Date lastEvaluatedDate;

    @Column(name = "assigned_by")
    private String assignedBy;

    // Helper method to calculate weighted score
    @PrePersist
    @PreUpdate
    public void calculateWeightedScore() {
        if (score != null && kpiForm != null && kpiForm.getWeight() != null) {
            this.weightedScore = (score * kpiForm.getWeight()) / 100.0;
        }
    }

    // Helper method to calculate achievement percentage
    public Double getAchievementPercentage() {
        if (targetValue != null && targetValue > 0 && actualValue != null) {
            return (actualValue / targetValue) * 100;
        }
        return null;
    }

    // Helper method to check if target is achieved
    public Boolean isTargetAchieved() {
        if (actualValue != null && targetValue != null) {
            return actualValue >= targetValue;
        }
        return false;
    }

    // Helper method to get performance rating based on score
    public String getPerformanceRating() {
        if (score == null) return "NOT_RATED";
        if (score >= 90) return "EXCELLENT";
        if (score >= 75) return "GOOD";
        if (score >= 60) return "SATISFACTORY";
        if (score >= 40) return "NEEDS_IMPROVEMENT";
        return "POOR";
    }

    // Helper method to get variance from target
    public Double getTargetVariance() {
        if (actualValue != null && targetValue != null) {
            return actualValue - targetValue;
        }
        return null;
    }

    // Helper method to get variance percentage
    public Double getTargetVariancePercentage() {
        if (actualValue != null && targetValue != null && targetValue > 0) {
            return ((actualValue - targetValue) / targetValue) * 100;
        }
        return null;
    }
}