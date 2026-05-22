package com.epms.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "kpi_form_items")
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@EqualsAndHashCode(callSuper = false)
public class KpiFormItem {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_form_id", nullable = false)
    @EqualsAndHashCode.Exclude
    private KpiForm kpiForm;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_category_id")
    @EqualsAndHashCode.Exclude
    private KpiCategory kpiCategory;

    /**
     * Free-text KPI category when no {@link #kpiCategory} is selected.
     */
    @Column(name = "kpi_category_label", length = 100)
    private String kpiCategoryLabel;

    /**
     * Optional master-data KPI item; use {@link #kpiLabel} when entering a free-text KPI name instead.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_item_id")
    @EqualsAndHashCode.Exclude
    private KpiItem kpiItem;

    /**
     * Free-text KPI name when no {@link #kpiItem} is selected.
     */
    @Column(name = "kpi_label", length = 500)
    private String kpiLabel;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "kpi_unit_id")
    @EqualsAndHashCode.Exclude
    private KpiUnit kpiUnit;

    /**
     * Free-text KPI unit when no {@link #kpiUnit} is selected.
     */
    @Column(name = "kpi_unit_label", length = 100)
    private String kpiUnitLabel;

    @Column(nullable = false)
    private Double target;

    @Column(nullable = false)
    private Integer weight;

    @Column(name = "sort_order")
    private Integer sortOrder;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;
}
