package com.epms.service;

import com.epms.dto.FeedbackCampaignActivationReadinessResponse;
import com.epms.entity.FeedbackCampaign;

public interface FeedbackCampaignReadinessService {
    FeedbackCampaignActivationReadinessResponse getActivationReadiness(Long campaignId);
    FeedbackCampaignActivationReadinessResponse buildActivationReadiness(FeedbackCampaign campaign);
}
