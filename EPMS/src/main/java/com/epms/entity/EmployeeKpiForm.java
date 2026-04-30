package com.epms.entity;

import com.epms.entity.enums.EmployeeKpiStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "employee_kpi_forms")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeKpiForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", nullable = false)
    private Employee employee;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_form_id", nullable = false)
    private KpiForm kpiForm;

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

    @Column(name = "sent_at")
    private LocalDateTime sentAt;

    @Column(name = "acknowledged_at")
    private LocalDateTime acknowledgedAt;

    @OneToMany(mappedBy = "employeeKpiForm", cascade = CascadeType.ALL, orphanRemoval = true, fetch = FetchType.LAZY)
    private List<EmployeeKpiScore> scores = new ArrayList<>();

    @PrePersist
    public void prePersist() {
        if (assignedAt == null) assignedAt = LocalDateTime.now();
        if (status == null) status = EmployeeKpiStatus.ASSIGNED;
    }

    public void calculateTotals() {
        this.totalScore = scores.stream()
                .mapToDouble(score -> score.getScore() == null ? 0.0 : score.getScore())
                .sum();

        this.totalWeightedScore = scores.stream()
                .mapToDouble(score -> score.getWeightedScore() == null ? 0.0 : score.getWeightedScore())
                .sum();
    }

    public void addScore(EmployeeKpiScore score) {
        scores.add(score);
        score.setEmployeeKpiForm(this);
    }

    public void removeScore(EmployeeKpiScore score) {
        scores.remove(score);
        score.setEmployeeKpiForm(null);
    }
}
