package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackQuestionQualityValidationResponse {
    Boolean canSave;
    Boolean canActivate;
    Integer qualityScore;
    List<FeedbackQuestionQualityIssueResponse> issues;
}
