package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeResponseDto {
    private Integer id;
    private String firstName;
    private String lastName;
    private String fullName;
    private String phoneNumber;
    private String email;
    private String staffNrc;
    private String gender;
    private String race;
    private String religion;
    private Date dateOfBirth;
    private String maritalStatus;
    private String spouseName;
    private String spouseNrc;
    private String fatherName;
    private String fatherNrc;
    private Boolean active;
    private String contactAddress;
    private String permanentAddress;
    private Integer positionId;
    private String positionTitle;
    private String positionLevelCode;
    /** Department entity id of the current (open) assignment, if any. */
    private Integer currentDepartmentId;
    private String currentDepartment;
    private String parentDepartment;
    private String assignedBy;
    private Date departmentStartDate;
    private Date departmentEndDate;
    private Integer departmentHistoryCount;

    private Integer userId;
    private Boolean loginAccountCreated;
    private Boolean mustChangePassword;
    /**
     * When create/update requested login provisioning: outcome message for the UI (success or failure).
     */
    private String accountProvisioningMessage;
    /**
     * True when the requested provisioning step completed successfully; false when it failed; null if not requested.
     */
    private Boolean accountProvisioningSuccess;
    /**
     * Sanitized SMTP error when email send failed (no secrets). Null if not applicable.
     */
    private String accountProvisioningSmtpError;
}