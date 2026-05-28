package com.epms.service;

import com.epms.dto.FeedbackCampaignCompetencyWeightRequest;
import com.epms.dto.FeedbackCampaignQuestionReviewResponse;
import com.epms.dto.FeedbackCampaignQuestionSelectionRequest;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignQuestionSelection;
import com.epms.entity.FeedbackQuestionVersion;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.service.FeedbackCampaignQuestionSelectionService.CompetencyWeightDraft;
import com.epms.service.FeedbackCampaignQuestionSelectionService.QuestionSelectionDraft;

import java.util.List;
import java.util.Map;

public interface FeedbackCampaignQuestionReviewBuilderService {

    FeedbackCampaignQuestionReviewResponse buildResolvedReview(FeedbackCampaign campaign, boolean saved);

    FeedbackCampaignQuestionReviewResponse buildSavedReview(FeedbackCampaign campaign, List<FeedbackCampaignQuestionSelection> saved);

    ResolvedQuestionReview resolveCandidateGroups(FeedbackCampaign campaign);

    List<QuestionGroup> applyRequestDecisions(
            List<QuestionGroup> groups,
            Map<String, FeedbackCampaignQuestionSelectionRequest> decisions
    );

    void validateEveryGroupHasIncludedQuestion(List<QuestionGroup> groups);

    List<CompetencyWeightDraft> resolveCompetencyWeightsForSave(
            FeedbackCampaign campaign,
            List<QuestionGroup> groups,
            List<FeedbackCampaignCompetencyWeightRequest> requestedWeights
    );

    List<QuestionSelectionDraft> buildQuestionSelectionDrafts(List<QuestionGroup> groups);

    String decisionKey(String relationshipType, String targetLevelCode, Long targetDepartmentId, Long targetPositionId, String questionCode);

    record ResolvedQuestionReview(List<QuestionGroup> groups, List<String> warnings) {}

    record QuestionCandidate(
            Long sourceRuleId,
            String sourceRuleName,
            String sourceRuleScope,
            FeedbackQuestionVersion version,
            Long questionBankId,
            String questionCode,
            String competencyCode,
            String questionText,
            String responseType,
            String scoringBehavior,
            Integer ratingScaleId,
            Boolean required,
            Double weight,
            String sectionCode,
            String sectionTitle,
            Integer sectionOrder,
            Integer displayOrder,
            Long targetPositionId,
            Long targetDepartmentId,
            Long selectionId,
            Boolean included
    ) {}

    record QuestionGroup(
            FeedbackRelationshipType relationshipType,
            String relationshipLabel,
            String targetLevelCode,
            Integer targetLevelRank,
            Long targetDepartmentId,
            String targetDepartmentName,
            Long targetPositionId,
            String targetPositionName,
            String formVariantLabel,
            Integer targetCount,
            Integer assignmentCount,
            List<QuestionCandidate> questions,
            List<String> warnings
    ) {}
}
