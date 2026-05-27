package com.epms.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalReportScoreBandRowDto {
    private String score;
    private String label;
    private String description;
}
