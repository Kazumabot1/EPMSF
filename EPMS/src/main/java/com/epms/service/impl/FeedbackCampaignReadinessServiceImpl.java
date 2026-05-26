package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignActivationReadinessResponse;
import com.epms.dto.FeedbackCampaignQuestionReviewResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignRelationshipWeight;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackAssignmentQuestionRepository;
import com.epms.repository.FeedbackCampaignRelationshipWeightRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import com.epms.service.FeedbackCampaignReadinessService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.EnumMap;
import java.util.EnumSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignReadinessServiceImpl implements FeedbackCampaignReadinessService {

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackAssignmentQuestionRepository assignmentQuestionRepository;
    private final FeedbackCampaignRelationshipWeightRepository relationshipWeightRepository;
    private final FeedbackCampaignQuestionReviewService questionReviewService;

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignActivationReadinessResponse getActivationReadiness(Long campaignId) {
        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
        return buildActivationReadiness(campaign);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignActivationReadinessResponse buildActivationReadiness(FeedbackCampaign campaign) {
        List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks = new ArrayList<>();
        List<String> blocking = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaign.getId());
        long snapshotCount = assignmentQuestionRepository.countByAssignmentFeedbackRequestCampaignId(campaign.getId());
        long pendingCount = assignments.stream().filter(assignment -> assignment.getStatus() == AssignmentStatus.PENDING).count();
        long inProgressCount = assignments.stream().filter(assignment -> assignment.getStatus() == AssignmentStatus.IN_PROGRESS).count();
        long submittedCount = assignments.stream().filter(assignment -> assignment.getStatus() == AssignmentStatus.SUBMITTED).count();
        double completionPercent = assignments.isEmpty() ? 0.0 : submittedCount * 100.0 / assignments.size();

        addLifecycleCheck(campaign, checks);
        addCampaignInfoCheck(campaign, checks, blocking);
        addTargetCheck(requests, checks, blocking, warnings);
        addAssignmentCheck(requests, assignments, checks, blocking);
        addQuestionReviewCheck(campaign, checks, blocking, warnings);
        addScoringConfigCheck(campaign, assignments, checks, blocking, warnings);
        addPrivacyPolicyCheck(campaign, checks, warnings);
        addSubmissionWindowCheck(campaign, checks, blocking, warnings);

        boolean ready = blocking.isEmpty();
        return FeedbackCampaignActivationReadinessResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .campaignStatus(campaign.getStatus() == null ? null : campaign.getStatus().name())
                .ready(ready)
                .canMarkReady(ready && campaign.getStatus() == FeedbackCampaignStatus.DRAFT)
                .canActivate(ready && campaign.getStatus() == FeedbackCampaignStatus.READY_TO_ACTIVATE)
                .summary(FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationSummary.builder()
                        .targetCount(requests.size())
                        .assignmentCount(assignments.size())
                        .questionSelectionCount(resolveIncludedQuestionSelectionCount(campaign.getId()))
                        .assignmentQuestionSnapshotCount((int) snapshotCount)
                        .pendingAssignmentCount((int) pendingCount)
                        .inProgressAssignmentCount((int) inProgressCount)
                        .submittedAssignmentCount((int) submittedCount)
                        .completionPercent(Math.round(completionPercent * 100.0) / 100.0)
                        .build())
                .checks(checks)
                .blockingIssues(blocking)
                .warnings(warnings)
                .build();
    }

    private void addLifecycleCheck(
            FeedbackCampaign campaign,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks
    ) {
        if (campaign.getStatus() == FeedbackCampaignStatus.DRAFT) {
            checks.add(readinessCheck(
                    "LIFECYCLE_STATE",
                    "Lifecycle state",
                    "PASS",
                    "Setup can be validated after all launch checks pass. Activation is available only after the campaign is marked Ready to activate."
            ));
            return;
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.READY_TO_ACTIVATE) {
            checks.add(readinessCheck(
                    "LIFECYCLE_STATE",
                    "Lifecycle state",
                    "PASS",
                    "Campaign setup is validated and locked. Activation is available after the final launch check passes."
            ));
            return;
        }
        checks.add(readinessCheck(
                "LIFECYCLE_STATE",
                "Lifecycle state",
                "PASS",
                "Campaign is " + (campaign.getStatus() == null ? "not set" : campaign.getStatus().name().toLowerCase().replace('_', ' ')) + ". Launch setup is read-only."
        ));
    }

    private void addCampaignInfoCheck(
            FeedbackCampaign campaign,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks,
            List<String> blocking
    ) {
        List<String> issues = new ArrayList<>();
        if (campaign.getName() == null || campaign.getName().isBlank()) issues.add("Campaign name is required.");
        if (campaign.getReviewYear() == null) issues.add("Review year is required.");
        if (campaign.getStartAt() == null || campaign.getEndAt() == null) issues.add("Submission start and end date/time are required.");
        if (campaign.getStartAt() != null && campaign.getEndAt() != null && !campaign.getEndAt().isAfter(campaign.getStartAt())) {
            issues.add("Submission end must be after the start.");
        }
        if (!issues.isEmpty()) {
            blocking.addAll(issues);
            checks.add(readinessCheck("CAMPAIGN_INFO", "Campaign information", "BLOCKED", String.join(" ", issues)));
            return;
        }
        checks.add(readinessCheck("CAMPAIGN_INFO", "Campaign information", "PASS", "Campaign name, review year, and submission window are complete."));
    }

    private void addTargetCheck(
            List<FeedbackRequest> requests,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks,
            List<String> blocking,
            List<String> warnings
    ) {
        if (requests.isEmpty()) {
            blocking.add("Select at least one feedback recipient before activation.");
            checks.add(readinessCheck("TARGETS", "Targets", "BLOCKED", "No feedback recipients have been saved."));
            return;
        }
        long warningTargets = requests.stream()
                .filter(this::hasTargetWarnings)
                .count();
        if (warningTargets > 0) {
            warnings.add(warningTargets + " selected recipient(s) have targeting warnings.");
            checks.add(readinessCheck("TARGETS", "Targets", "WARNING", requests.size() + " recipient(s) saved; " + warningTargets + " need HR review but can proceed."));
            return;
        }
        checks.add(readinessCheck("TARGETS", "Targets", "PASS", requests.size() + " feedback recipient(s) are saved and ready."));
    }

    private void addAssignmentCheck(
            List<FeedbackRequest> requests,
            List<FeedbackEvaluatorAssignment> assignments,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks,
            List<String> blocking
    ) {
        if (requests.isEmpty()) {
            checks.add(readinessCheck("EVALUATOR_ASSIGNMENTS", "Evaluator assignments", "BLOCKED", "Save recipients before preparing evaluators."));
            return;
        }
        if (assignments.isEmpty()) {
            blocking.add("Generate evaluator assignments before activation.");
            checks.add(readinessCheck("EVALUATOR_ASSIGNMENTS", "Evaluator assignments", "BLOCKED", "No evaluator assignments exist for this campaign."));
            return;
        }
        List<String> assignmentIssues = new ArrayList<>();
        boolean missingRequest = assignments.stream().anyMatch(assignment -> assignment.getFeedbackRequest() == null);
        if (missingRequest) assignmentIssues.add("Some evaluator assignments are not linked to a feedback recipient.");
        boolean missingRelationship = assignments.stream().anyMatch(assignment -> assignment.getRelationshipType() == null);
        if (missingRelationship) assignmentIssues.add("Some evaluator assignments are missing a relationship type.");
        boolean missingEvaluator = assignments.stream().anyMatch(assignment -> assignment.getEvaluatorEmployeeId() == null);
        if (missingEvaluator) assignmentIssues.add("Some evaluator assignments are missing evaluator employees.");
        Set<Long> requestsWithAssignments = assignments.stream()
                .filter(assignment -> assignment.getFeedbackRequest() != null)
                .map(assignment -> assignment.getFeedbackRequest().getId())
                .collect(Collectors.toSet());
        List<Long> missingTargetIds = requests.stream()
                .filter(request -> !requestsWithAssignments.contains(request.getId()))
                .map(FeedbackRequest::getTargetEmployeeId)
                .toList();
        if (!missingTargetIds.isEmpty()) {
            assignmentIssues.add("Targets without evaluator assignments: " + missingTargetIds + ".");
        }
        if (!assignmentIssues.isEmpty()) {
            blocking.addAll(assignmentIssues);
            checks.add(readinessCheck("EVALUATOR_ASSIGNMENTS", "Evaluator assignments", "BLOCKED", "Evaluator assignment data has blocking issues."));
        } else {
            checks.add(readinessCheck("EVALUATOR_ASSIGNMENTS", "Evaluator assignments", "PASS", assignments.size() + " evaluator assignment(s) are generated."));
        }
    }

    private void addQuestionReviewCheck(
            FeedbackCampaign campaign,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks,
            List<String> blocking,
            List<String> warnings
    ) {
        try {
            FeedbackCampaignQuestionReviewResponse review = questionReviewService.getQuestionReview(campaign.getId());
            if (!Boolean.TRUE.equals(review.getSaved()) || review.getIncludedQuestionCount() == null || review.getIncludedQuestionCount() <= 0) {
                blocking.add("Complete and save Campaign Question Review before activation.");
                checks.add(readinessCheck("QUESTION_SELECTION", "Question review", "BLOCKED", "Campaign question selection has not been saved."));
                return;
            }
            questionReviewService.validateCampaignQuestionSelectionReady(campaign.getId());
            long emptyGroups = review.getGroups() == null ? 0 : review.getGroups().stream()
                                                                .filter(group -> group.getIncludedQuestionCount() == null || group.getIncludedQuestionCount() <= 0)
                                                                .count();
            if (emptyGroups > 0) {
                blocking.add("Every evaluator group must keep at least one included question.");
                checks.add(readinessCheck("QUESTION_SELECTION", "Question review", "BLOCKED", emptyGroups + " evaluator group(s) have no included questions."));
                return;
            }
            long noScoredGroups = review.getGroups() == null ? 0 : review.getGroups().stream()
                                                                   .filter(group -> group.getIncludedScoredQuestionCount() == null || group.getIncludedScoredQuestionCount() <= 0)
                                                                   .count();
            if (noScoredGroups > 0) {
                warnings.add(noScoredGroups + " question group(s) have no scored questions.");
                checks.add(readinessCheck("QUESTION_SELECTION", "Question review", "WARNING", review.getIncludedQuestionCount() + " questions saved; " + noScoredGroups + " group(s) are non-scored only."));
            } else {
                checks.add(readinessCheck("QUESTION_SELECTION", "Question review", "PASS", review.getIncludedQuestionCount() + " included campaign question(s) are saved."));
            }
        } catch (BusinessValidationException ex) {
            blocking.add(ex.getMessage());
            checks.add(readinessCheck("QUESTION_SELECTION", "Question review", "BLOCKED", ex.getMessage()));
        }
    }

    private void addScoringConfigCheck(
            FeedbackCampaign campaign,
            List<FeedbackEvaluatorAssignment> assignments,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks,
            List<String> blocking,
            List<String> warnings
    ) {
        Map<FeedbackRelationshipType, FeedbackCampaignRelationshipWeight> stored = relationshipWeightsByType(campaign);
        Map<FeedbackRelationshipType, BigDecimal> weights = new EnumMap<>(FeedbackRelationshipType.class);
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            weights.put(type, stored.containsKey(type) ? stored.get(type).getWeightPercent() : defaultRelationshipWeight(type));
        }
        BigDecimal total = relationshipWeightTotal(weights);
        if (total.compareTo(new BigDecimal("100.00")) != 0) {
            String message = "Evaluator relationship weights must total 100%. Current total is " + total + "% .";
            blocking.add(message);
            checks.add(readinessCheck("RELATIONSHIP_WEIGHTS", "Relationship weights", "BLOCKED", message));
            return;
        }
        if (weights.values().stream().noneMatch(value -> value.compareTo(BigDecimal.ZERO) > 0)) {
            String message = "At least one evaluator relationship must have a positive weight.";
            blocking.add(message);
            checks.add(readinessCheck("RELATIONSHIP_WEIGHTS", "Relationship weights", "BLOCKED", message));
            return;
        }
        List<String> weightWarnings = relationshipWeightWarnings(campaign, weights, assignments);
        if (!weightWarnings.isEmpty() && !Boolean.TRUE.equals(campaign.getRedistributeMissingRelationshipWeight())) {
            blocking.addAll(weightWarnings);
            checks.add(readinessCheck("RELATIONSHIP_WEIGHTS", "Relationship weights", "BLOCKED", String.join(" ", weightWarnings)));
            return;
        }
        if (!weightWarnings.isEmpty()) {
            warnings.addAll(weightWarnings);
            checks.add(readinessCheck("RELATIONSHIP_WEIGHTS", "Relationship weights", "WARNING", String.join(" ", weightWarnings)));
            return;
        }
        checks.add(readinessCheck("RELATIONSHIP_WEIGHTS", "Relationship weights", "PASS", "Relationship weights total 100% and are ready for scoring."));
    }

    private void addPrivacyPolicyCheck(
            FeedbackCampaign campaign,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks,
            List<String> warnings
    ) {
        List<String> anonymousRoles = new ArrayList<>();
        if (Boolean.TRUE.equals(campaign.getManagerFeedbackAnonymous())) anonymousRoles.add("manager");
        if (!Boolean.FALSE.equals(campaign.getPeerFeedbackAnonymous())) anonymousRoles.add("peer");
        if (!Boolean.FALSE.equals(campaign.getSubordinateFeedbackAnonymous())) anonymousRoles.add("direct report");
        if (Boolean.TRUE.equals(campaign.getSelfFeedbackAnonymous())) anonymousRoles.add("self");

        List<String> privacyWarnings = new ArrayList<>();
        if (Boolean.FALSE.equals(campaign.getPeerFeedbackAnonymous())) {
            privacyWarnings.add("Peer feedback is not anonymous. Confirm this policy before launching.");
        }
        if (Boolean.FALSE.equals(campaign.getSubordinateFeedbackAnonymous())) {
            privacyWarnings.add("Direct report feedback is not anonymous. Confirm this policy before launching.");
        }

        if (!privacyWarnings.isEmpty()) {
            warnings.addAll(privacyWarnings);
            checks.add(readinessCheck(
                    "PRIVACY_POLICY",
                    "Privacy settings",
                    "WARNING",
                    String.join(" ", privacyWarnings)
            ));
            return;
        }

        String message = anonymousRoles.isEmpty()
                ? "No anonymous feedback roles are enabled."
                : "Anonymous feedback enabled for " + String.join(", ", anonymousRoles) + " feedback.";
        checks.add(readinessCheck("PRIVACY_POLICY", "Privacy settings", "PASS", message));
    }

    private void addSubmissionWindowCheck(
            FeedbackCampaign campaign,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks,
            List<String> blocking,
            List<String> warnings
    ) {
        LocalDateTime now = LocalDateTime.now();
        if (campaign.getEndAt() != null && !campaign.getEndAt().isAfter(now)) {
            blocking.add("Campaign end date/time is already in the past.");
            checks.add(readinessCheck("SUBMISSION_WINDOW", "Submission window", "BLOCKED", "The end date/time has already passed."));
            return;
        }
        if (campaign.getStartAt() != null && campaign.getStartAt().isAfter(now)) {
            warnings.add("Campaign start date/time is in the future; activation will prepare assignments before collection begins.");
            checks.add(readinessCheck("SUBMISSION_WINDOW", "Submission window", "WARNING", "Start date/time is in the future. Evaluators should submit only during the campaign window."));
            return;
        }
        checks.add(readinessCheck("SUBMISSION_WINDOW", "Submission window", "PASS", "Campaign submission window is currently open."));
    }

    private boolean hasTargetWarnings(FeedbackRequest request) {
        return request != null
                && request.getTargetWarningSnapshot() != null
                && !request.getTargetWarningSnapshot().isBlank();
    }

    private FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck readinessCheck(
            String key,
            String label,
            String status,
            String message
    ) {
        return FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck.builder()
                .key(key)
                .label(label)
                .status(status)
                .message(message)
                .build();
    }

    private int resolveIncludedQuestionSelectionCount(Long campaignId) {
        try {
            FeedbackCampaignQuestionReviewResponse review = questionReviewService.getQuestionReview(campaignId);
            return review.getIncludedQuestionCount() == null ? 0 : review.getIncludedQuestionCount();
        } catch (RuntimeException ex) {
            return 0;
        }
    }

    private Map<FeedbackRelationshipType, FeedbackCampaignRelationshipWeight> relationshipWeightsByType(FeedbackCampaign campaign) {
        if (campaign == null || campaign.getId() == null) {
            return new EnumMap<>(FeedbackRelationshipType.class);
        }
        return relationshipWeightRepository.findByCampaignIdOrderByRelationshipTypeAsc(campaign.getId()).stream()
                .collect(Collectors.toMap(
                        FeedbackCampaignRelationshipWeight::getRelationshipType,
                        weight -> weight,
                        (left, right) -> left,
                        () -> new EnumMap<>(FeedbackRelationshipType.class)
                ));
    }

    private BigDecimal relationshipWeightTotal(Map<FeedbackRelationshipType, BigDecimal> weights) {
        return weights.values().stream()
                .filter(Objects::nonNull)
                .map(value -> value.setScale(2, RoundingMode.HALF_UP))
                .reduce(BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP), BigDecimal::add)
                .setScale(2, RoundingMode.HALF_UP);
    }

    private BigDecimal defaultRelationshipWeight(FeedbackRelationshipType type) {
        return switch (type) {
            case MANAGER -> new BigDecimal("40.00");
            case PEER -> new BigDecimal("30.00");
            case SUBORDINATE -> new BigDecimal("20.00");
            case SELF -> new BigDecimal("10.00");
        };
    }

    private List<String> relationshipWeightWarnings(
            FeedbackCampaign campaign,
            Map<FeedbackRelationshipType, BigDecimal> weights,
            List<FeedbackEvaluatorAssignment> assignments
    ) {
        if (campaign == null) return List.of();
        Map<Long, Set<FeedbackRelationshipType>> rolesByRequest = assignments.stream()
                .filter(assignment -> assignment.getFeedbackRequest() != null && assignment.getRelationshipType() != null)
                .collect(Collectors.groupingBy(
                        assignment -> assignment.getFeedbackRequest().getId(),
                        Collectors.mapping(FeedbackEvaluatorAssignment::getRelationshipType, Collectors.toCollection(() -> EnumSet.noneOf(FeedbackRelationshipType.class)))
                ));
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        List<FeedbackRelationshipType> weightedRoles = weights.entrySet().stream()
                .filter(entry -> entry.getValue() != null && entry.getValue().compareTo(BigDecimal.ZERO) > 0)
                .map(Map.Entry::getKey)
                .toList();
        if (weightedRoles.isEmpty()) return List.of();

        int targetsMissingWeightedRole = 0;
        for (FeedbackRequest request : requests) {
            Set<FeedbackRelationshipType> roles = rolesByRequest.getOrDefault(request.getId(), EnumSet.noneOf(FeedbackRelationshipType.class));
            boolean missing = weightedRoles.stream().anyMatch(role -> !roles.contains(role));
            if (missing) targetsMissingWeightedRole++;
        }
        if (targetsMissingWeightedRole <= 0) return List.of();
        String message = targetsMissingWeightedRole + " target(s) do not have every weighted evaluator role.";
        if (Boolean.TRUE.equals(campaign.getRedistributeMissingRelationshipWeight())) {
            return List.of(message + " Missing relationship weight will redistribute across that target's available submitted roles.");
        }
        return List.of(message + " Enable redistribution or adjust evaluator generation before activation.");
    }
}
