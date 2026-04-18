package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalAnswerRequestDto {

    @NotNull(message = "Review ID must not be null")
    private Integer reviewId;

    @NotNull(message = "Question ID must not be null")
    private Long questionId;

    private String answerText;
    private Double ratingValue;
    private Boolean yesNoValue;
}

