package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiFormItemDTO {

    private Integer id;

    /** Free-text KPI label when {@link #kpiItemId} is null. */
    private String kpiLabel;

    private Integer kpiItemId;
    private String kpiItemName;

    private Integer kpiCategoryId;
    private String kpiCategoryName;

    private Integer kpiUnitId;
    private String kpiUnitName;

    private Double target;
    private Integer weight;
    private Integer sortOrder;

    /** Populated on PM scoring; always null for HR template APIs. */
    private Double actual;

    /** Populated on PM scoring; always null for HR template APIs. */
    private Double score;

    /** Formula: score × weight / 100 — populated with PM flow. */
    private Double weightedScore;
}
