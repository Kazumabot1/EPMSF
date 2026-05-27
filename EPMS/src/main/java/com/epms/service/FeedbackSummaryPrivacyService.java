package com.epms.service;

import com.epms.dto.FeedbackIntegrationScoreResponse;
import com.epms.dto.FeedbackResultItemResponse;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

public interface FeedbackSummaryPrivacyService {

    boolean isSummaryReadyForPublish(FeedbackSummary summary);

    List<FeedbackResultItemResponse> mapResultItems(
            List<FeedbackSummary> summaries,
            Map<Long, String> employeeNames,
            boolean protectRelationshipBreakdown
    );

    FeedbackIntegrationScoreResponse mapIntegrationScore(
            FeedbackSummary summary,
            Map<Long, String> employeeNames
    );

    FeedbackSummaryVisibilityStatus campaignVisibilityStatus(List<FeedbackSummary> summaries);

    LocalDateTime campaignPublishedAt(List<FeedbackSummary> summaries);

    Long campaignPublishedByUserId(List<FeedbackSummary> summaries);

    String campaignPublishNote(List<FeedbackSummary> summaries);
}
