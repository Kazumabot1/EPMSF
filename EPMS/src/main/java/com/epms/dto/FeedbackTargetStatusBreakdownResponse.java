package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackTargetStatusBreakdownResponse {
    Long completed;
    Long pending;
    Long overdue;
    Long noAssignments;
}
