package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiPositionAssignmentDto {

    private Integer positionId;
    private String positionTitle;
    private Integer templateId;
    private String templateTitle;
}
