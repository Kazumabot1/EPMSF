package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RecommendationResponseDto {

    private Integer id;
    private Integer appraisalId;
    private Integer recommendedByEmployeeId;
    private String recommendationType;
    private String recommendedValue;
    private String approvalStatus;
    private Integer approvedByEmployeeId;
}

