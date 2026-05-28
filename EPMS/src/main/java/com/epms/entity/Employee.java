package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.util.ArrayList;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Entity
@Table(name = "employee")
@Data
@NoArgsConstructor
@AllArgsConstructor
@EqualsAndHashCode(callSuper = false)
public class Employee {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "employee_code", length = 50, unique = true)
    private String employeeCode;

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
    @EqualsAndHashCode.Exclude
    private Set<EmployeeDepartment> employeeDepartments = new LinkedHashSet<>();

    /** Many employees reference one job position. Inverse: Position.employees. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "position_id", nullable = true)
    private Position position;

    /**
     * Current working department shortcut used to keep employee and login account scope in sync.
     * Source rule: working department = employee_department.parentDepartment when present,
     * otherwise employee_department.currentDepartment. This column mirrors that value for
     * fast dashboard/security/reporting lookups and to prevent users/employee mismatch.
     */
    @Column(name = "department_id")
    private Integer departmentId;

    /**
     * Direct reporting manager user id. This mirrors users.manager_id so Manager, KPI,
     * feedback, 1:1, and self-assessment review scopes read the same manager assignment.
     */
    @Column(name = "manager_id")
    private Integer managerId;

    @OneToMany(mappedBy = "employee", fetch = FetchType.LAZY)
    @EqualsAndHashCode.Exclude
    private List<EmployeeKpiForm> employeeKpiForms = new ArrayList<>();
}