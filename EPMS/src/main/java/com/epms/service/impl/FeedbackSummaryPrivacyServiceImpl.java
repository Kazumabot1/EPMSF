package com.epms.service.impl;

import com.epms.dto.FeedbackIntegrationScoreResponse;
import com.epms.dto.FeedbackResultItemResponse;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import com.epms.service.FeedbackSummaryPrivacyService;
import com.epms.util.FeedbackPrivacyUtil;
import com.epms.util.FeedbackScoreUtil;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@Service
public class FeedbackSummaryPrivacyServiceImpl implements FeedbackSummaryPrivacyService {

    @Override
    public boolean isSummaryReadyForPublish(FeedbackSummary summary) {
        return safeLong(summary.getTotalResponses()) > 0
                && !Boolean.TRUE.equals(summary.getInsufficientFeedback());
    }

    @Override
    public List<FeedbackResultItemResponse> mapResultItems(
            List<FeedbackSummary> summaries,
            Map<Long, String> employeeNames,
            boolean protectRelationshipBreakdown
    ) {
        return summaries.stream()
                .map(summary -> FeedbackResultItemResponse.builder()
                        .campaignId(summary.getCampaign().getId())
                        .campaignName(summary.getCampaign().getName())
                        .targetEmployeeId(summary.getTargetEmployeeId())
                        .targetEmployeeName(employeeNames.getOrDefault(
                                summary.getTargetEmployeeId(),
                                "Employee #" + summary.getTargetEmployeeId()
                        ))
                        .averageScore(summary.getAverageScore())
                        .rawAverageScore(summary.getRawAverageScore())
                        .scoreCategory(FeedbackScoreUtil.category(summary.getAverageScore()))
                        .totalResponses(safeLong(summary.getTotalResponses()))
                        .managerResponses(safeLong(summary.getManagerResponses()))
                        .peerResponses(safeLong(summary.getPeerResponses()))
                        .subordinateResponses(safeLong(summary.getSubordinateResponses()))
                        .selfResponses(safeLong(summary.getSelfResponses()))
                        .assignedEvaluatorCount(safeLong(summary.getAssignedEvaluatorCount()))
                        .submittedEvaluatorCount(safeLong(summary.getSubmittedEvaluatorCount()))
                        .pendingEvaluatorCount(safeLong(summary.getPendingEvaluatorCount()))
                        .completionRate(safeDouble(summary.getCompletionRate()))
                        .confidenceLevel(summary.getConfidenceLevel())
                        .insufficientFeedback(Boolean.TRUE.equals(summary.getInsufficientFeedback()))
                        .managerAverageScore(visibleRelationshipAverage(summary, FeedbackRelationshipType.MANAGER, protectRelationshipBreakdown))
                        .peerAverageScore(visibleRelationshipAverage(summary, FeedbackRelationshipType.PEER, protectRelationshipBreakdown))
                        .subordinateAverageScore(visibleRelationshipAverage(summary, FeedbackRelationshipType.SUBORDINATE, protectRelationshipBreakdown))
                        .selfAverageScore(visibleRelationshipAverage(summary, FeedbackRelationshipType.SELF, protectRelationshipBreakdown))
                        .scoreCalculationMethod(summary.getScoreCalculationMethod())
                        .scoreCalculationNote(visibleScoreCalculationNote(summary, protectRelationshipBreakdown))
                        .visibilityStatus(visibilityStatusName(summary))
                        .publishedAt(summary.getPublishedAt())
                        .publishedByUserId(summary.getPublishedByUserId())
                        .publishNote(summary.getPublishNote())
                        .summarizedAt(summary.getSummarizedAt())
                        .build())
                .toList();
    }

    @Override
    public FeedbackIntegrationScoreResponse mapIntegrationScore(FeedbackSummary summary, Map<Long, String> employeeNames) {
        return FeedbackIntegrationScoreResponse.builder()
                .campaignId(summary.getCampaign().getId())
                .campaignName(summary.getCampaign().getName())
                .campaignStatus(summary.getCampaign().getStatus().name())
                .targetEmployeeId(summary.getTargetEmployeeId())
                .targetEmployeeName(employeeNames.getOrDefault(summary.getTargetEmployeeId(), "Employee #" + summary.getTargetEmployeeId()))
                .feedbackScore(summary.getAverageScore())
                .rawFeedbackScore(summary.getRawAverageScore())
                .scoreBand(FeedbackScoreUtil.category(summary.getAverageScore()))
                .assignedEvaluatorCount(safeLong(summary.getAssignedEvaluatorCount()))
                .submittedEvaluatorCount(safeLong(summary.getSubmittedEvaluatorCount()))
                .pendingEvaluatorCount(safeLong(summary.getPendingEvaluatorCount()))
                .completionRate(safeDouble(summary.getCompletionRate()))
                .confidenceLevel(summary.getConfidenceLevel())
                .insufficientFeedback(Boolean.TRUE.equals(summary.getInsufficientFeedback()))
                .managerAverageScore(summary.getManagerAverageScore())
                .peerAverageScore(summary.getPeerAverageScore())
                .subordinateAverageScore(summary.getSubordinateAverageScore())
                .selfAverageScore(summary.getSelfAverageScore())
                .managerResponses(safeLong(summary.getManagerResponses()))
                .peerResponses(safeLong(summary.getPeerResponses()))
                .subordinateResponses(safeLong(summary.getSubordinateResponses()))
                .selfResponses(safeLong(summary.getSelfResponses()))
                .scoreCalculationMethod(summary.getScoreCalculationMethod())
                .scoreCalculationNote(summary.getScoreCalculationNote())
                .visibilityStatus(visibilityStatusName(summary))
                .publishedAt(summary.getPublishedAt())
                .publishedByUserId(summary.getPublishedByUserId())
                .publishNote(summary.getPublishNote())
                .summarizedAt(summary.getSummarizedAt())
                .build();
    }

