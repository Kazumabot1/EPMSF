package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignQuestionReviewSaveRequest {
    @Valid
    @NotEmpty(message = "Question selections are required")
    private List<FeedbackCampaignQuestionSelectionRequest> selections;

    @Valid
    private List<FeedbackCampaignCompetencyWeightRequest> competencyWeights;
}
