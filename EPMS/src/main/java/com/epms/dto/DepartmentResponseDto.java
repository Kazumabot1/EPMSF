package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentResponseDto {
    private Integer id;
    private String departmentName;
    private String departmentCode;
    private String headEmployee;
    private Boolean status;
    private Date createdAt;
    private String createdBy;
}
