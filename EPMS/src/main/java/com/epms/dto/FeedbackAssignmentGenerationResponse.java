package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackAssignmentGenerationResponse {
    Long campaignId;
    int totalTargets;
    int totalEvaluatorsGenerated;
    EvaluatorConfigDTO evaluatorConfig;
    @Builder.Default
    List<FeedbackAssignmentPreviewItemResponse> requests = List.of();
    @Builder.Default
    List<FeedbackAssignmentDetailItemResponse> assignmentDetails = List.of();
    @Builder.Default
    List<String> warnings = List.of();
}
