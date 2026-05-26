package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.Date;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DepartmentComparisonSummaryDto {
    private Integer id;
    private String departmentName;
    private String departmentCode;
    private Boolean status;
    private Date createdAt;
    private String createdBy;
    private Double departmentKpiScore;
    private Double departmentKpiWeightedScore;
    private String departmentKpiTemplateTitle;
    private LocalDate departmentKpiPeriodStartDate;
    private LocalDate departmentKpiPeriodEndDate;
    private LocalDateTime departmentKpiFinalizedAt;

    public DepartmentComparisonSummaryDto(Integer id, String departmentName, String departmentCode, Boolean status, Date createdAt, String createdBy) {
        this.id = id;
        this.departmentName = departmentName;
        this.departmentCode = departmentCode;
        this.status = status;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
    }
}
