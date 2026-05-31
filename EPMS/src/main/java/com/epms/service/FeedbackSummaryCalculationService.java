package com.epms.service;

import com.epms.dto.FeedbackCompetencyAverageResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackSummary;

import java.util.List;

public interface FeedbackSummaryCalculationService {

    List<FeedbackSummary> refreshCampaignSummary(FeedbackCampaign campaign);

    List<FeedbackSummary> refreshCampaignSummaryForTargetEmployees(
            FeedbackCampaign campaign,
            List<Long> targetEmployeeIds
    );

    List<FeedbackCompetencyAverageResponse> buildCampaignCompetencyAverages(Long campaignId);
}
