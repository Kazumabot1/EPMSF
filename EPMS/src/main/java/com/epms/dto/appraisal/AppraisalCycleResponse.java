package com.epms.dto.appraisal;

import com.epms.entity.enums.AppraisalCycleStatus;
import com.epms.entity.enums.AppraisalCycleType;
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
public class AppraisalCycleResponse {
    private Integer id;
    private String cycleName;
    private String description;
    private Integer templateId;
    private String templateName;
    private AppraisalCycleType cycleType;
    private Integer cycleYear;
    private Integer periodNo;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDate submissionDeadline;
    private LocalDate managerSubmissionDeadline;
    private LocalDate deptHeadSubmissionDeadline;
    private AppraisalCycleStatus status;
    private Boolean locked;
    private List<Integer> departmentIds = new ArrayList<>();
    private List<String> departmentNames = new ArrayList<>();
    private Integer createdByUserId;
    private String createdByEmployeeId;
    private Date activatedAt;
    private Date completedAt;
    private Date createdAt;
}
