package com.epms.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackQuestionRuleUpsertRequest {

    /** User-facing Rule Set name. If blank, backend generates a descriptive name. */
    private String ruleSetName;

    /** Optional HR-facing purpose/notes for the Rule Set. */
    private String ruleSetDescription;

    /** DRAFT, ACTIVE, DISABLED, or ARCHIVED. If omitted, active decides the status. */
    private String ruleSetStatus;

    /** Backward-compatible single-question field. */
    private Long questionBankId;

    /** Preferred rule-set field. Backend creates one internal rule row per selected question and role. */
    private List<Long> questionBankIds;

    @Min(value = 1, message = "Minimum level rank must be between 1 and 9")
    @Max(value = 9, message = "Minimum level rank must be between 1 and 9")
    private Integer targetLevelMinRank = 1;

    @Min(value = 1, message = "Maximum level rank must be between 1 and 9")
    @Max(value = 9, message = "Maximum level rank must be between 1 and 9")
    private Integer targetLevelMaxRank = 9;

    private Long targetPositionId;

    private Long targetDepartmentId;

    /** Backward-compatible single-role field. */
    private String evaluatorRelationshipType;

    /** Preferred multi-role field. Use ALL to create one row per supported evaluator role. */
    private List<String> evaluatorRelationshipTypes;

    private Integer displayOrder = 1;

    private Integer rulePriority = 100;

    private Boolean active = true;
}
