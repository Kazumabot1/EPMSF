package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PositionDetailResponseDto {
    private Integer id;
    private String positionTitle;
    private Integer levelId;
    private String levelCode;
    private Integer roleId;
    private String roleName;
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

    @Builder.Default
    private List<DepartmentUsage> departments = new ArrayList<>();

    @Builder.Default
    private List<EmployeeUsage> employees = new ArrayList<>();

    @Builder.Default
    private List<UserOnlyAccount> userOnlyAccounts = new ArrayList<>();

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class DepartmentUsage {
        private Integer departmentId;
        private String departmentName;
        private String departmentCode;
        private Integer employeeCount;
        private Integer activeEmployeeCount;
        private Integer inactiveEmployeeCount;
        private Integer loginAccountCount;
        private Integer userOnlyAccountCount;

        @Builder.Default
        private List<String> employeeNames = new ArrayList<>();
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class EmployeeUsage {
        private Integer employeeId;
        private Integer userId;
        private String employeeCode;
        private String fullName;
        private String email;
        private String phoneNumber;
        private Boolean active;
        private Boolean loginAccountCreated;
        private String accountStatus;
        private String joinDate;

        private Integer currentDepartmentId;
        private String currentDepartment;
        private Integer workingDepartmentId;
        private String workingDepartment;
        private Integer usageDepartmentId;
        private String usageDepartmentName;
        private String departmentUsageLabel;
        private String departmentStartDate;
        private String departmentEndDate;

        @Builder.Default
        private List<String> teamNames = new ArrayList<>();

        @Builder.Default
        private List<String> teamRoles = new ArrayList<>();
    }

    @Data
    @Builder
    @AllArgsConstructor
    @NoArgsConstructor
    public static class UserOnlyAccount {
        private Integer userId;
        private String fullName;
        private String email;
        private String employeeCode;
        private Boolean active;
        private String accountStatus;
        private String joinDate;
        private Integer departmentId;
        private String departmentName;
    }
}