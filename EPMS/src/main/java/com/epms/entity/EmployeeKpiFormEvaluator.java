package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;
import java.util.Objects;

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

    @Override
    public boolean equals(Object o) {
        if (this == o) {
            return true;
        }
        if (!(o instanceof EmployeeKpiFormEvaluator other)) {
            return false;
        }
        if (id != null && other.id != null) {
            return Objects.equals(id, other.id);
        }
        Integer evaluatorId = evaluatorUserId();
        Integer otherEvaluatorId = other.evaluatorUserId();
        if (evaluatorId == null || otherEvaluatorId == null) {
            return false;
        }
        return Objects.equals(employeeKpiFormId(), other.employeeKpiFormId())
                && Objects.equals(evaluatorId, otherEvaluatorId);
    }

    @Override
    public int hashCode() {
        return getClass().hashCode();
    }

    private Integer employeeKpiFormId() {
        return employeeKpiForm == null ? null : employeeKpiForm.getId();
    }

    private Integer evaluatorUserId() {
        return evaluatorUser == null ? null : evaluatorUser.getId();
    }
}
