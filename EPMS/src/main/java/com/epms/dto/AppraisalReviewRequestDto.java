package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalReviewRequestDto {

    @NotNull(message = "Appraisal ID must not be null")
    private Integer appraisalId;

    @NotNull(message = "Reviewer Employee ID must not be null")
    private Integer reviewerEmployeeId;

    @NotNull(message = "Review Type must not be null")
    private String reviewType; // self, manager, peer

    private String reviewStatus; // pending, submitted
    private Double totalScore;

    private String comments;
}
