package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalResponseDto {

    private Integer id;
    private Integer employeeId;
    private Integer cycleId;
    private Long formId;
    private String appraisalStatus;
    private Double overallScore;
    private String performanceCategory;
}
