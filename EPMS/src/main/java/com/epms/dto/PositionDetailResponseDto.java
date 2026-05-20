package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionDetailResponseDto {

    private Integer id;
    private String positionTitle;
    private Integer levelId;
    private String levelCode;
    private String description;
    private Boolean status;
    private LocalDateTime createdAt;
    private String createdBy;

    private Integer totalEmployeeCount;
    private Integer activeEmployeeCount;
    private Integer inactiveEmployeeCount;
    private Integer loginAccountCount;
    private Integer userOnlyAccountCount;
    private Integer departmentCount;
    private Integer teamCount;

    private List<DepartmentUsageDto> departments = new ArrayList<>();
    private List<EmployeeUsageDto> employees = new ArrayList<>();
    private List<UserOnlyAccountDto> userOnlyAccounts = new ArrayList<>();

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentUsageDto {
        private Integer departmentId;
        private String departmentName;
        private String departmentCode;
        private Integer employeeCount;
        private Integer activeEmployeeCount;
        private Integer inactiveEmployeeCount;
        private Integer loginAccountCount;
        private Integer userOnlyAccountCount;
        private List<String> employeeNames = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class EmployeeUsageDto {
        private Integer employeeId;
        private Integer userId;
        private String employeeCode;
        private String fullName;
        private String email;
        private String phoneNumber;
        private Boolean active;
        private Boolean loginAccountCreated;
        private String accountStatus;
        private Date joinDate;

        private Integer currentDepartmentId;
        private String currentDepartment;
        private Integer workingDepartmentId;
        private String workingDepartment;
        private Integer usageDepartmentId;
        private String usageDepartmentName;
        private String departmentUsageLabel;
        private Date departmentStartDate;
        private Date departmentEndDate;

        private List<String> teamNames = new ArrayList<>();
        private List<String> teamRoles = new ArrayList<>();
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class UserOnlyAccountDto {
        private Integer userId;
        private String fullName;
        private String email;
        private String employeeCode;
        private Boolean active;
        private String accountStatus;
        private Date joinDate;
        private Integer departmentId;
        private String departmentName;
    }
}