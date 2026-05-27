package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackAssignmentSectionDetailResponse {
    Long id;
    String sectionCode;
    String title;
    Integer orderNo;
    @Builder.Default
    List<FeedbackAssignmentQuestionDetailResponse> questions = List.of();
}
