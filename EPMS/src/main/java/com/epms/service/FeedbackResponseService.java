package com.epms.service;

import com.epms.dto.FeedbackSubmissionStatusResponse;
import com.epms.dto.FeedbackReceivedItemResponse;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;

import java.util.List;

public interface FeedbackResponseService {
    FeedbackResponse saveDraft(Long evaluatorAssignmentId, Long submittingEmployeeId, String comments, List<FeedbackResponseItem> items);
    FeedbackResponse submitResponse(Long evaluatorAssignmentId, Long submittingEmployeeId, String comments, List<FeedbackResponseItem> items);
    FeedbackResponse getResponse(Long responseId, Long requestingEmployeeId, List<String> requesterRoles);
    List<FeedbackSubmissionStatusResponse> getSubmissionStatuses(Long evaluatorEmployeeId);
    List<FeedbackReceivedItemResponse> getReceivedFeedback(Long targetEmployeeId, Long requestingEmployeeId, List<String> requesterRoles);
}
