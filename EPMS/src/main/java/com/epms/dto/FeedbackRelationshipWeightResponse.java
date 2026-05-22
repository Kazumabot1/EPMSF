package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class FeedbackRelationshipWeightResponse {
    String relationshipType;
    String label;
    BigDecimal weightPercent;
    Integer assignmentCount;
    Integer targetCountWithRole;
    Boolean currentlyAvailable;
}
