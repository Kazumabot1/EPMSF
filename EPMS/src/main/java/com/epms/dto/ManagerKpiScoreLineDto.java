package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerKpiScoreLineDto {
    private Integer kpiFormItemId;
    private String kpiLabel;
    private String kpiCategoryName;
    private Integer weight;
    private Double target;
    private String unitName;
    private Double actualValue;
    /** Achievement % — from actual/target when manager uses actual, else legacy 0–100. */
    private Double score;
    private Double weightedScore;
}
