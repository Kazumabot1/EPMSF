package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackRelationshipPrivacyResponse {
    String relationshipType;
    String label;
    Long responseCount;
    Integer minimumVisibleResponses;
    Boolean thresholdRequired;
    Boolean thresholdMet;
    Boolean visibleOutsideHr;
    String hiddenReason;
}
