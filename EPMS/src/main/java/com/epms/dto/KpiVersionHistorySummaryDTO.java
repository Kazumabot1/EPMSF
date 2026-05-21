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
public class KpiVersionHistorySummaryDTO {

    private Integer templateId;
    private String templateTitle;
    private Integer versionNumber;
    private String versionTitle;
    private String positionName;
    private LocalDateTime createdAt;
    private LocalDateTime editedAt;
    private String editedBy;
    private Integer changeCount;
}
