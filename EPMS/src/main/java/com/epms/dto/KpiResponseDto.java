package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiResponseDto {

    private Integer id;
    private String title;
    private Double target;
    private Integer weight;
    private Integer version;
    private Date createdAt;
    private Date updatedAt;
    private String createdBy;
    private Integer kpiUnitId;
    private String kpiUnitName;
    private Integer kpiCategoryId;
    private String kpiCategoryName;
    private Integer kpiItemId;
    private String kpiItemName;
}
