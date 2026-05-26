package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class OneOnOneAccessContextResponseDto {
    private String accessMode;
    private Integer departmentId;
    private String departmentName;
    private boolean canCreate;
    private boolean canSelectDepartment;
    private boolean canSelectTeam;
    private boolean teamRequired;
    private boolean canUseDepartmentEmployeeScope;
}