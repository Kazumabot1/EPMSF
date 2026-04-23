package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalRequestDto {

    @NotNull(message = "Employee ID must not be null")
    private Integer employeeId;

    @NotNull(message = "Cycle ID must not be null")
    private Integer cycleId;

    private Long formId;

    private String appraisalStatus;
}
