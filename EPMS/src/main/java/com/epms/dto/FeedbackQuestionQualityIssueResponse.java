package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackQuestionQualityIssueResponse {
    String severity;
    String code;
    String message;
}
