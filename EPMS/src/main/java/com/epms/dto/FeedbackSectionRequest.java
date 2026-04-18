package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackSectionRequest {
    @NotBlank(message = "Section title cannot be blank")
    private String title;

    @NotNull(message = "Order number is required")
    private Integer orderNo;

    @Valid
    private List<FeedbackQuestionRequest> questions;
}
