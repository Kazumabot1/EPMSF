package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackCompetencyAverageResponse {
    String competencyCode;
    String competencyName;
    Double averageScore;
    Long responseCount;
    Long questionCount;
}
