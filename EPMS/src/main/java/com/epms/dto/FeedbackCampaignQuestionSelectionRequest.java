package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignQuestionSelectionRequest {
    private Long selectionId;

    @NotBlank(message = "Relationship type is required")
    private String relationshipType;

    @NotBlank(message = "Target level is required")
    private String targetLevelCode;

    @NotBlank(message = "Question code is required")
    private String questionCode;

    private Boolean included;
    private Boolean required;
    private Integer sectionOrder;
    private Integer displayOrder;
    private Double weight;
}
