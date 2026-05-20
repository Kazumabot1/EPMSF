package com.epms.entity;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

import java.time.LocalDateTime;

/**
 * Audit trail for every change made to a position's permissions.
 * One row per changed column per save.
 *
 * Example row:
 *   position_id = 5
 *   column_name = "one_on_one_create"
 *   old_value   = "0"
 *   new_value   = "1"
 *   edited_by   = 12   (HR user id)
 *   edited_at   = 2026-05-15 22:00:00
 */
@Entity
@Table(name = "position_permission_audit")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionPermissionAudit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Integer id;

    @Column(name = "position_id", nullable = false)
    private Integer positionId;

    /**
     * Snapshot of the position title at time of edit.
     * Kept even if the title is later renamed.
     */
    @Column(name = "position_title_snapshot", length = 150)
    private String positionTitleSnapshot;

    /** The column that was changed, e.g. "one_on_one_create", "team_edit". */
    @Column(name = "column_name", nullable = false, length = 100)
    private String columnName;

    /** Previous value: "0", "1", or null (first-time assignment). */
    @Column(name = "old_value", length = 5)
    private String oldValue;

    /** New value: "0" or "1". */
    @Column(name = "new_value", nullable = false, length = 5)
    private String newValue;

    /** FK to users.id — the HR person who made the change. */
    @Column(name = "edited_by", nullable = false)
    private Integer editedBy;

    @Column(name = "edited_at", nullable = false)
    private LocalDateTime editedAt;

    @PrePersist
    public void prePersist() {
        if (editedAt == null) editedAt = LocalDateTime.now();
    }
}
