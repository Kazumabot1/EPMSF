package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalAnswerResponseDto {

    private Integer id;
    private Integer reviewId;
    private Long questionId;
    private String answerText;
    private Double ratingValue;
    private Boolean yesNoValue;
    private Double weightedScore;
}

