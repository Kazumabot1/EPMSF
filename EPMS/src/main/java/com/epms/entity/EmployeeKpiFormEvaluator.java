package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(
        name = "employee_kpi_form_evaluators",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_employee_kpi_form_evaluator",
                columnNames = {"employee_kpi_form_id", "evaluator_user_id"}
        )
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class EmployeeKpiFormEvaluator {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_kpi_form_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private EmployeeKpiForm employeeKpiForm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "evaluator_user_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private User evaluatorUser;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @PrePersist
    public void prePersist() {
        if (createdAt == null) {
            createdAt = LocalDateTime.now();
        }
    }
}
