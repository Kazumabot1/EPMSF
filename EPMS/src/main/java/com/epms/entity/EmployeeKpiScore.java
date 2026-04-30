package com.epms.entity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "employee_kpi_scores")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeKpiScore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_kpi_form_id", nullable = false)
    private EmployeeKpiForm employeeKpiForm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_form_item_id", nullable = false)
    private KpiFormItem kpiFormItem;

    @Column(name = "actual_value")
    private Double actualValue;

    @Column(name = "score")
    private Double score;

    @Column(name = "weighted_score")
    private Double weightedScore;

    @Column(name = "comment", columnDefinition = "TEXT")
    private String comment;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluated_by", referencedColumnName = "id")
    private User evaluatedByUser;

    @Column(name = "evaluated_by_string")
    private String evaluatedBy;

    @Column(name = "evaluated_at")
    private LocalDateTime evaluatedAt;

    @PrePersist
    @PreUpdate
    public void calculateWeightedScore() {
        if (score != null && kpiFormItem != null && kpiFormItem.getWeight() != null) {
            this.weightedScore = (score * kpiFormItem.getWeight()) / 100.0;
        }
        if (evaluatedAt == null && actualValue != null) {
            evaluatedAt = LocalDateTime.now();
        }
    }

    public Double getAchievementPercentage() {
        if (actualValue != null && kpiFormItem != null && kpiFormItem.getTarget() != null && kpiFormItem.getTarget() > 0) {
            return (actualValue / kpiFormItem.getTarget()) * 100;
        }
        return null;
    }

    public Boolean isTargetAchieved() {
        if (actualValue == null || kpiFormItem == null || kpiFormItem.getTarget() == null) {
            return false;
        }
        return actualValue >= kpiFormItem.getTarget();
    }

}
