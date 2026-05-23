package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalizeDepartmentKpiRequest {

    @NotNull
    private Integer kpiFormId;

    private Integer cyclePeriodId;
}
