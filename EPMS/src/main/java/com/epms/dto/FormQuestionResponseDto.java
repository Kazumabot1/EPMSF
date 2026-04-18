package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormQuestionResponseDto {

    private Long questionId;
    private String questionText;
    private String responseType;
    private Boolean isRequired;
}

