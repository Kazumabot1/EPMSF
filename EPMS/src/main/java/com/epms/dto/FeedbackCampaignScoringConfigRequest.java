package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

import java.util.ArrayList;
import java.util.List;

@Data
public class FeedbackCampaignScoringConfigRequest {
    /**
     * When true, if a target has no submitted feedback for a weighted relationship,
     * that relationship's weight is redistributed across the target's available relationships.
     */
    private Boolean redistributeMissingRelationshipWeight = true;

    @Valid
    @NotEmpty(message = "Relationship weights are required.")
    private List<FeedbackCampaignRelationshipWeightRequest> relationshipWeights = new ArrayList<>();
}
