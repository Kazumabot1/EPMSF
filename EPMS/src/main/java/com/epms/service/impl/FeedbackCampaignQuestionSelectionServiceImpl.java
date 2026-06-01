package com.epms.service.impl;

import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignCompetencyWeight;
import com.epms.entity.FeedbackCampaignQuestionSelection;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.exception.BusinessValidationException;
import com.epms.repository.FeedbackCampaignCompetencyWeightRepository;
import com.epms.repository.FeedbackCampaignQuestionSelectionRepository;
import com.epms.service.FeedbackCampaignQuestionSelectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignQuestionSelectionServiceImpl implements FeedbackCampaignQuestionSelectionService {

    private static final String RESPONSE_RATING_WITH_COMMENT = "RATING_WITH_COMMENT";
    private static final String RESPONSE_RATING = "RATING";
    private static final String SCORING_SCORED = "SCORED";

    private final FeedbackCampaignQuestionSelectionRepository selectionRepository;
    private final FeedbackCampaignCompetencyWeightRepository competencyWeightRepository;

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackCampaignQuestionSelection> findSavedSelections(Long campaignId) {
        return selectionRepository.findByCampaignIdOrderByRelationshipTypeAscTargetLevelRankAscSectionOrderAscDisplayOrderAscIdAsc(campaignId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackCampaignCompetencyWeight> findSavedCompetencyWeights(Long campaignId) {
        return competencyWeightRepository.findByCampaignIdOrderByCompetencyNameSnapshotAsc(campaignId);
    }

    @Override
    public LocalDateTime resolveLastSavedAt(List<FeedbackCampaignQuestionSelection> selections) {
        return (selections == null ? List.<FeedbackCampaignQuestionSelection>of() : selections).stream()
                .map(FeedbackCampaignQuestionSelection::getUpdatedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    @Override
    @Transactional
    public void replaceSelectionsAndWeights(
            FeedbackCampaign campaign,
            List<QuestionSelectionDraft> questionDrafts,
            List<CompetencyWeightDraft> competencyWeightDrafts
    ) {
        if (campaign == null || campaign.getId() == null) {
            throw new BusinessValidationException("Feedback campaign is required before saving question selections.");
        }

        selectionRepository.deleteByCampaignId(campaign.getId());
        selectionRepository.flush();
        competencyWeightRepository.deleteByCampaignId(campaign.getId());
        competencyWeightRepository.flush();

        List<FeedbackCampaignQuestionSelection> selections = uniqueQuestionDrafts(questionDrafts).stream()
                .map(draft -> toSelection(campaign, draft))
                .toList();
        selectionRepository.saveAll(selections);
        saveCompetencyWeights(campaign, uniqueCompetencyWeightDrafts(competencyWeightDrafts));
    }

    @Override
    @Transactional(readOnly = true)
    public void validateReady(
            Long campaignId,
            List<FeedbackEvaluatorAssignment> assignments,
            Function<FeedbackEvaluatorAssignment, AssignmentSelectionContext> contextResolver
    ) {
        if (assignments == null || assignments.isEmpty()) {
            throw new BusinessValidationException("Generate evaluator assignments before validating campaign questions.");
        }
        if (!selectionRepository.existsByCampaignIdAndIncludedTrue(campaignId)) {
            throw new BusinessValidationException("Complete campaign question review before marking the campaign ready.");
        }

        List<String> missingGroups = new ArrayList<>();
        for (FeedbackEvaluatorAssignment assignment : assignments) {
            AssignmentSelectionContext context = contextResolver.apply(assignment);
            List<FeedbackCampaignQuestionSelection> selections = selectionRepository.findIncludedForAssignmentGroup(
                    campaignId,
                    assignment.getRelationshipType(),
                    context.targetLevelCode(),
                    context.targetPositionId(),
                    context.targetDepartmentId()
            );
            if (selections.isEmpty()) {
                missingGroups.add(relationshipLabel(assignment.getRelationshipType()) + " / " + context.targetLevelCode());
            }
        }
        if (!missingGroups.isEmpty()) {
            throw new BusinessValidationException("Question review is missing included questions for evaluator group(s): "
                    + missingGroups.stream().distinct().toList());
        }

        validateSavedCompetencyWeights(campaignId);
    }

    @Override
    @Transactional
    public void clearSelectionsAndWeights(Long campaignId) {
        selectionRepository.deleteByCampaignId(campaignId);
        competencyWeightRepository.deleteByCampaignId(campaignId);
    }


    private List<QuestionSelectionDraft> uniqueQuestionDrafts(List<QuestionSelectionDraft> drafts) {
        Map<String, QuestionSelectionDraft> unique = new java.util.LinkedHashMap<>();
        for (QuestionSelectionDraft draft : drafts == null ? List.<QuestionSelectionDraft>of() : drafts) {
            if (draft == null) {
                continue;
            }
            String key = String.join("|",
                    normalizeKey(draft.relationshipType() == null ? null : draft.relationshipType().name()),
                    normalizeKey(draft.targetLevelCode()),
                    normalizeKey(draft.targetDepartmentId()),
                    normalizeKey(draft.targetPositionId()),
                    normalizeKey(draft.questionCode()));
            unique.putIfAbsent(key, draft);
        }
        return new ArrayList<>(unique.values());
    }

    private List<CompetencyWeightDraft> uniqueCompetencyWeightDrafts(List<CompetencyWeightDraft> drafts) {
        Map<String, CompetencyWeightDraft> unique = new java.util.LinkedHashMap<>();
        for (CompetencyWeightDraft draft : drafts == null ? List.<CompetencyWeightDraft>of() : drafts) {
            if (draft == null) {
                continue;
            }
            String key = draft.competency() != null && draft.competency().getId() != null
                    ? "ID:" + draft.competency().getId()
                    : "CODE:" + normalizeCode(draft.competencyCode(), "UNMAPPED");
            unique.putIfAbsent(key, draft);
        }
        return new ArrayList<>(unique.values());
    }

    private String normalizeKey(Object value) {
        if (value == null) {
            return "NULL";
        }
        String normalized = String.valueOf(value).trim();
        return normalized.isBlank() ? "NULL" : normalized.toUpperCase();
    }

    private FeedbackCampaignQuestionSelection toSelection(FeedbackCampaign campaign, QuestionSelectionDraft draft) {
        FeedbackCampaignQuestionSelection selection = new FeedbackCampaignQuestionSelection();
        selection.setCampaign(campaign);
        selection.setQuestionVersion(draft.questionVersion());
        selection.setQuestionBankId(draft.questionBankId());
        selection.setSourceRuleId(draft.sourceRuleId());
        selection.setRelationshipType(draft.relationshipType());
        selection.setTargetLevelCode(draft.targetLevelCode());
        selection.setTargetLevelRank(draft.targetLevelRank());
        selection.setTargetPositionId(draft.targetPositionId());
        selection.setTargetDepartmentId(draft.targetDepartmentId());
        selection.setTargetCount(draft.targetCount());
        selection.setAssignmentCount(draft.assignmentCount());
        selection.setQuestionCode(draft.questionCode());
        selection.setCompetencyCode(draft.competencyCode());
        selection.setQuestionTextSnapshot(draft.questionTextSnapshot());
        selection.setResponseType(draft.responseType());
        selection.setScoringBehavior(draft.scoringBehavior());
        selection.setRatingScaleId(draft.ratingScaleId());
        selection.setRequired(Boolean.TRUE.equals(draft.required()));
        selection.setIncluded(Boolean.TRUE.equals(draft.included()));
        selection.setWeight(draft.weight());
        selection.setSectionCode(draft.sectionCode());
        selection.setSectionTitle(draft.sectionTitle());
        selection.setSectionOrder(draft.sectionOrder());
        selection.setDisplayOrder(draft.displayOrder());
        return selection;
    }

    private void saveCompetencyWeights(FeedbackCampaign campaign, List<CompetencyWeightDraft> drafts) {
        List<FeedbackCampaignCompetencyWeight> weights = (drafts == null ? List.<CompetencyWeightDraft>of() : drafts).stream()
                .filter(Objects::nonNull)
                .map(draft -> {
                    FeedbackCampaignCompetencyWeight weight = new FeedbackCampaignCompetencyWeight();
                    weight.setCampaign(campaign);
                    weight.setCompetency(draft.competency());
                    weight.setCompetencyCodeSnapshot(draft.competencyCode());
                    weight.setCompetencyNameSnapshot(draft.competencyName());
                    weight.setWeightPercent(BigDecimal.valueOf(draft.weightPercent() == null ? 0.0 : draft.weightPercent()).setScale(2, RoundingMode.HALF_UP));
                    return weight;
                })
                .toList();
        competencyWeightRepository.saveAll(weights);
    }

    private void validateSavedCompetencyWeights(Long campaignId) {
        List<FeedbackCampaignCompetencyWeight> weights = findSavedCompetencyWeights(campaignId);
        if (weights.isEmpty()) {
            throw new BusinessValidationException("Save competency weights before marking the campaign ready.");
        }

        List<FeedbackCampaignQuestionSelection> selections = findSavedSelections(campaignId);
        Set<String> includedScoredCompetencies = selections.stream()
                .filter(selection -> Boolean.TRUE.equals(selection.getIncluded()))
                .filter(selection -> isScored(selection.getResponseType(), selection.getScoringBehavior()))
                .map(selection -> normalizeCode(selection.getCompetencyCode(), "UNMAPPED"))
                .collect(Collectors.toCollection(LinkedHashSet::new));
        Set<String> weightedCompetencies = weights.stream()
                .map(weight -> normalizeCode(weight.getCompetencyCodeSnapshot(), "UNMAPPED"))
                .collect(Collectors.toCollection(LinkedHashSet::new));

        List<String> missingWeights = includedScoredCompetencies.stream()
                .filter(code -> !weightedCompetencies.contains(code))
                .toList();
        if (!missingWeights.isEmpty()) {
            throw new BusinessValidationException("Competency weights are missing for: " + missingWeights);
        }

        double totalWeight = roundToTwoDecimals(weights.stream()
                .map(FeedbackCampaignCompetencyWeight::getWeightPercent)
                .filter(Objects::nonNull)
                .mapToDouble(BigDecimal::doubleValue)
                .sum());
        if (Math.abs(totalWeight - 100.0) > 0.01) {
            throw new BusinessValidationException("Competency weights must total 100%. Current total is " + totalWeight + "%.");
        }

        List<String> emptyPositiveWeights = weights.stream()
                .filter(weight -> toDouble(weight.getWeightPercent()) > 0)
                .map(weight -> normalizeCode(weight.getCompetencyCodeSnapshot(), "UNMAPPED"))
                .filter(code -> !includedScoredCompetencies.contains(code))
                .toList();
        if (!emptyPositiveWeights.isEmpty()) {
            throw new BusinessValidationException("Weighted competencies must have included scored questions: " + emptyPositiveWeights);
        }
    }

    private String relationshipLabel(FeedbackRelationshipType relationshipType) {
        return switch (relationshipType) {
            case MANAGER -> "Manager reviewer";
            case PEER -> "Peer";
            case SUBORDINATE -> "Subordinate reviewer";
            case SELF -> "Self";
        };
    }

    private boolean isScored(String responseType, String scoringBehavior) {
        return isRatingResponseType(responseType) && SCORING_SCORED.equals(scoringBehavior);
    }

    private boolean isRatingResponseType(String responseType) {
        String normalized = responseType == null ? "" : responseType.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        return RESPONSE_RATING_WITH_COMMENT.equals(normalized);
    }

    private String normalizeCode(String value, String fallback) {
        String normalized = value == null || value.isBlank() ? fallback : value;
        return normalized.trim().replaceAll("\\s+", "_").toUpperCase();
    }

    private double toDouble(BigDecimal value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private double roundToTwoDecimals(double value) {
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }
}
