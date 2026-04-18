package com.epms.service;

import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;

import java.util.List;

public interface FeedbackResponseService {
    FeedbackResponse submitResponse(Long evaluatorAssignmentId, Long submittingEmployeeId, Double overallScore, String comments, List<FeedbackResponseItem> items);
    FeedbackResponse getResponse(Long responseId, Long requestingEmployeeId);
}
