// Create this file by KHN ( ChatGPT)
package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class DepartmentResponseDto {
    private Integer id;
    private String departmentName;
    private String departmentCode;
    private Boolean status;
}