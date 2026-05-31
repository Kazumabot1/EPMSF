package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiUnassignedEvaluatorDto {

    private Integer employeeId;
    private String employeeName;
    private Integer departmentId;
    private String departmentName;
    private String positionTitle;
    private String reason;
}
