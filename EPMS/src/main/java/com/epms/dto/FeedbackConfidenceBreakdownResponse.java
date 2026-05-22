package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackConfidenceBreakdownResponse {
    String level;
    String label;
    Long count;
}
