package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignKpiEvaluatorRequest {

    @NotNull
    private Integer evaluatorUserId;

    private String reason;
}
