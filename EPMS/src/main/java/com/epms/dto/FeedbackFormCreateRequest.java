package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.util.List;

@Data
public class FeedbackFormCreateRequest {
    
    @NotBlank(message = "Form name is required")
    private String formName;
    
    @NotNull(message = "Anonymous allowed flag is required")
    private Boolean anonymousAllowed;
    
    @NotEmpty(message = "At least one section must be provided")
    @Valid
    private List<FeedbackSectionRequest> sections;
}
