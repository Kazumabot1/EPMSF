package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.List;

@Value
@Builder
public class FeedbackCampaignScoringConfigResponse {
    Long campaignId;
    String campaignName;
    String campaignStatus;
    Boolean redistributeMissingRelationshipWeight;
    BigDecimal totalRelationshipWeight;
    Boolean relationshipWeightsReady;
    List<FeedbackRelationshipWeightResponse> relationshipWeights;
    List<String> warnings;
}
