package com.epms.service.impl;

import com.epms.dto.FeedbackCompetencyAverageResponse;
import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignRelationshipWeight;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.repository.FeedbackCampaignRelationshipWeightRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.FeedbackSummaryRepository;
import com.epms.service.FeedbackSummaryCalculationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackSummaryCalculationServiceImpl implements FeedbackSummaryCalculationService {

    private static final String SCORE_METHOD = "RELATIONSHIP_WEIGHTED_SUBMITTED_RESPONSE_AVERAGE";

    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository feedbackEvaluatorAssignmentRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final FeedbackSummaryRepository feedbackSummaryRepository;
    private final FeedbackCampaignRelationshipWeightRepository relationshipWeightRepository;
    private final Feedback360ScoringServiceImpl feedback360ScoringService;

    @Override
    public List<FeedbackSummary> refreshCampaignSummary(FeedbackCampaign campaign) {
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        return refreshCampaignSummary(campaign, requests, true);
    }

    @Override
    public List<FeedbackSummary> refreshCampaignSummaryForTargetEmployees(
            FeedbackCampaign campaign,
            List<Long> targetEmployeeIds
    ) {
        if (targetEmployeeIds == null || targetEmployeeIds.isEmpty()) {
            return List.of();
        }
        Set<Long> requestedTargetIds = targetEmployeeIds.stream()
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
        if (requestedTargetIds.isEmpty()) {
            return List.of();
        }

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId())
                .stream()
                .filter(request -> requestedTargetIds.contains(request.getTargetEmployeeId()))
                .toList();
        return refreshCampaignSummary(campaign, requests, false);
    }

    private List<FeedbackSummary> refreshCampaignSummary(
            FeedbackCampaign campaign,
            List<FeedbackRequest> requests,
            boolean deleteSummariesWithoutActiveRequest
    ) {
        List<FeedbackEvaluatorAssignment> campaignAssignments = feedbackEvaluatorAssignmentRepository.findByCampaignIdWithRequest(campaign.getId());
        List<FeedbackResponse> submittedResponses = feedbackResponseRepository.findByCampaignIdAndStatus(campaign.getId(), ResponseStatus.SUBMITTED);

        Map<Long, List<FeedbackEvaluatorAssignment>> assignmentsByRequestId = campaignAssignments.stream()
                .filter(assignment -> assignment.getFeedbackRequest() != null && assignment.getFeedbackRequest().getId() != null)
                .collect(Collectors.groupingBy(assignment -> assignment.getFeedbackRequest().getId()));

        Map<Long, FeedbackResponse> submittedResponseByAssignmentId = submittedResponses.stream()
                .filter(response -> response.getEvaluatorAssignment() != null && response.getEvaluatorAssignment().getId() != null)
                .collect(Collectors.toMap(
                        response -> response.getEvaluatorAssignment().getId(),
                        response -> response,
                        (first, duplicate) -> first
                ));

        List<FeedbackSummary> persisted = new ArrayList<>();
        Set<Long> activeTargetEmployeeIds = new HashSet<>();
        LocalDateTime now = LocalDateTime.now();

        for (FeedbackRequest request : requests) {
            Long targetEmployeeId = request.getTargetEmployeeId();
            activeTargetEmployeeIds.add(targetEmployeeId);
            List<FeedbackEvaluatorAssignment> assignments = assignmentsByRequestId.getOrDefault(request.getId(), List.of());
            List<FeedbackEvaluatorAssignment> countedAssignments = assignments.stream()
                    .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
                    .toList();
            List<FeedbackResponse> responses = countedAssignments.stream()
                    .map(assignment -> submittedResponseByAssignmentId.get(assignment.getId()))
                    .filter(Objects::nonNull)
                    .toList();

            FeedbackSummary summary = feedbackSummaryRepository.findByCampaignIdAndTargetEmployeeId(campaign.getId(), targetEmployeeId)
                    .orElseGet(FeedbackSummary::new);
            applySummaryValues(summary, campaign, targetEmployeeId, countedAssignments, responses, now);
            persisted.add(feedbackSummaryRepository.save(summary));
        }

        if (deleteSummariesWithoutActiveRequest) {
            List<FeedbackSummary> existing = feedbackSummaryRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
            for (FeedbackSummary summary : existing) {
                if (!activeTargetEmployeeIds.contains(summary.getTargetEmployeeId())) {
                    feedbackSummaryRepository.delete(summary);
                }
            }
        }

        return persisted.stream()
                .sorted(Comparator.comparing(FeedbackSummary::getTargetEmployeeId))
                .toList();
    }

    private void applySummaryValues(
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
        double completionRate = assignedCount == 0 ? 0.0 : feedback360ScoringService.roundToTwoDecimals((submittedCount * 100.0) / assignedCount);
        Double rawAverage = averageScore(responses);
        Double relationshipWeightedAverage = weightedScoreByRelationship(campaign, responses);
        String confidenceLevel = determineConfidenceLevel(assignedCount, submittedCount, completionRate);
        boolean insufficientFeedback = isInsufficientFeedback(assignedCount, submittedCount);

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
        boolean publishableCampaignStatus = campaign.getStatus() == FeedbackCampaignStatus.CLOSED
                || campaign.getStatus() == FeedbackCampaignStatus.PUBLISHED;

        if (publishableCampaignStatus && submittedCount > 0 && !insufficientFeedback) {
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

    private String buildScoreCalculationNote(
            FeedbackCampaign campaign,
            long assignedCount,
            long submittedCount,
            boolean insufficientFeedback
    ) {
        if (assignedCount == 0) {
            return "No evaluator assignments exist for this employee. Scores use the submitted 1-5 ratings converted to a 0-100 scale.";
        }
        if (submittedCount == 0) {
            return "No submitted feedback responses are available yet. Scores use the submitted 1-5 ratings converted to a 0-100 scale.";
        }
        if (insufficientFeedback) {
            return "Too few evaluators submitted feedback. Scores use submitted 1-5 ratings converted to 0-100 and relationship weights.";
        }
        if (Boolean.FALSE.equals(campaign.getRedistributeMissingRelationshipWeight())) {
            return "Scores use submitted 1-5 ratings converted to 0-100 and configured relationship weights. Missing reviewer group weight is not redistributed.";
        }
        return "Scores use submitted 1-5 ratings converted to 0-100 and configured relationship weights. Missing reviewer group weight is redistributed. Low-response groups are masked, not blocked.";
    }

    private boolean isInsufficientFeedback(long assignedCount, long submittedCount) {
        if (submittedCount == 0) {
            return true;
        }

        /*
         * The whole employee summary should not be blocked only because one protected
         * reviewer group is below the privacy threshold.
         *
         * Example:
         * - Self = 1
         * - Manager = 1
         * - Peer = 3
         * - Subordinate = 2
         *
         * The overall result can still be publishable because total feedback exists.
         * The low-response relationship group should be masked in the UI/reporting layer
         * instead of blocking the whole summary.
         */
        return assignedCount > 1 && submittedCount < 2;
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
                .filter(response -> response.getEvaluatorAssignment() != null)
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
        return feedback360ScoringService.roundToTwoDecimals(weightedTotal / denominator);
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
                .map(feedback360ScoringService::roundToTwoDecimals)
                .boxed()
                .findFirst()
                .orElse(null);
    }

    private Double averageScoreByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return averageScore(responses.stream()
                .filter(response -> response.getEvaluatorAssignment() != null)
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .toList());
    }

    @Override
    public List<FeedbackCompetencyAverageResponse> buildCampaignCompetencyAverages(Long campaignId) {
        if (campaignId == null) {
            return List.of();
        }
        List<FeedbackResponse> responses = feedbackResponseRepository.findByCampaignIdAndStatusWithItems(campaignId, ResponseStatus.SUBMITTED);
        Map<String, CompetencyAggregate> aggregates = new LinkedHashMap<>();
        for (FeedbackResponse response : responses) {
            if (response.getItems() == null) {
                continue;
            }
            for (FeedbackResponseItem item : response.getItems()) {
                if (item == null || item.getRatingValue() == null) {
                    continue;
                }
                FeedbackAssignmentQuestion question = item.getAssignmentQuestion();
                if (question == null || !feedback360ScoringService.isScoredQuestion(question)) {
                    continue;
                }
                String competencyCode = feedback360ScoringService.normalizeCompetencyCode(question.getCompetencyCode());
                String competencyName = feedback360ScoringService.resolveCompetencyName(question, competencyCode);
                CompetencyAggregate aggregate = aggregates.computeIfAbsent(
                        competencyCode,
                        ignored -> new CompetencyAggregate(competencyCode, competencyName)
                );
                aggregate.addScore(feedback360ScoringService.normalizeQuestionScore(item.getRatingValue(), question));
                aggregate.addQuestion(feedback360ScoringService.questionKey(question));
            }
        }
        return aggregates.values().stream()
                .map(CompetencyAggregate::toResponse)
                .sorted(Comparator.comparing(FeedbackCompetencyAverageResponse::getCompetencyName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private final class CompetencyAggregate {
        private final String competencyCode;
        private final String competencyName;
        private final Set<String> questionKeys = new HashSet<>();
        private double scoreTotal = 0.0;
        private long responseCount = 0L;

        private CompetencyAggregate(String competencyCode, String competencyName) {
            this.competencyCode = competencyCode;
            this.competencyName = competencyName;
        }

        private void addScore(double score) {
            scoreTotal += score;
            responseCount++;
        }

        private void addQuestion(String questionKey) {
            if (questionKey != null && !questionKey.isBlank()) {
                questionKeys.add(questionKey);
            }
        }

        private FeedbackCompetencyAverageResponse toResponse() {
            return FeedbackCompetencyAverageResponse.builder()
                    .competencyCode(competencyCode)
                    .competencyName(competencyName)
                    .averageScore(responseCount == 0 ? null : feedback360ScoringService.roundToTwoDecimals(scoreTotal / responseCount))
                    .responseCount(responseCount)
                    .questionCount((long) questionKeys.size())
                    .build();
        }
    }
}