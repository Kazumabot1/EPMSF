package com.epms.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalReportCriteriaRowDto {
    private String sectionName;
    private String criteriaNumber;
    private String criteriaText;
    private String rating5;
    private String rating4;
    private String rating3;
    private String rating2;
    private String rating1;
    private String ratingComment;
}
