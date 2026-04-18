package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FeedbackResponseItemRequest {

    @NotNull(message = "Question ID is required")
    private Long questionId;

    @NotNull(message = "Rating value is required")
    private Double ratingValue;

    private String comment;
}
