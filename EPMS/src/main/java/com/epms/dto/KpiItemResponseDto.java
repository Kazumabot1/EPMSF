package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiItemResponseDto {

    private Integer id;
    private String name;
    private Integer kpiCategoryId;
    private String kpiCategoryName;
}
