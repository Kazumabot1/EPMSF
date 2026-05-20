package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class PositionRequestDto {
    private String positionTitle;
    private Integer levelId;
    private Integer roleId;
    private String description;
    private Boolean status;
    private String createdBy;
    private String reason;
}