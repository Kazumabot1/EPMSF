package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackRelationshipScoreResponse {
    String relationshipType;
    String label;
    Double averageScore;
    Long responseCount;
    Boolean visibleOutsideHr;
    String hiddenReason;
}
