package com.epms.dto.report;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.awt.Image;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalReportDto {
    private String reportTitle;
    private String companyName;
    private String generatedAt;

    private String cycleName;
    private String cycleType;
    private String cycleYear;
    private String cycleStartDate;
    private String cycleEndDate;

    private String employeeName;
    private String employeeCode;
    private String departmentName;
    private String positionName;
    private String assessmentDate;
    private String effectiveDate;

    private String totalPoints;
    private String answeredCriteriaCount;
    private String scorePercent;
    private String performanceLabel;
    private String status;

    private String scoreBandsText;
    private List<AppraisalReportScoreBandRowDto> scoreBandRows = new ArrayList<>();
    private String otherRemarksText;
    private String managerReviewText;
    private String deptHeadReviewText;
    private String hrReviewText;

    private String appraiserSignatureCaption;
    private String deptHeadSignatureCaption;
    private String hrSignatureCaption;

    private Image managerSignatureImage;
    private Image deptHeadSignatureImage;
    private Image hrSignatureImage;

    private List<AppraisalReportCriteriaRowDto> criteriaRows = new ArrayList<>();
}
