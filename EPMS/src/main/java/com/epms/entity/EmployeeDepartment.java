package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "employee_department")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeDepartment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    // Foreign key to Employee
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "employee_id", referencedColumnName = "id")
    private Employee employee;

    // Foreign key to Department
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "department_id", referencedColumnName = "id")
    private Department department;
    private String currentdepartment;
    private String parentdepartment;
    private String assignBy;
    private Date startdate;
    private Date enddate;


    // Extra fields (optional)
//    private String roleInDepartment;  // e.g., "Manager", "Member"
//    @Temporal(TemporalType.DATE)
//    private Date assignedDate;
//
//    private Boolean isActive = true;
}