package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackAssignmentStatusBreakdownResponse {
    Long submitted;
    Long inProgress;
    Long notStarted;
    Long overdue;
    Long declined;
    Long cancelled;
}
