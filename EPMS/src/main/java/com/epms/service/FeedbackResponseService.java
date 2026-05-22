package com.epms.service;

import com.epms.dto.FeedbackSubmissionStatusResponse;
import com.epms.dto.FeedbackReceivedItemResponse;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;

import java.util.List;

public interface FeedbackResponseService {
    FeedbackResponse saveDraft(Long evaluatorAssignmentId, Long submittingUserId, String comments, String assessmentDateText, String effectiveDateText, List<FeedbackResponseItem> items);
    FeedbackResponse submitResponse(Long evaluatorAssignmentId, Long submittingUserId, String comments, String assessmentDateText, String effectiveDateText, List<FeedbackResponseItem> items);
    FeedbackResponse getResponse(Long responseId, Long requestingUserId, List<String> requesterRoles);
    List<FeedbackSubmissionStatusResponse> getSubmissionStatuses(Long evaluatorUserId);
    List<FeedbackReceivedItemResponse> getReceivedFeedback(Long targetEmployeeId, Long requestingUserId, List<String> requesterRoles);
}
