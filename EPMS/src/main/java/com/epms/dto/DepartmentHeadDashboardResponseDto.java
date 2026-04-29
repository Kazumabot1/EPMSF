package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentHeadDashboardResponseDto {
    private Integer departmentId;
    private String departmentName;
    private Long employeeCount;
    private Integer teamCount;
    private List<EmployeeResponseDto> employees;
    private List<TeamResponseDto> teams;
}