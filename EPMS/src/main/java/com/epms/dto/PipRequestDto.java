package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipRequestDto {

    @NotNull(message = "Employee ID must not be null")
    private Integer employeeId;
    @NotNull(message = "Created by must not be null")
    private Integer createdBy;
    @NotBlank(message = "Title must not be blank")
    private String title;
    private String objectives;
    private String expectedOutcomes;
    private Date reviewDate;
    private String status;
    private Date startDate;
    private Date endDate;
    private Boolean isAcknowledged;
}
