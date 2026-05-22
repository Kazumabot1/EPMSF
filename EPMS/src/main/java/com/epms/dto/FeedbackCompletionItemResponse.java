package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FeedbackCompletionItemResponse {
    private Long requestId;
    private Long targetEmployeeId;
    private String targetEmployeeName;
    private String targetEmployeeEmail;
    private String requestStatus;
    private LocalDateTime dueAt;
    private LocalDateTime effectiveDeadline;

    private Long totalEvaluators;
    private Long submittedEvaluators;
    private Long pendingEvaluators;
    private Long inProgressEvaluators;
    private Long notStartedEvaluators;
    private Long overdueEvaluators;
    private Long declinedEvaluators;
    private Long cancelledEvaluators;

    private Long managerEvaluators;
    private Long peerEvaluators;
    private Long subordinateEvaluators;
    private Long selfEvaluators;

    private Double completionPercent;
    private Double averageScore;
    private String scoreCategory;
    private String statusLabel;
    private String actionNeeded;
}
