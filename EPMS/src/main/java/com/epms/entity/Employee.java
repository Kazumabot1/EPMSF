package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "employee")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private String firstName;
    private String lastName;
    private String phoneNumber;
    private String email;
    private String password;
    private String staffNrc;
    private String gender;
    private String race;
    private String religion;

    @Temporal(TemporalType.DATE)
    private Date dateOfBirth;

    private String contactAddress;
    private String permanentAddress;
    private String maritalStatus;
    private String spouseName;
    private String spouseNrc;
    private String fatherName;
    private String fatherNrc;

    /**
     * When false, the employee is soft-deleted / deactivated and excluded from default listings.
     * Null is treated as active for legacy rows.
     */
    private Boolean active = true;

    // Many-to-Many with Department is managed through EmployeeDepartment (supports history tracking)
    @OneToMany(mappedBy = "employee", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<EmployeeDepartment> employeeDepartments;

    /** Many employees reference one job position. Inverse: Position.employees. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = true)
    private Position position;

    @OneToMany(mappedBy = "employee", fetch = FetchType.LAZY)
    private List<EmployeeKpiForm> employeeKpiForms = new ArrayList<>();
}