    @Override
    public FeedbackSummaryVisibilityStatus campaignVisibilityStatus(List<FeedbackSummary> summaries) {
        if (summaries.stream().anyMatch(summary -> summary.getVisibilityStatus() == FeedbackSummaryVisibilityStatus.PUBLISHED)) {
            return FeedbackSummaryVisibilityStatus.PUBLISHED;
        }
        if (summaries.stream().anyMatch(summary -> summary.getVisibilityStatus() == FeedbackSummaryVisibilityStatus.READY_TO_PUBLISH)) {
            return FeedbackSummaryVisibilityStatus.READY_TO_PUBLISH;
        }
        return FeedbackSummaryVisibilityStatus.HIDDEN;
    }

    @Override
    public LocalDateTime campaignPublishedAt(List<FeedbackSummary> summaries) {
        return summaries.stream()
                .map(FeedbackSummary::getPublishedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    @Override
    public Long campaignPublishedByUserId(List<FeedbackSummary> summaries) {
        return summaries.stream()
                .filter(summary -> summary.getPublishedAt() != null)
                .max(Comparator.comparing(FeedbackSummary::getPublishedAt))
                .map(FeedbackSummary::getPublishedByUserId)
                .orElse(null);
    }

    @Override
    public String campaignPublishNote(List<FeedbackSummary> summaries) {
        return summaries.stream()
                .filter(summary -> summary.getPublishedAt() != null)
                .max(Comparator.comparing(FeedbackSummary::getPublishedAt))
                .map(FeedbackSummary::getPublishNote)
                .orElse(null);
    }

    private Double visibleRelationshipAverage(
            FeedbackSummary summary,
            FeedbackRelationshipType relationshipType,
            boolean protectRelationshipBreakdown
    ) {
        if (!protectRelationshipBreakdown || !FeedbackPrivacyUtil.requiresGroupThreshold(relationshipType)) {
            return relationshipAverage(summary, relationshipType);
        }
        long responses = relationshipResponseCount(summary, relationshipType);
        return FeedbackPrivacyUtil.hasEnoughProtectedResponses(relationshipType, responses)
                ? relationshipAverage(summary, relationshipType)
                : null;
    }

    private String visibleScoreCalculationNote(FeedbackSummary summary, boolean protectRelationshipBreakdown) {
        String baseNote = summary.getScoreCalculationNote();
        if (!protectRelationshipBreakdown) {
            return baseNote;
        }

        List<String> hiddenNotes = new ArrayList<>();
        if (relationshipResponseCount(summary, FeedbackRelationshipType.PEER) > 0
                && !FeedbackPrivacyUtil.hasEnoughProtectedResponses(FeedbackRelationshipType.PEER, safeLong(summary.getPeerResponses()))) {
            hiddenNotes.add(FeedbackPrivacyUtil.protectedRelationshipThresholdMessage(FeedbackRelationshipType.PEER));
        }
        if (relationshipResponseCount(summary, FeedbackRelationshipType.SUBORDINATE) > 0
                && !FeedbackPrivacyUtil.hasEnoughProtectedResponses(FeedbackRelationshipType.SUBORDINATE, safeLong(summary.getSubordinateResponses()))) {
            hiddenNotes.add(FeedbackPrivacyUtil.protectedRelationshipThresholdMessage(FeedbackRelationshipType.SUBORDINATE));
        }
        if (hiddenNotes.isEmpty()) {
            return baseNote;
        }
        String privacyNote = String.join(" ", hiddenNotes);
        return baseNote == null || baseNote.isBlank() ? privacyNote : baseNote + " " + privacyNote;
    }

    private Double relationshipAverage(FeedbackSummary summary, FeedbackRelationshipType relationshipType) {
        return switch (relationshipType) {
            case MANAGER -> summary.getManagerAverageScore();
            case PEER -> summary.getPeerAverageScore();
            case SUBORDINATE -> summary.getSubordinateAverageScore();
            case SELF -> summary.getSelfAverageScore();
        };
    }

    private long relationshipResponseCount(FeedbackSummary summary, FeedbackRelationshipType relationshipType) {
        return switch (relationshipType) {
            case MANAGER -> safeLong(summary.getManagerResponses());
            case PEER -> safeLong(summary.getPeerResponses());
            case SUBORDINATE -> safeLong(summary.getSubordinateResponses());
            case SELF -> safeLong(summary.getSelfResponses());
        };
    }

    private String visibilityStatusName(FeedbackSummary summary) {
        return summary.getVisibilityStatus() == null
                ? FeedbackSummaryVisibilityStatus.HIDDEN.name()
                : summary.getVisibilityStatus().name();
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }
}
