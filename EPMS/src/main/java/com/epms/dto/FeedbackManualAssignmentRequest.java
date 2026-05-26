package com.epms.dto;

import com.epms.entity.enums.FeedbackRelationshipType;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FeedbackManualAssignmentRequest {

    @NotNull(message = "Target employee is required.")
    private Long targetEmployeeId;

    @NotNull(message = "Evaluator employee is required.")
    private Long evaluatorEmployeeId;

    @NotNull(message = "Relationship type is required.")
    private FeedbackRelationshipType relationshipType;

    /**
     * Optional HR override. When omitted, anonymity is derived from relationship type.
     */
    private Boolean anonymous;

    /** Required in the new campaign wizard so manual overrides remain auditable. */
    private String reason;
}
