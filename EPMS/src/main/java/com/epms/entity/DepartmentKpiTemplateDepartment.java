package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "department_kpi_template_department",
        uniqueConstraints = @UniqueConstraint(name = "uk_department_kpi_template_department", columnNames = {"template_id", "department_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentKpiTemplateDepartment {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private DepartmentKpiTemplate template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private Department department;
}
