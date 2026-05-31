package com.epms.service;

import com.epms.entity.FeedbackCampaign;

public interface FeedbackCampaignLifecycleService {
    FeedbackCampaign markReadyToActivate(Long campaignId, Long actorUserId);
    FeedbackCampaign activateCampaign(Long campaignId, Long actorUserId);
    FeedbackCampaign requestEarlyClose(Long campaignId, Long actorUserId, String reason);
    FeedbackCampaign approveEarlyClose(Long campaignId, Long actorUserId, String reviewNote);
    FeedbackCampaign rejectEarlyClose(Long campaignId, Long actorUserId, String reviewNote);
    FeedbackCampaign closeCampaign(Long campaignId, Long actorUserId);
    FeedbackCampaign closeCampaignWithReadiness(Long campaignId, Long actorUserId, String reason, boolean closeWithWarnings);
    int closeExpiredCampaigns();
}
