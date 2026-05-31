package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackPublishedCommentResponse {
    String relationshipType;
    String label;
    String competencyCode;
    String competencyName;
    String questionCode;
    String questionText;
    String comment;
}
