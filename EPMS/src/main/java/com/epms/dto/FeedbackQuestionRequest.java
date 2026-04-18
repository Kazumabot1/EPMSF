package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class FeedbackQuestionRequest {
    @NotBlank(message = "Question text cannot be blank")
    private String questionText;

    @NotNull(message = "Question order is required")
    private Integer questionOrder;

    @NotNull(message = "Rating scale ID is required")
    private Long ratingScaleId;

    @NotNull(message = "Weight is required")
    private Double weight;

    @NotNull(message = "Is required flag is required")
    private Boolean isRequired;
}
