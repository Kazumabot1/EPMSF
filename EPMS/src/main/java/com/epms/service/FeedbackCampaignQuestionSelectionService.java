package com.epms.service;

import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignCompetencyWeight;
import com.epms.entity.FeedbackCampaignQuestionSelection;
import com.epms.entity.FeedbackCompetency;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackQuestionVersion;
import com.epms.entity.enums.FeedbackRelationshipType;

import java.time.LocalDateTime;
import java.util.List;
import java.util.function.Function;

public interface FeedbackCampaignQuestionSelectionService {

    List<FeedbackCampaignQuestionSelection> findSavedSelections(Long campaignId);

    List<FeedbackCampaignCompetencyWeight> findSavedCompetencyWeights(Long campaignId);

    LocalDateTime resolveLastSavedAt(List<FeedbackCampaignQuestionSelection> selections);

    void replaceSelectionsAndWeights(
            FeedbackCampaign campaign,
            List<QuestionSelectionDraft> questionDrafts,
            List<CompetencyWeightDraft> competencyWeightDrafts
    );

    void validateReady(
            Long campaignId,
            List<FeedbackEvaluatorAssignment> assignments,
            Function<FeedbackEvaluatorAssignment, AssignmentSelectionContext> contextResolver
    );

    void clearSelectionsAndWeights(Long campaignId);

    record AssignmentSelectionContext(
            String targetLevelCode,
            Long targetPositionId,
            Long targetDepartmentId
    ) {}

    record QuestionSelectionDraft(
            FeedbackQuestionVersion questionVersion,
            Long questionBankId,
            Long sourceRuleId,
            FeedbackRelationshipType relationshipType,
            String targetLevelCode,
            Integer targetLevelRank,
            Long targetPositionId,
            Long targetDepartmentId,
            Integer targetCount,
            Integer assignmentCount,
            String questionCode,
            String competencyCode,
            String questionTextSnapshot,
            String responseType,
            String scoringBehavior,
            Integer ratingScaleId,
            Boolean required,
            Boolean included,
            Double weight,
            String sectionCode,
            String sectionTitle,
            Integer sectionOrder,
            Integer displayOrder
    ) {}

    record CompetencyWeightDraft(
            FeedbackCompetency competency,
            String competencyCode,
            String competencyName,
            Double weightPercent
    ) {}
}
