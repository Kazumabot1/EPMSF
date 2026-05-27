package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackAssignmentQuestionDetailResponse {
    /**
     * Dynamic question snapshot ID. Kept as id for backward-compatible frontend routing/state,
     * but new clients should also send assignmentQuestionId in response payloads.
     */
    Long id;
    Long assignmentQuestionId;
    Long sourceQuestionId;
    String questionCode;
    String competencyCode;
    String responseType;
    String scoringBehavior;
    String helpText;
    String questionText;
    Integer questionOrder;
    Integer ratingScaleId;
    Integer ratingScaleMin;
    Integer ratingScaleMax;
    @Builder.Default
    List<FeedbackRatingOptionResponse> ratingOptions = List.of();
    Double weight;
    Boolean required;
    Integer minRequiredCommentLength;
    Integer maxCommentLength;
    Double existingRatingValue;
    String existingComment;
}
