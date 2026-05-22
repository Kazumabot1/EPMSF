package com.epms.dto;

import com.epms.entity.enums.FeedbackRelationshipType;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class FeedbackCampaignRelationshipWeightRequest {
    @NotNull(message = "Relationship type is required.")
    private FeedbackRelationshipType relationshipType;

    @NotNull(message = "Relationship weight is required.")
    @DecimalMin(value = "0.00", message = "Relationship weight cannot be negative.")
    @DecimalMax(value = "100.00", message = "Relationship weight cannot exceed 100%.")
    private BigDecimal weightPercent;
}
