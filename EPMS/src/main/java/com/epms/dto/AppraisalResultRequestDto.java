package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalResultRequestDto {

    @NotNull(message = "Employee ID must not be null")
    private Integer employeeId;

    @NotNull(message = "Cycle ID must not be null")
    private Integer cycleId;

    private Double selfScore;
    private Double managerScore;
    private String performanceCategory;
    private String status; // DRAFT, SUBMITTED, REVIEWED, LOCKED
    private String selfComment;
    private String managerComment;
}

