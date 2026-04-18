package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OneOnOneMeetingRequestDto {

    @NotNull(message = "Manager ID must not be null")
    private Integer managerId;
    @NotNull(message = "Employee ID must not be null")
    private Integer employeeId;
    private Date scheduledDate;
    private String notes;
    private String status;
    private Date followUpDate;
    private Boolean isFinalized;
}
