package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PositionPermissionAuditDto {
    private Long id;
    private Integer positionId;
    private String positionTitleSnapshot;
    private String columnName;
    private String oldValue;
    private String newValue;
    private Integer editedBy;
    private String editedByName;
    private LocalDateTime editedAt;
}