package com.epms.service;

import com.epms.entity.FeedbackRequest;
import com.epms.repository.projection.FeedbackSummaryProjection;

import java.util.List;

public interface FeedbackRequestService {
    FeedbackRequest createFeedbackRequest(Long formId, Long targetEmployeeId, Long requestedByUserId, Long cycleId, java.time.LocalDateTime dueAt, boolean isAnonymousEnabled);
    FeedbackSummaryProjection getFeedbackSummary(Long requestId);
    List<FeedbackRequest> getRequestsForEmployee(Long employeeId);
}
