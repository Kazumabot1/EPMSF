package com.epms.service;

import com.epms.dto.FeedbackCampaignTargetsResponse;
import com.epms.dto.FeedbackTargetCandidateResponse;
import com.epms.entity.FeedbackRequest;

import java.util.List;

public interface FeedbackCampaignTargetService {
    List<FeedbackTargetCandidateResponse> searchTargetCandidates(
            String search,
            Integer currentDepartmentId,
            Integer parentDepartmentId,
            Integer teamId,
            String readiness,
            String levelCode,
            Long actorUserId
    );

    FeedbackCampaignTargetsResponse getCampaignTargets(Long campaignId);

    FeedbackCampaignTargetsResponse updateTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId);

    List<FeedbackRequest> replaceTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId);
}
