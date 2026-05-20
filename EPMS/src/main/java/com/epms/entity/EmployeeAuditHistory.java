package com.epms.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Entity
@Table(name = "employee_audit_history")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAuditHistory {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "employee_id", nullable = false)
    private Integer employeeId;

    @Column(name = "field_name", nullable = false, length = 100)
    private String fieldName;

    @Column(name = "old_value", length = 500)
    private String oldValue;

    @Column(name = "new_value", length = 500)
    private String newValue;

    @Column(name = "edited_by")
    private Integer editedBy;

    @Temporal(TemporalType.TIMESTAMP)
    @Column(name = "edited_at", nullable = false)
    private Date editedAt = new Date();

    @Column(name = "reason", length = 255)
    private String reason;
}
