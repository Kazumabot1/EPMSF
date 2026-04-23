package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalReviewResponseDto {

    private Integer id;
    private Integer appraisalId;
    private Integer reviewerEmployeeId;
    private String reviewType;
    private String reviewStatus;
    private Double totalScore;

    private String comments;
}
