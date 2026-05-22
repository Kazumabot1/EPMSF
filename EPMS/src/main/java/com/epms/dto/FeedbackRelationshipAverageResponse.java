package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackRelationshipAverageResponse {
    String relationshipType;
    String label;
    Double averageScore;
    Long responseCount;
}
