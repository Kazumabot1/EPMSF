package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackQuestionBankReadinessResponse {
    Boolean ready;
    Integer qualityScore;
    Integer activeQuestionCount;
    Integer draftQuestionCount;
    Integer activeCompetencyCount;
    Double totalActiveCompetencyWeight;
    List<FeedbackQuestionQualityIssueResponse> issues;
}
