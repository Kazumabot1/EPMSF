package com.epms.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FeedbackResponseItemRequest {

    @NotNull(message = "Question ID is required")
    private Long questionId;

    @NotNull(message = "Rating value is required")
    @DecimalMin(value = "1.0", message = "Rating must be at least 1")
    @DecimalMax(value = "5.0", message = "Rating must be at most 5")
    private Double ratingValue;

    private String comment;
}
