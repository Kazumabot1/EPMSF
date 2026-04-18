package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackFormCreateRequest {
    @NotBlank(message = "Form name cannot be blank")
    private String formName;

    @NotNull(message = "Anonymous allowed flag is required")
    private Boolean anonymousAllowed;

    @Valid
    private List<FeedbackSectionRequest> sections;
}
