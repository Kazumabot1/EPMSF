package com.epms.entity;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

@Entity
@Table(name = "position_permission_audits")
@Getter
@Setter
public class PositionPermissionAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private Integer positionId;
    private String positionTitleSnapshot;
    private String columnName;
    private String oldValue;
    private String newValue;
    private Integer editedBy;
    private String editedByName;
    private LocalDateTime editedAt;

    @PrePersist
    void onCreate() {
        if (editedAt == null) {
            editedAt = LocalDateTime.now();
        }
    }
}