package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackResponseSubmitRequest {

    @NotNull(message = "Evaluator Assignment ID is required")
    private Long evaluatorAssignmentId;

    @NotEmpty(message = "At least one response item is required")
    @Valid
    private List<FeedbackResponseItemRequest> responses;

    private String comments;
}
