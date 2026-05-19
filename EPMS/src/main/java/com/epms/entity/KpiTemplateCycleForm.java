package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(
        name = "kpi_template_cycle_form",
        uniqueConstraints = @UniqueConstraint(name = "uk_cycle_form", columnNames = {"cycle_id", "kpi_form_id"})
)
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiTemplateCycleForm {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "cycle_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private KpiTemplateCycle cycle;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "kpi_form_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private KpiForm kpiForm;
}
