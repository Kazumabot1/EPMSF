package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationRequestDto {

    @NotNull(message = "Appraisal ID must not be null")
    private Integer appraisalId;

    @NotNull(message = "Recommended by Employee ID must not be null")
    private Integer recommendedByEmployeeId;

    @NotNull(message = "Recommendation type must not be blank")
    private String recommendationType; // promotion, increment

    private String recommendedValue;
    private String approvalStatus;
}

