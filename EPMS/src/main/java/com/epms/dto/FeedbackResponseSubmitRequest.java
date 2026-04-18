package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackResponseSubmitRequest {
    @NotNull(message = "Evaluator assignment ID is required")
    private Long evaluatorAssignmentId;

    @Valid
    private List<FeedbackResponseItemRequest> responses;

    private String comments;
}
