package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class FeedbackCompetencyResponse {
    Long id;
    String code;
    String name;
    String description;
    String category;
    Integer displayOrder;
    String status;
    Long questionCount;
    Long activeQuestionCount;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
