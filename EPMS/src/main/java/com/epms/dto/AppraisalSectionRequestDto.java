package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalSectionRequestDto {

    @NotNull(message = "Form ID must not be null")
    private Long formId;

    @NotBlank(message = "Title must not be blank")
    private String title;

    @NotNull(message = "Order number must not be null")
    private Integer orderNo;
}
