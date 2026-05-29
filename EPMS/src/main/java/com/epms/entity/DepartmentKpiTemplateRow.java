package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "department_kpi_template_row")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class DepartmentKpiTemplateRow {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    @EqualsAndHashCode.Exclude
    @ToString.Exclude
    private DepartmentKpiTemplate template;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_category_id")
    @EqualsAndHashCode.Exclude
    private KpiCategory kpiCategory;

    @Column(name = "kpi_category_label", length = 100)
    private String kpiCategoryLabel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_item_id")
    @EqualsAndHashCode.Exclude
    private KpiItem kpiItem;

    @Column(name = "kpi_label", length = 500)
    private String kpiLabel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_unit_id")
    @EqualsAndHashCode.Exclude
    private KpiUnit kpiUnit;

    @Column(name = "kpi_unit_label", length = 100)
    private String kpiUnitLabel;

    @Column(nullable = false)
    private Double target;

    @Column(nullable = false)
    private Integer weight;

    @Column(name = "sort_order")
    private Integer sortOrder;
}
