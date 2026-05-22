package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class FeedbackQuestionRuleResponse {
    Long id;
    Long ruleSetId;
    String ruleSetName;
    String ruleSetDescription;
    String ruleSetStatus;
    String ruleSetType;
    Long questionBankId;
    Long activeVersionId;
    String questionCode;
    String competencyCode;
    String questionText;
    String responseType;
    String scoringBehavior;
    String questionStatus;
    Boolean effectiveActive;
    Integer targetLevelMinRank;
    Integer targetLevelMaxRank;
    Long targetPositionId;
    Long targetDepartmentId;
    String evaluatorRelationshipType;
    Integer displayOrder;
    Integer rulePriority;
    Boolean active;
    LocalDateTime updatedAt;
}
