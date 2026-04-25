package com.epms.service;

import com.epms.dto.ConsolidatedFeedbackReportResponse;
import com.epms.dto.FeedbackCompletionDashboardResponse;
import com.epms.entity.FeedbackRequest;
import com.epms.repository.projection.FeedbackSummaryProjection;

import java.time.LocalDateTime;
import java.util.List;

public interface FeedbackRequestService {
    FeedbackRequest createFeedbackRequest(Long formId, Long campaignId, Long targetEmployeeId, Long requestedByUserId,
                                          java.time.LocalDateTime dueAt, boolean isAnonymousEnabled,
                                          java.util.List<com.epms.entity.enums.EvaluatorSourceType> evaluatorTypes);
    FeedbackSummaryProjection getFeedbackSummary(Long requestId);
    List<FeedbackRequest> getRequestsForEmployee(Long employeeId);
    FeedbackRequest updateDeadline(Long requestId, LocalDateTime dueAt);
    int sendReminderNotifications(Long requestId);
    FeedbackCompletionDashboardResponse getCompletionDashboard(Long campaignId);
    ConsolidatedFeedbackReportResponse getConsolidatedReport(Long campaignId);
}
