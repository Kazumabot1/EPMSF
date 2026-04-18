package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class FeedbackRequestCreateDTO {
    @NotNull(message = "Form ID is required")
    private Long formId;

    @NotNull(message = "Cycle ID is required")
    private Long cycleId;

    @NotNull(message = "Target employee ID is required")
    private Long targetEmployeeId;

    @NotNull(message = "Due date is required")
    private LocalDateTime dueAt;

    private Boolean includeManager = true;
    private Boolean includePeers = true;
    private Boolean includeSubordinates = true;
}
