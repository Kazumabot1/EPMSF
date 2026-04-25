package com.epms.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class TeamFeedbackSummaryResponse {
    private Long targetEmployeeId;
    private Double averageScore;
    private Long totalResponses;
    private Long pendingEvaluations;
}
