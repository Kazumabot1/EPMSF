package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiPositionAvailabilityDto {

    private boolean available;
    private Integer existingTemplateId;
    private String templateTitle;
    private String positionTitle;
}
