package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class DepartmentRequestDto {

    @NotBlank(message = "Department name is required")
    private String departmentName;

    private String departmentCode;

    private String headEmployee;

    private Boolean status;
}
