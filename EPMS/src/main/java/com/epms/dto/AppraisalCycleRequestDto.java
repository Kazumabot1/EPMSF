package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalCycleRequestDto {

    @NotBlank(message = "Name must not be blank")
    private String name;

    @NotBlank(message = "Type must not be blank")
    private String type; // SEMI_ANNUAL, ANNUAL, CUSTOM

    private Date startDate;
    private Date endDate;
    private String status; // DRAFT, ACTIVE, COMPLETED, LOCKED

    private String dynamicType; // FIXED, JOIN_DATE_BASED
    private Integer dynamicOffsetMonths;
}
