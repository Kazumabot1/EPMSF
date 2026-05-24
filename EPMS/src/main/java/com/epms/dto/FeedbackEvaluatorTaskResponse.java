package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class FeedbackEvaluatorTaskResponse {
    Long assignmentId;
    Long campaignId;
    String campaignName;
    String campaignStatus;
    LocalDateTime campaignStartAt;
    Long targetEmployeeId;
    String targetEmployeeName;
    String relationshipType;
    Boolean anonymous;
    String status;
    Boolean canSubmit;
    String lifecycleMessage;
    Boolean autoSubmitCompletedDraftsOnClose;
    String autoSubmitNotice;
    LocalDateTime dueAt;
    LocalDateTime submittedAt;
    Integer totalQuestionCount;
    Integer requiredQuestionCount;
    Integer answeredQuestionCount;
    Integer answeredRequiredQuestionCount;
    Integer completionPercent;
    Boolean finalSubmissionReady;
}

