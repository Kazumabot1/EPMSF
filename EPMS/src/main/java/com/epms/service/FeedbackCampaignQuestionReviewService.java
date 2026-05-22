package com.epms.service;

import com.epms.dto.FeedbackCampaignQuestionReviewResponse;
import com.epms.dto.FeedbackCampaignQuestionReviewSaveRequest;

public interface FeedbackCampaignQuestionReviewService {
    FeedbackCampaignQuestionReviewResponse getQuestionReview(Long campaignId);
    FeedbackCampaignQuestionReviewResponse resolveQuestionReview(Long campaignId);
    FeedbackCampaignQuestionReviewResponse saveQuestionReview(Long campaignId, FeedbackCampaignQuestionReviewSaveRequest request, Long actorUserId);
    void validateCampaignQuestionSelectionReady(Long campaignId);
    void clearCampaignQuestionSelection(Long campaignId);
}
