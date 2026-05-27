package com.epms.service;

import com.epms.dto.FeedbackCampaignScoringConfigRequest;
import com.epms.dto.FeedbackCampaignScoringConfigResponse;
import com.epms.entity.FeedbackCampaign;

public interface FeedbackCampaignScoringConfigService {
    FeedbackCampaignScoringConfigResponse getScoringConfig(Long campaignId);

    FeedbackCampaignScoringConfigResponse updateScoringConfig(Long campaignId, FeedbackCampaignScoringConfigRequest request, Long actorUserId);

    void ensureDefaultRelationshipWeights(FeedbackCampaign campaign);
}
