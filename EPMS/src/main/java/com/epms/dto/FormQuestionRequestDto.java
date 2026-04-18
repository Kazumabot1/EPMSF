package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FormQuestionRequestDto {

    @NotBlank(message = "Question text must not be blank")
    private String questionText;

    @NotBlank(message = "Response type must not be blank")
    private String responseType; // rating, text, yes/no

    private Boolean isRequired;
}

