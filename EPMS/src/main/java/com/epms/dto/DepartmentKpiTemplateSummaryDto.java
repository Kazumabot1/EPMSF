package com.epms.dto;

import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import lombok.*;

import java.time.LocalDate;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentKpiTemplateSummaryDto {
    private Integer templateId;
    private Integer cyclePeriodId;
    private String title;
    private Long openAssignments;
    private LocalDate periodStartDate;
    private LocalDate periodEndDate;
    private KpiTemplateCyclePeriodStatus periodStatus;
}
