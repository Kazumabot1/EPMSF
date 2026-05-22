package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackScoreDistributionResponse {
    String band;
    String label;
    Integer minScore;
    Integer maxScore;
    Long count;
}
