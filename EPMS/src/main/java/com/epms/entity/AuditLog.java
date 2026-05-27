/*
package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;
import java.util.Date;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;
    private Integer userId;
    private String action; // CREATE, UPDATE, DELETE, SUBMIT, LOCK, UNLOCK, APPROVE
    private String entityType;
    private Integer entityId;
    private String oldValue;
    private String newValue;
    private String reason;
    @Temporal(TemporalType.TIMESTAMP)
    private Date timestamp = new Date();
}*/


package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(name = "audit_logs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuditLog {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    private Integer userId;

    private String action;

    private String entityType;

    private Integer entityId;

    @Column(name = "changed_column")
    private String changedColumn;

    @Column(columnDefinition = "TEXT")
    private String oldValue;

    @Column(columnDefinition = "TEXT")
    private String newValue;

    @Column(length = 500)
    private String reason;

    @Temporal(TemporalType.TIMESTAMP)
    private Date timestamp = new Date();
}