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
    /** Optional unless {@link #createLoginAccount} is true. */
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
     * Optional. When set, creates/updates the open department assignment. When null, closes the open one.
     */
    private Integer departmentId;

    private Boolean createLoginAccount;
    private Boolean sendTemporaryPasswordEmail;
}
