package com.epms.service.impl;

import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignRelationshipWeight;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import com.epms.repository.FeedbackCampaignRelationshipWeightRepository;
import com.epms.service.FeedbackSummaryCalculationService;
import com.epms.util.FeedbackPrivacyUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.EnumMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackSummaryCalculationServiceImpl implements FeedbackSummaryCalculationService {

    private static final String SCORE_METHOD = "RELATIONSHIP_WEIGHTED_SUBMITTED_RESPONSE_AVERAGE";

    private final FeedbackCampaignRelationshipWeightRepository relationshipWeightRepository;

    @Override
    public void applySummaryValues(
            FeedbackSummary summary,
            FeedbackCampaign campaign,
            Long targetEmployeeId,
            List<FeedbackEvaluatorAssignment> assignments,
            List<FeedbackResponse> responses,
            LocalDateTime summarizedAt
    ) {
        long assignedCount = assignments.size();
        long submittedCount = responses.size();
        long pendingCount = Math.max(0, assignedCount - submittedCount);
        double completionRate = assignedCount == 0 ? 0.0 : roundToTwoDecimals((submittedCount * 100.0) / assignedCount);
        Double rawAverage = averageScore(responses);
        Double relationshipWeightedAverage = weightedScoreByRelationship(campaign, responses);
        String confidenceLevel = determineConfidenceLevel(assignedCount, submittedCount, completionRate);
        boolean insufficientFeedback = isInsufficientFeedback(assignedCount, submittedCount, responses);

        summary.setCampaign(campaign);
        summary.setTargetEmployeeId(targetEmployeeId);
        summary.setRawAverageScore(rawAverage);
        summary.setAverageScore(relationshipWeightedAverage);
        summary.setTotalResponses(submittedCount);
        summary.setManagerResponses(countByRelationship(responses, FeedbackRelationshipType.MANAGER));
        summary.setPeerResponses(countByRelationship(responses, FeedbackRelationshipType.PEER));
        summary.setSubordinateResponses(countByRelationship(responses, FeedbackRelationshipType.SUBORDINATE));
        summary.setSelfResponses(countByRelationship(responses, FeedbackRelationshipType.SELF));
        summary.setAssignedEvaluatorCount(assignedCount);
        summary.setSubmittedEvaluatorCount(submittedCount);
        summary.setPendingEvaluatorCount(pendingCount);
        summary.setCompletionRate(completionRate);
        summary.setConfidenceLevel(confidenceLevel);
        summary.setInsufficientFeedback(insufficientFeedback);
        summary.setScoreCalculationMethod(SCORE_METHOD);
        summary.setScoreCalculationNote(buildScoreCalculationNote(campaign, assignedCount, submittedCount, insufficientFeedback));
        summary.setManagerAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.MANAGER));
        summary.setPeerAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.PEER));
        summary.setSubordinateAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.SUBORDINATE));
        summary.setSelfAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.SELF));
        summary.setSummarizedAt(summarizedAt);
        applyVisibilityStatusAfterRecalculation(summary, campaign, submittedCount, insufficientFeedback);
    }

    private void applyVisibilityStatusAfterRecalculation(
            FeedbackSummary summary,
            FeedbackCampaign campaign,
            long submittedCount,
            boolean insufficientFeedback
    ) {
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED && submittedCount > 0 && !insufficientFeedback) {
            if (summary.getVisibilityStatus() == FeedbackSummaryVisibilityStatus.PUBLISHED) {
                return;
            }
            summary.setVisibilityStatus(FeedbackSummaryVisibilityStatus.READY_TO_PUBLISH);
            summary.setPublishedAt(null);
            summary.setPublishedByUserId(null);
            summary.setPublishNote(null);
            return;
        }

        summary.setVisibilityStatus(FeedbackSummaryVisibilityStatus.HIDDEN);
        summary.setPublishedAt(null);
        summary.setPublishedByUserId(null);
        summary.setPublishNote(null);
    }

    private String buildScoreCalculationNote(FeedbackCampaign campaign, long assignedCount, long submittedCount, boolean insufficientFeedback) {
        if (assignedCount == 0) {
            return "No evaluator assignments exist for this target employee.";
        }
        if (submittedCount == 0) {
            return "No submitted feedback responses are available yet.";
        }
        if (insufficientFeedback) {
            return "Feedback score uses submitted responses and configured evaluator relationship weights, but confidence is low because too few evaluators submitted.";
        }
        if (Boolean.FALSE.equals(campaign.getRedistributeMissingRelationshipWeight())) {
            return "Feedback score applies configured evaluator relationship weights. Unavailable relationship weight is not redistributed.";
        }
        return "Feedback score applies configured evaluator relationship weights and redistributes unavailable relationship weight across available evaluator groups.";
    }

    private boolean isInsufficientFeedback(long assignedCount, long submittedCount, List<FeedbackResponse> responses) {
        if (submittedCount == 0) {
            return true;
        }
        if (assignedCount > 1 && submittedCount < 2) {
            return true;
        }
        return hasSingleProtectedRelationshipResponse(responses, FeedbackRelationshipType.PEER)
                || hasSingleProtectedRelationshipResponse(responses, FeedbackRelationshipType.SUBORDINATE);
    }

    private boolean hasSingleProtectedRelationshipResponse(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        long count = countByRelationship(responses, relationshipType);
        return count > 0 && !FeedbackPrivacyUtil.hasEnoughProtectedResponses(relationshipType, count);
    }

    private String determineConfidenceLevel(long assignedCount, long submittedCount, double completionRate) {
        if (assignedCount == 0 || submittedCount == 0) {
            return "INSUFFICIENT";
        }
        if (submittedCount < 2 || completionRate < 50.0) {
            return "LOW";
        }
        if (completionRate < 100.0 || submittedCount < 3) {
            return "MEDIUM";
        }
        return "HIGH";
    }

    private long countByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .count();
    }

    private Double weightedScoreByRelationship(FeedbackCampaign campaign, List<FeedbackResponse> responses) {
        if (responses == null || responses.isEmpty()) {
            return null;
        }
        Map<FeedbackRelationshipType, Double> averages = new EnumMap<>(FeedbackRelationshipType.class);
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            Double average = averageScoreByRelationship(responses, type);
            if (average != null) {
                averages.put(type, average);
            }
        }
        if (averages.isEmpty()) {
            return null;
        }

        Map<FeedbackRelationshipType, Double> weights = relationshipWeights(campaign.getId());
        if (weights.isEmpty()) {
            return averageScore(responses);
        }

        double weightedTotal = 0.0;
        double availableWeight = 0.0;
        double configuredPositiveTotal = weights.values().stream().filter(value -> value > 0).mapToDouble(Double::doubleValue).sum();
        for (Map.Entry<FeedbackRelationshipType, Double> entry : averages.entrySet()) {
            double weight = weights.getOrDefault(entry.getKey(), 0.0);
            if (weight <= 0.0) {
                continue;
            }
            weightedTotal += entry.getValue() * weight;
            availableWeight += weight;
        }
        if (availableWeight <= 0.0) {
            return averageScore(responses);
        }
        double denominator = Boolean.FALSE.equals(campaign.getRedistributeMissingRelationshipWeight())
                ? (configuredPositiveTotal <= 0.0 ? availableWeight : configuredPositiveTotal)
                : availableWeight;
        return roundToTwoDecimals(weightedTotal / denominator);
    }

    private Map<FeedbackRelationshipType, Double> relationshipWeights(Long campaignId) {
        Map<FeedbackRelationshipType, Double> weights = relationshipWeightRepository.findByCampaignIdOrderByRelationshipTypeAsc(campaignId).stream()
                .filter(weight -> weight.getRelationshipType() != null)
                .collect(Collectors.toMap(
                        FeedbackCampaignRelationshipWeight::getRelationshipType,
                        weight -> weight.getWeightPercent() == null ? 0.0 : weight.getWeightPercent().doubleValue(),
                        (first, duplicate) -> duplicate,
                        () -> new EnumMap<>(FeedbackRelationshipType.class)
                ));
        if (!weights.isEmpty()) {
            return weights;
        }
        weights.put(FeedbackRelationshipType.MANAGER, 40.0);
        weights.put(FeedbackRelationshipType.PEER, 30.0);
        weights.put(FeedbackRelationshipType.SUBORDINATE, 20.0);
        weights.put(FeedbackRelationshipType.SELF, 10.0);
        return weights;
    }

    private Double averageScore(List<FeedbackResponse> responses) {
        return responses.stream()
                .map(FeedbackResponse::getOverallScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .stream()
                .map(this::roundToTwoDecimals)
                .boxed()
                .findFirst()
                .orElse(null);
    }

    private Double averageScoreByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return averageScore(responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .toList());
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
