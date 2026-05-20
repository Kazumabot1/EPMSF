package com.epms.dto.appraisal;

import com.epms.entity.enums.AppraisalCycleType;
import com.epms.entity.enums.EmployeeAppraisalStatus;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeAppraisalFormResponse {
    private Integer id;
    private Integer cycleId;
    private String cycleName;
    private AppraisalCycleType cycleType;
    private Integer cycleYear;
    private LocalDate cycleStartDate;
    private LocalDate cycleEndDate;
    private LocalDate cycleSubmissionDeadline;
    private LocalDate cycleManagerSubmissionDeadline;
    private LocalDate cycleDeptHeadSubmissionDeadline;
    private Boolean cycleLocked;
    private Integer employeeId;
    private String employeeName;
    private String employeeCode;
    private Integer departmentId;
    private String departmentName;
    private String positionName;
    private LocalDate assessmentDate;
    private LocalDate effectiveDate;
    private EmployeeAppraisalStatus status;
    private Integer totalPoints;
    private Integer answeredCriteriaCount;
    private Double scorePercent;
    private String performanceLabel;
    private Boolean visibleToEmployee;
    private Boolean locked;
    private Date pmSubmittedAt;
    private String managerCheckedByEmployeeId;
    private Date deptHeadSubmittedAt;
    private String deptHeadCheckedByEmployeeId;
    private Date hrApprovedAt;
    private String hrCheckedByEmployeeId;
    private List<AppraisalSectionResponse> sections = new ArrayList<>();
    private List<AppraisalReviewResponse> reviews = new ArrayList<>();
    private List<AppraisalScoreBandResponse> scoreBands = new ArrayList<>();
}
