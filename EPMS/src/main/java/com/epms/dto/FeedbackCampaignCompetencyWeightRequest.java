package com.epms.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignCompetencyWeightRequest {
    @NotBlank(message = "Competency code is required")
    private String competencyCode;

    @NotNull(message = "Competency weight is required")
    @DecimalMin(value = "0.00", message = "Competency weight cannot be negative")
    @DecimalMax(value = "100.00", message = "Competency weight cannot exceed 100%")
    private Double weightPercent;
}
