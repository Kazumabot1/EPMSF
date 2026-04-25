package com.epms.service;

import com.epms.entity.FeedbackCampaign;

import java.util.List;

public interface FeedbackCampaignService {
    FeedbackCampaign createCampaign(String name, java.time.LocalDate startDate, java.time.LocalDate endDate, String status, Long createdByUserId);
    FeedbackCampaign updateCampaign(Long campaignId, String name, java.time.LocalDate startDate, java.time.LocalDate endDate, String status);
    FeedbackCampaign getCampaignById(Long campaignId);
    List<FeedbackCampaign> getAllCampaigns();
}
