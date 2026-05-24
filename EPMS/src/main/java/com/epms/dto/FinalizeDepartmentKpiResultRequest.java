package com.epms.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalizeDepartmentKpiResultRequest {
    private Integer templateId;
    private Integer cyclePeriodId;
}
