package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackRelationshipProgressResponse {
    String relationshipType;
    String label;
    Long total;
    Long submitted;
    Long pending;
    Long overdue;
    Double completionPercent;
}
