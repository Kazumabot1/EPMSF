package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class DepartmentComparisonDetailDto {
    private Integer id;
    private String departmentName;
    private String departmentCode;
    private Boolean status;
    private Date createdAt;
    private String createdBy;
    private String headEmployee;

    private Long totalEmployeeCount;
    private Long currentDepartmentEmployeeCount;
    private Long parentDepartmentEmployeeCount;
    private Long teamCount;

    private Double departmentKpiScore;
    private Double departmentKpiWeightedScore;
    private String departmentKpiTemplateTitle;
    private LocalDate departmentKpiPeriodStartDate;
    private LocalDate departmentKpiPeriodEndDate;
    private LocalDateTime departmentKpiFinalizedAt;

    private List<DepartmentComparisonEmployeeDto> employees = new ArrayList<>();
    private List<DepartmentComparisonTeamDto> teams = new ArrayList<>();
}
