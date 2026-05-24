package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "department_kpi_cycle_template",
        uniqueConstraints = @UniqueConstraint(name = "uk_department_kpi_cycle_template", columnNames = {"cycle_id", "template_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentKpiCycleTemplate {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private DepartmentKpiCycle cycle;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private DepartmentKpiTemplate template;
}
