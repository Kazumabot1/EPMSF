package com.epms.dto;

import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeRequestDto {

    @NotBlank(message = "First name is required")
    private String firstName;

    @NotBlank(message = "Last name is required")
    private String lastName;

    private String phoneNumber;

    /** Optional unless createLoginAccount is true. */
    @Email(message = "Email must be valid")
    private String email;

    private String staffNrc;
    private String gender;
    private String race;
    private String religion;

    @JsonFormat(shape = JsonFormat.Shape.STRING, pattern = "yyyy-MM-dd")
    private Date dateOfBirth;

    private String contactAddress;
    private String permanentAddress;
    private String maritalStatus;
    private String spouseName;
    private String spouseNrc;
    private String fatherName;
    private String fatherNrc;

    /** Optional; when null the employee has no assigned position. */
    private Integer positionId;

    /**
     * Legacy field kept for older frontend calls.
     * New UI should use currentDepartmentId.
     */
    private Integer departmentId;

    /**
     * Employee's main/original department.
     */
    private Integer currentDepartmentId;

    /**
     * Employee's current working department.
     * If this is null, working department = currentDepartmentId.
     * This must not be the same as currentDepartmentId.
     */
    private Integer parentDepartmentId;

    /**
     * When true, HR confirmed the department/team transfer warning.
     */
    private Boolean confirmDepartmentTransfer;

    /**
     * Optional new team to place the employee into after a working department transfer.
     */
    private Integer transferTeamId;

    private Boolean createLoginAccount;
    private Boolean sendTemporaryPasswordEmail;

    /*
     * Selected from HR → Employee → Add/Edit employee.
     *
     * EMPLOYEE_DASHBOARD
     * MANAGER_DASHBOARD
     * DEPARTMENT_HEAD_DASHBOARD
     * HR_DASHBOARD
     * EXECUTIVE_DASHBOARD
     * ADMIN_DASHBOARD
     */
    private String dashboard;

    public Integer effectiveCurrentDepartmentId() {
        return currentDepartmentId != null ? currentDepartmentId : departmentId;
    }
}