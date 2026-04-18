package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackSectionRequest {

    @NotBlank(message = "Section title is required")
    private String title;

    @NotNull(message = "Order number is required")
    private Integer orderNo;

    @NotEmpty(message = "At least one question is required")
    @Valid
    private List<FeedbackQuestionRequest> questions;
}
