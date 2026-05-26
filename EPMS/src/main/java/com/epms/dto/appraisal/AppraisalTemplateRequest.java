package com.epms.dto.appraisal;

import com.epms.entity.enums.AppraisalCycleType;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalTemplateRequest {
    private String templateName;
    private String description;
    private Long appraiseeSignatureId;
    private Long appraiserSignatureId;
    private Long hrSignatureId;
    private String signatureDateFormat;
    private AppraisalCycleType formType;
    private Boolean targetAllDepartments = false;
    private List<Integer> departmentIds = new ArrayList<>();
    private List<AppraisalSectionRequest> sections = new ArrayList<>();
    private List<AppraisalScoreBandRequest> scoreBands = new ArrayList<>();
    private Boolean cycleSpecificCopy = false;
    private String editReason;
}
