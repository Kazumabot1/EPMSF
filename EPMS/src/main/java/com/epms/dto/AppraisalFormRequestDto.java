package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalFormRequestDto {

    @NotBlank(message = "Form name must not be blank")
    private String formName;

    private String description;
}
