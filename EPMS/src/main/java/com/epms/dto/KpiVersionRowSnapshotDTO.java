package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiVersionRowSnapshotDTO {

    private Integer itemId;
    private String kpiName;
    private Integer kpiItemId;
    private Integer kpiCategoryId;
    private String kpiCategoryName;
    private Integer kpiUnitId;
    private String kpiUnitName;
    private Double target;
    private Integer weight;
    private Integer sortOrder;
}
