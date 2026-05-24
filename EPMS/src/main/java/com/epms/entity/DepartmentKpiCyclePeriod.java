package com.epms.entity;

import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(
        name = "department_kpi_cycle_period",
        uniqueConstraints = @UniqueConstraint(name = "uk_department_kpi_cycle_period_number", columnNames = {"cycle_id", "period_number"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentKpiCyclePeriod {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "cycle_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private DepartmentKpiCycle cycle;

    @Column(name = "period_number", nullable = false)
    private Integer periodNumber;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    @Builder.Default
    private KpiTemplateCyclePeriodStatus status = KpiTemplateCyclePeriodStatus.OPEN;
}
