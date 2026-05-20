package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

/** One row in the permission audit history table. */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionPermissionAuditDto {

    private Integer id;
    private Integer positionId;
    private String  positionTitleSnapshot;
    /** Which permission column was changed, e.g. "one_on_one_create". */
    private String  columnName;
    /** Previous value: "0", "1", or null for first-time set. */
    private String  oldValue;
    /** New value: "0" or "1". */
    private String  newValue;
    private Integer editedBy;
    /** Full name of the HR person who made the change. */
    private String  editedByName;
    private LocalDateTime editedAt;
}
