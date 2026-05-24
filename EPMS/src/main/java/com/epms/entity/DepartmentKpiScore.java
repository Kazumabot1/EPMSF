package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "department_kpi_score")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentKpiScore {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "result_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private DepartmentKpiResult result;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_row_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private DepartmentKpiTemplateRow templateRow;

    @Column(name = "actual_value")
    private Double actualValue;

    @Column(name = "score")
    private Double score;

    @Column(name = "weighted_score")
    private Double weightedScore;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluated_by", referencedColumnName = "id")
    @EqualsAndHashCode.Exclude
    private User evaluatedByUser;

    @Column(name = "evaluated_at")
    private LocalDateTime evaluatedAt;

    @PrePersist
    @PreUpdate
    public void calculateWeightedScore() {
        if (score != null && templateRow != null && templateRow.getWeight() != null) {
            weightedScore = score * templateRow.getWeight() / 100.0;
        } else {
            weightedScore = null;
        }
    }
}
