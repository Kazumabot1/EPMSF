package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@AllArgsConstructor
@NoArgsConstructor
public class PositionResponseDto {
    private Integer id;
    private String positionTitle;
    private Integer levelId;
    private String levelCode;
    private Integer roleId;
    private String roleName;
    private String description;
    private Boolean status;
    private LocalDateTime createdAt;
    private String createdBy;

    /*
     * Backward-compatible constructor for older KPI code.
     * KpiFormServiceImpl still calls:
     * new PositionResponseDto(id, title, levelId, levelCode, description, status, createdAt, createdBy)
     */
    public PositionResponseDto(
            Integer id,
            String positionTitle,
            Integer levelId,
            String levelCode,
            String description,
            Boolean status,
            LocalDateTime createdAt,
            String createdBy
    ) {
        this.id = id;
        this.positionTitle = positionTitle;
        this.levelId = levelId;
        this.levelCode = levelCode;
        this.roleId = null;
        this.roleName = null;
        this.description = description;
        this.status = status;
        this.createdAt = createdAt;
        this.createdBy = createdBy;
    }
}