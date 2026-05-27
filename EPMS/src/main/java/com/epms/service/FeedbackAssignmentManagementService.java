package com.epms.service;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentDetailItemResponse;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackManualAssignmentRequest;
import com.epms.entity.FeedbackEvaluatorAssignment;

import java.util.List;

public interface FeedbackAssignmentManagementService {
    FeedbackAssignmentGenerationResponse getAssignmentPreview(Long campaignId);

    FeedbackAssignmentGenerationResponse addManualAssignment(
            Long campaignId,
            FeedbackManualAssignmentRequest request,
            Long actorUserId
    );

    FeedbackAssignmentGenerationResponse removeAssignment(
            Long campaignId,
            Long assignmentId,
            Long actorUserId
    );

    FeedbackAssignmentGenerationResponse buildAssignmentResponse(
            Long campaignId,
            EvaluatorConfigDTO config,
            List<String> extraWarnings
    );

    List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(Long campaignId);

    List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(List<FeedbackEvaluatorAssignment> assignments);
}
