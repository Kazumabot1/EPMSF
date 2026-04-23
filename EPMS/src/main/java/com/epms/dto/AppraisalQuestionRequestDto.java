package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalQuestionRequestDto {

    @NotNull(message = "Section ID must not be null")
    private Long sectionId;

    @NotBlank(message = "Question text must not be blank")
    private String questionText;

    @NotBlank(message = "Response type must not be blank")
    private String responseType;

    private Boolean isRequired = true;
    private Double weight = 1.0;
    private Long ratingScaleId;
}
