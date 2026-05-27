package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackDynamicFormPreviewResponse {
    String levelCode;
    Integer levelRank;
    String relationshipType;
    Long targetPositionId;
    Long targetDepartmentId;
    Integer totalQuestions;
    @Builder.Default
    List<FeedbackAssignmentSectionDetailResponse> sections = List.of();
}
