package com.epms.service;

import com.epms.dto.FeedbackCampaignMonitoringDtos.EvaluatorWorkloadDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.FeedbackCampaignMonitoringResponse;
import com.epms.dto.FeedbackCampaignMonitoringDtos.MonitoringActivityItemDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.MonitoringAlertDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.MonitoringOverviewDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.RelationshipProgressDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.TargetHealthDto;

import java.util.List;

public interface FeedbackCampaignMonitoringService {
    FeedbackCampaignMonitoringResponse getMonitoring(Long campaignId);

    MonitoringOverviewDto getOverview(Long campaignId);

    List<RelationshipProgressDto> getRelationshipProgress(Long campaignId);

    List<TargetHealthDto> getTargetHealth(Long campaignId);

    List<EvaluatorWorkloadDto> getEvaluatorWorkload(Long campaignId);

    List<MonitoringAlertDto> getAlerts(Long campaignId);

    List<MonitoringActivityItemDto> getActivity(Long campaignId);

    String exportMonitoringCsv(Long campaignId, Long actorUserId);
}
