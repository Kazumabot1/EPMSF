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
    private String staffNrc;
    private String gender;
    private String race;
    private String religion;
    private Date dateOfBirth;
    private String maritalStatus;
    private String contactAddress;
    private String permanentAddress;
    private String currentDepartment;
    private String parentDepartment;
    private String assignedBy;
    private Date departmentStartDate;
    private Date departmentEndDate;
    private Integer departmentHistoryCount;
}