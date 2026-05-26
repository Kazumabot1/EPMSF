package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
public class FeedbackCampaignResponse {
    Long id;
    String name;
    String campaignType;
    Integer reviewYear;
    LocalDate startDate;
    LocalDate endDate;
    LocalDateTime startAt;
    LocalDateTime endAt;
    String description;
    String instructions;
    String status;
    Long formId;
    Boolean autoSubmitCompletedDraftsOnClose;
    Boolean managerFeedbackAnonymous;
    Boolean peerFeedbackAnonymous;
    Boolean subordinateFeedbackAnonymous;
    Boolean selfFeedbackAnonymous;
    Boolean redistributeMissingRelationshipWeight;
    String earlyCloseRequestStatus;
    LocalDateTime earlyCloseRequestedAt;
    Long earlyCloseRequestedByUserId;
    String earlyCloseRequestReason;
    LocalDateTime earlyCloseReviewedAt;
    Long earlyCloseReviewedByUserId;
    String earlyCloseReviewReason;
    LocalDateTime closedAt;
    Long closedByUserId;
    String closeReason;
    Boolean closedEarly;
    Long createdBy;
    LocalDateTime createdAt;
    int targetCount;
    int assignmentCount;
    List<Long> targetEmployeeIds;
}
