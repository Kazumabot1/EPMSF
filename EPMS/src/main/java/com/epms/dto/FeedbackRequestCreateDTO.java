package com.epms.dto;

import com.epms.entity.enums.EvaluatorSourceType;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.time.LocalDateTime;
import java.util.List;

@Data
public class FeedbackRequestCreateDTO {

    @NotNull(message = "Form ID is required")
    private Long formId;

    @NotNull(message = "Campaign ID is required")
    private Long campaignId;

    @NotNull(message = "Target Employee ID is required")
    private Long targetEmployeeId;

    @Future(message = "Due date must be in the future")
    private LocalDateTime dueAt;

    @NotEmpty(message = "At least one evaluator type is required")
    private List<EvaluatorSourceType> evaluatorTypes;

    private Boolean anonymousEnabled = true;
}
