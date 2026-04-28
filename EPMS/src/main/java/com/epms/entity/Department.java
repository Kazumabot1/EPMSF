package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;
import java.util.List;

// added by KHN ( Chatgpt)
import com.fasterxml.jackson.annotation.JsonIgnore;

@Entity
@Table(name = "department")
@Data
@NoArgsConstructor
@AllArgsConstructor

public class Department {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(nullable = false, unique = true)
    private String departmentName;

    @Column(unique = true)
    private String departmentCode;

    private String headEmployee;  // employee name or ID (simplified)

    private Boolean status = true;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();

    private String createdBy;

    // One department can have many EmployeeDepartment records (history tracking)
//    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
//    private List<EmployeeDepartment> employeeDepartments;

// modified by KHN ( Chatgpt)
    @JsonIgnore
    @OneToMany(mappedBy = "department", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<EmployeeDepartment> employeeDepartments;
}