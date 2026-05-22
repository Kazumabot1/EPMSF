package com.epms.dto;

import lombok.Data;

@Data
public class HrEmployeeAccountCreateRequest {

    private Integer employeeId;

    private String firstName;
    private String lastName;
    private String employeeCode;
    private String fullName;
    private String email;

    private Integer departmentId;
    private Integer positionId;

    private String departmentName;
    private String positionName;

    private String roleName;

    /*
     * Admin-selected dashboard override.
     *
     * ADMIN_DASHBOARD
     * HR_DASHBOARD
     * EXECUTIVE_DASHBOARD
     * DEPARTMENT_HEAD_DASHBOARD
     * MANAGER_DASHBOARD
     * EMPLOYEE_DASHBOARD
     */
    private String dashboard;

    private String password;
    private Boolean sendTemporaryPasswordEmail;
}