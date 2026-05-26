package com.epms.dto.appraisal;

import com.epms.entity.enums.AppraisalCycleType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalCycleRequest {
    private String cycleName;
    private String description;
    private Integer templateId;
    private AppraisalCycleType cycleType;
    private Integer cycleYear;
    private Integer periodNo;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate submissionDeadline;
    private LocalDate managerSubmissionDeadline;
    private LocalDate deptHeadSubmissionDeadline;
    private List<Integer> departmentIds = new ArrayList<>();
    private String editReason;
    private String templateChangeSummary;
}
