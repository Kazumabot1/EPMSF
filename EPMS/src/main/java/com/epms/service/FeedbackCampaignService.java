package com.epms.service;

import com.epms.dto.FeedbackCampaignActivationReadinessResponse;
import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackCampaignCloseRequest;
import com.epms.dto.FeedbackCampaignMonitoringResponse;
import com.epms.dto.FeedbackCampaignTargetsResponse;
import com.epms.dto.FeedbackReminderRequest;
import com.epms.dto.FeedbackReminderResponse;
import com.epms.dto.FeedbackCampaignScoringConfigRequest;
import com.epms.dto.FeedbackCampaignScoringConfigResponse;
import com.epms.dto.FeedbackTargetCandidateResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackRequest;

import java.util.List;

public interface FeedbackCampaignService {
    FeedbackCampaign createCampaign(FeedbackCampaignCreateRequest request, Long createdByUserId);
    FeedbackCampaign updateDraftCampaign(Long campaignId, FeedbackCampaignCreateRequest request, Long actorUserId);
    FeedbackCampaign getCampaignById(Long campaignId);
    List<FeedbackCampaign> getAllCampaigns();
    List<FeedbackCampaign> getPendingEarlyCloseRequests();
    List<FeedbackRequest> getRequestsForCampaign(Long campaignId);
    List<FeedbackTargetCandidateResponse> searchTargetCandidates(String search, Integer currentDepartmentId, Integer parentDepartmentId, Integer teamId, String readiness, String levelCode, Long actorUserId);
    FeedbackCampaignTargetsResponse getCampaignTargets(Long campaignId);
    FeedbackCampaignTargetsResponse updateTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId);
    FeedbackCampaignScoringConfigResponse getScoringConfig(Long campaignId);
    FeedbackCampaignScoringConfigResponse updateScoringConfig(Long campaignId, FeedbackCampaignScoringConfigRequest request, Long actorUserId);
    List<FeedbackRequest> replaceTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId);
    FeedbackCampaignActivationReadinessResponse getActivationReadiness(Long campaignId);
    FeedbackCampaign markReadyToActivate(Long campaignId, Long actorUserId);
    FeedbackCampaignMonitoringResponse getCampaignMonitoring(Long campaignId);
    FeedbackCampaign activateCampaign(Long campaignId, Long actorUserId);
    FeedbackCampaign requestEarlyClose(Long campaignId, Long actorUserId, String reason);
    FeedbackCampaign approveEarlyClose(Long campaignId, Long actorUserId, String reviewNote);
    FeedbackCampaign rejectEarlyClose(Long campaignId, Long actorUserId, String reviewNote);
    FeedbackCampaign closeCampaign(Long campaignId, Long actorUserId);
    FeedbackCampaign closeCampaignWithReadiness(Long campaignId, FeedbackCampaignCloseRequest request, Long actorUserId);
    FeedbackCampaign publishCampaign(Long campaignId, Long actorUserId);
    int closeExpiredCampaigns();
    void deleteDraftCampaign(Long campaignId, Long actorUserId);
    long countAssignments(Long campaignId);
    FeedbackReminderResponse sendPendingEvaluatorReminders(Long campaignId, Long actorUserId);
    FeedbackReminderResponse sendScopedEvaluatorReminders(Long campaignId, FeedbackReminderRequest request, Long actorUserId);
}
