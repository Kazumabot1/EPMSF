package com.epms.dto;

import jakarta.validation.constraints.Size;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackReminderRequest {
    /**
     * CAMPAIGN, TARGET, RELATIONSHIP, TARGET_RELATIONSHIP, EVALUATOR, or ASSIGNMENTS.
     * CAMPAIGN is equivalent to the existing campaign-wide reminder endpoint.
     */
    private String scope;

    private Long targetEmployeeId;

    private Long evaluatorEmployeeId;

    /** MANAGER, PEER, SUBORDINATE, or SELF. */
    private String relationshipType;

    @Size(max = 500, message = "A reminder request cannot include more than 500 assignments at once.")
    private List<Long> assignmentIds;

    /** When true, only pending/in-progress assignments that are past due are reminded. */
    private Boolean onlyOverdue;
}
