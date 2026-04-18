package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Entity
@Table(name = "users")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(unique = true, nullable = false)
    private String email;

    @Column(nullable = false)
    private String password;

    private String fullName;
    private String employeeCode;
    private String position;
    private Integer managerId;
    private Integer departmentId;
    private Boolean active = true;

    @Temporal(TemporalType.DATE)
    private Date joinDate;

    @Temporal(TemporalType.TIMESTAMP)
    private Date createdAt = new Date();

    @Temporal(TemporalType.TIMESTAMP)
    private Date updatedAt;

    // One-to-Many relationship with KPIs created by this user
    @OneToMany(mappedBy = "createdByUser", fetch = FetchType.LAZY)
    private List<Kpi> createdKpiForms = new ArrayList<>();

    @OneToMany(mappedBy = "createdByUser", fetch = FetchType.LAZY)
    private List<Team> createdTeams = new ArrayList<>();

    @OneToMany(mappedBy = "user", fetch = FetchType.LAZY)
    private List<Notification> notifications = new ArrayList<>();
}