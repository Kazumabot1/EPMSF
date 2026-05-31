package com.epms.service;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackManualAssignmentRequest;
import com.epms.dto.FeedbackRelationshipCandidateResponse;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.repository.projection.PendingEvaluatorProjection;

import java.util.List;

public interface FeedbackEvaluationService {
    FeedbackAssignmentGenerationResponse generateAssignments(Long campaignId, EvaluatorConfigDTO config, Long actorUserId);
    FeedbackAssignmentGenerationResponse previewAssignments(Long campaignId, EvaluatorConfigDTO config);
    FeedbackAssignmentGenerationResponse getAssignmentPreview(Long campaignId);
    FeedbackAssignmentGenerationResponse addManualAssignment(Long campaignId, FeedbackManualAssignmentRequest request, Long actorUserId);
    FeedbackAssignmentGenerationResponse removeAssignment(Long campaignId, Long assignmentId, Long actorUserId);
    List<FeedbackRelationshipCandidateResponse> getRelationshipCandidates(Long campaignId, Long targetEmployeeId, FeedbackRelationshipType relationshipType);
    List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId);
}
