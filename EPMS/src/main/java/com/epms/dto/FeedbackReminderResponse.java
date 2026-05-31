package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class FeedbackReminderResponse {
    private Long campaignId;
    private String campaignName;
    private int pendingAssignmentCount;
    private int notifiedEvaluatorCount;
    private int skippedAssignmentCount;
    private int notifiedUserCount;
    private String reminderScope;
    private Long targetEmployeeId;
    private Long evaluatorEmployeeId;
    private String relationshipType;
    private List<Long> assignmentIds;
    private Boolean onlyOverdue;
    private List<String> warnings;
}
