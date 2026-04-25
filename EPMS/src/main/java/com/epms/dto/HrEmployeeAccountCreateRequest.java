package com.epms.dto;

import lombok.Data;

@Data
public class HrEmployeeAccountCreateRequest {
    private String employeeCode;
    private String fullName;
    private String email;
    private String departmentName;
    private String positionName;
    private String roleName;
    private String password;
}