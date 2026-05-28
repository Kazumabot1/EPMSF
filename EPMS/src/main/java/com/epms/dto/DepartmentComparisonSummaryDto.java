package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

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
}