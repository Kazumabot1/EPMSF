package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignActivationReadinessResponse;
import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignEarlyCloseStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.service.FeedbackCampaignLifecycleService;
import com.epms.service.FeedbackCampaignReadinessService;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.FeedbackAssignmentQuestionSnapshotService;
import com.epms.service.FeedbackSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignLifecycleServiceImpl implements FeedbackCampaignLifecycleService {

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final FeedbackCampaignReadinessService readinessService;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackSummaryService feedbackSummaryService;
    private final FeedbackAssignmentQuestionSnapshotService assignmentQuestionSnapshotService;

    @Override
    @Transactional
    public FeedbackCampaign markReadyToActivate(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.READY_TO_ACTIVATE) {
            return campaign;
        }
        ensureDraftCampaign(campaign, "Only DRAFT campaigns can be validated for activation.");
        FeedbackCampaignActivationReadinessResponse readiness = readinessService.buildActivationReadiness(campaign);
        if (!readiness.getBlockingIssues().isEmpty()) {
            throw new BusinessValidationException("Campaign setup is not ready: " + String.join(" ", readiness.getBlockingIssues()));
        }

        FeedbackCampaignStatus oldStatus = campaign.getStatus();
        campaign.setStatus(FeedbackCampaignStatus.READY_TO_ACTIVATE);
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);
        auditLifecycleChange(actorUserId, saved, oldStatus, FeedbackCampaignStatus.READY_TO_ACTIVATE, "Feedback campaign setup validated");
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign activateCampaign(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.ACTIVE) {
            return campaign;
        }
        if (campaign.getStatus() != FeedbackCampaignStatus.READY_TO_ACTIVATE) {
            if (campaign.getStatus() == FeedbackCampaignStatus.DRAFT) {
                throw new BusinessValidationException("Validate the campaign setup first. Only READY_TO_ACTIVATE campaigns can be activated.");
            }
            throw new BusinessValidationException("Only READY_TO_ACTIVATE campaigns can be activated.");
        }
        FeedbackCampaignActivationReadinessResponse readiness = readinessService.buildActivationReadiness(campaign);
        if (!readiness.getBlockingIssues().isEmpty()) {
            throw new BusinessValidationException("Campaign cannot be activated: " + String.join(" ", readiness.getBlockingIssues()));
        }

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        requests.forEach(request -> {
            if (request.getStatus() == FeedbackRequestStatus.CANCELLED) {
                request.setStatus(FeedbackRequestStatus.PENDING);
            }
        });
        feedbackRequestRepository.saveAll(requests);

        assignmentQuestionSnapshotService.snapshotCampaignAssignments(campaignId);
        FeedbackCampaignActivationReadinessResponse afterSnapshot = readinessService.buildActivationReadiness(campaign);
        if (afterSnapshot.getSummary().getAssignmentQuestionSnapshotCount() == null
                || afterSnapshot.getSummary().getAssignmentQuestionSnapshotCount() <= 0) {
            throw new BusinessValidationException("Activation failed because assignment question snapshots could not be generated.");
        }

        FeedbackCampaignStatus oldStatus = campaign.getStatus();
        campaign.setStatus(FeedbackCampaignStatus.ACTIVE);
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);
        auditLifecycleChange(actorUserId, saved, oldStatus, FeedbackCampaignStatus.ACTIVE, "Feedback campaign activated with final assignment question snapshots");
        feedbackOperationalService.notifyCampaignActivated(saved);
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign requestEarlyClose(Long campaignId, Long actorUserId, String reason) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureActiveCampaign(campaign);
        if (!isBeforeDeadline(campaign)) {
            throw new BusinessValidationException("Early close approval is only needed before the campaign deadline. Close or let the scheduler close after the deadline.");
        }
        AssignmentCounts counts = assignmentCounts(campaignId);
        if (counts.totalAssignments() == 0) {
            throw new BusinessValidationException("Cannot request early close before evaluator assignments are generated.");
        }
        if (counts.submittedAssignments() < counts.totalAssignments()) {
            throw new BusinessValidationException("Early close can be requested only after all evaluators submit final feedback. Pending assignments: "
                    + counts.pendingAssignments() + ".");
        }

        FeedbackCampaignEarlyCloseStatus oldStatus = campaign.getEarlyCloseRequestStatus();
        campaign.setEarlyCloseRequestStatus(FeedbackCampaignEarlyCloseStatus.REQUESTED);
        campaign.setEarlyCloseRequestedAt(LocalDateTime.now());
        campaign.setEarlyCloseRequestedByUserId(actorUserId);
        campaign.setEarlyCloseRequestReason(normalizeText(reason, 1000));
        campaign.setEarlyCloseReviewedAt(null);
        campaign.setEarlyCloseReviewedByUserId(null);
        campaign.setEarlyCloseReviewReason(null);
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);

        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_EARLY_CLOSE_REQUESTED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                saved.getId(),
                "earlyCloseStatus=" + oldStatus,
                "earlyCloseStatus=REQUESTED,totalAssignments=" + counts.totalAssignments() + ",submittedAssignments=" + counts.submittedAssignments(),
                "Early close requested: " + saved.getEarlyCloseRequestReason()
        );
        feedbackOperationalService.notifyEarlyCloseRequested(saved, counts.totalAssignments(), counts.submittedAssignments());
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign approveEarlyClose(Long campaignId, Long actorUserId, String reviewNote) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureActiveCampaign(campaign);
        if (campaign.getEarlyCloseRequestStatus() != FeedbackCampaignEarlyCloseStatus.REQUESTED) {
            throw new BusinessValidationException("No pending early close request exists for this campaign.");
        }
        if (!isBeforeDeadline(campaign)) {
            return closeCampaign(campaignId, actorUserId);
        }
        AssignmentCounts counts = assignmentCounts(campaignId);
        if (counts.totalAssignments() == 0 || counts.submittedAssignments() < counts.totalAssignments()) {
            throw new BusinessValidationException("This campaign is no longer eligible for early close because not all evaluators have submitted final feedback.");
        }

        campaign.setEarlyCloseRequestStatus(FeedbackCampaignEarlyCloseStatus.APPROVED);
        campaign.setEarlyCloseReviewedAt(LocalDateTime.now());
        campaign.setEarlyCloseReviewedByUserId(actorUserId);
        campaign.setEarlyCloseReviewReason(normalizeText(reviewNote, 1000));
        feedbackCampaignRepository.save(campaign);

        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_EARLY_CLOSE_APPROVED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaign.getId(),
                "earlyCloseStatus=REQUESTED",
                "earlyCloseStatus=APPROVED,totalAssignments=" + counts.totalAssignments() + ",submittedAssignments=" + counts.submittedAssignments(),
                "Early close approved" + noteSuffix(reviewNote)
        );

        FeedbackCampaign closed = closeCampaignInternal(campaign, actorUserId, true,
                "Early close approved by Admin" + noteSuffix(reviewNote), false);
        feedbackOperationalService.notifyEarlyCloseReviewed(closed, true);
        return closed;
    }

    @Override
    @Transactional
    public FeedbackCampaign rejectEarlyClose(Long campaignId, Long actorUserId, String reviewNote) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureActiveCampaign(campaign);
        if (campaign.getEarlyCloseRequestStatus() != FeedbackCampaignEarlyCloseStatus.REQUESTED) {
            throw new BusinessValidationException("No pending early close request exists for this campaign.");
        }

        campaign.setEarlyCloseRequestStatus(FeedbackCampaignEarlyCloseStatus.REJECTED);
        campaign.setEarlyCloseReviewedAt(LocalDateTime.now());
        campaign.setEarlyCloseReviewedByUserId(actorUserId);
        campaign.setEarlyCloseReviewReason(normalizeText(reviewNote, 1000));
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);

        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_EARLY_CLOSE_REJECTED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                saved.getId(),
                "earlyCloseStatus=REQUESTED",
                "earlyCloseStatus=REJECTED",
                "Early close rejected" + noteSuffix(reviewNote)
        );
        feedbackOperationalService.notifyEarlyCloseReviewed(saved, false);
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign closeCampaign(Long campaignId, Long actorUserId) {
        return closeCampaignWithReadiness(campaignId, actorUserId, null, false);
    }

    @Override
    @Transactional
    public FeedbackCampaign closeCampaignWithReadiness(Long campaignId, Long actorUserId, String reason, boolean closeWithWarnings) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return campaign;
        }
        ensureActiveCampaign(campaign);
        boolean earlyClose = isBeforeDeadline(campaign);
        String baseReason;
        if (closeWithWarnings) {
            baseReason = earlyClose
                    ? "Feedback campaign closed with warnings by HR before the scheduled deadline"
                    : "Feedback campaign closed with warnings after scheduled deadline";
        } else {
            baseReason = earlyClose
                    ? "Feedback campaign manually closed by HR before the scheduled deadline"
                    : "Feedback campaign closed after scheduled deadline";
        }
        String normalizedReason = normalizeText(reason, 1000);
        String closeReason = normalizedReason == null ? baseReason : baseReason + ": " + normalizedReason;
        return closeCampaignInternal(campaign, actorUserId, earlyClose, closeReason, true);
    }

    @Override
    @Transactional
    public int closeExpiredCampaigns() {
        LocalDateTime now = LocalDateTime.now();
        List<FeedbackCampaign> activeCampaigns = feedbackCampaignRepository.findByStatusOrderByStartDateDesc(FeedbackCampaignStatus.ACTIVE);
        int closed = 0;
        for (FeedbackCampaign campaign : activeCampaigns) {
            LocalDateTime endAt = campaign.getEndAt();
            if (endAt != null && !endAt.isAfter(now)) {
                closeCampaignInternal(campaign, null, false, "Feedback campaign automatically closed at scheduled deadline", true);
                closed++;
            }
        }
        return closed;
    }

    private FeedbackCampaign closeCampaignInternal(
            FeedbackCampaign campaign,
            Long actorUserId,
            boolean earlyClose,
            String closeReason,
            boolean allowAutoSubmit
    ) {
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return campaign;
        }
        ensureActiveCampaign(campaign);

        AutoSubmitCloseResult autoSubmitResult = allowAutoSubmit
                && Boolean.TRUE.equals(campaign.getAutoSubmitCompletedDraftsOnClose())
                ? autoSubmitCompletedDraftsOnClose(campaign, actorUserId)
                : AutoSubmitCloseResult.empty();

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        for (FeedbackRequest request : requests) {
            if (request.getStatus() == FeedbackRequestStatus.CANCELLED) {
                continue;
            }
            long totalAssignments = assignmentRepository.countByFeedbackRequestId(request.getId());
            long submittedAssignments = assignmentRepository.countByFeedbackRequestIdAndStatus(request.getId(), AssignmentStatus.SUBMITTED);
            if (totalAssignments > 0 && submittedAssignments == totalAssignments) {
                request.setStatus(FeedbackRequestStatus.COMPLETED);
            } else if (request.getStatus() == FeedbackRequestStatus.PENDING) {
                request.setStatus(FeedbackRequestStatus.IN_PROGRESS);
            }
        }
        feedbackRequestRepository.saveAll(requests);
        assignmentQuestionSnapshotService.snapshotCampaignAssignments(campaign.getId());

        FeedbackCampaignStatus oldStatus = campaign.getStatus();
        campaign.setStatus(FeedbackCampaignStatus.CLOSED);
        campaign.setClosedAt(LocalDateTime.now());
        campaign.setClosedByUserId(actorUserId);
        campaign.setClosedEarly(earlyClose);
        campaign.setCloseReason(closeReason);
        if (!earlyClose && campaign.getEarlyCloseRequestStatus() == FeedbackCampaignEarlyCloseStatus.REQUESTED) {
            campaign.setEarlyCloseRequestStatus(FeedbackCampaignEarlyCloseStatus.REJECTED);
            campaign.setEarlyCloseReviewedAt(LocalDateTime.now());
            campaign.setEarlyCloseReviewedByUserId(actorUserId);
            campaign.setEarlyCloseReviewReason("Campaign reached the scheduled deadline before Admin review.");
        }
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);

        auditLifecycleChange(actorUserId, saved, oldStatus, FeedbackCampaignStatus.CLOSED,
                autoSubmitResult.submittedCount() > 0
                        ? closeReason + "; auto-submitted " + autoSubmitResult.submittedCount() + " completed draft(s)"
                        : closeReason);
        feedbackSummaryService.recalculateCampaignSummary(saved.getId());
        return saved;
    }

    private AutoSubmitCloseResult autoSubmitCompletedDraftsOnClose(FeedbackCampaign campaign, Long actorUserId) {
        List<FeedbackResponse> drafts = feedbackResponseRepository.findByCampaignIdAndStatusWithItems(
                campaign.getId(),
                ResponseStatus.DRAFT
        );
        if (drafts.isEmpty()) {
            return AutoSubmitCloseResult.empty();
        }

        int submitted = 0;
        int skippedIncomplete = 0;

        for (FeedbackResponse response : drafts) {
            FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
            if (assignment == null || assignment.getStatus() == AssignmentStatus.SUBMITTED
                    || assignment.getStatus() == AssignmentStatus.CANCELLED) {
                continue;
            }
            if (!hasAllRequiredRatings(response, assignmentQuestionSnapshotService.findOrCreateAssignmentQuestions(assignment))) {
                skippedIncomplete++;
                continue;
            }

            AssignmentStatus oldAssignmentStatus = assignment.getStatus();
            response.setFinalStatus(ResponseStatus.SUBMITTED);
            response.setSubmittedAt(LocalDateTime.now());
            assignment.setStatus(AssignmentStatus.SUBMITTED);

            feedbackResponseRepository.save(response);
            assignmentRepository.save(assignment);
            feedbackOperationalService.audit(
                    actorUserId,
                    FeedbackOperationalService.DRAFT_AUTO_SUBMITTED_ON_CLOSE,
                    FeedbackOperationalService.ENTITY_RESPONSE,
                    response.getId(),
                    "status=DRAFT,assignmentStatus=" + oldAssignmentStatus,
                    "status=SUBMITTED,trigger=SCHEDULED_CAMPAIGN_CLOSE,score=" + response.getOverallScore(),
                    "Completed draft automatically submitted when campaign reached the scheduled deadline"
            );
            feedbackOperationalService.notifyDraftAutoSubmittedOnClose(campaign, assignment);
            submitted++;
        }

        return new AutoSubmitCloseResult(submitted, skippedIncomplete);
    }

    private boolean hasAllRequiredRatings(FeedbackResponse response, List<FeedbackAssignmentQuestion> assignmentQuestions) {
        Set<Long> requiredAssignmentQuestionIds = assignmentQuestions.stream()
                .filter(question -> Boolean.TRUE.equals(question.getRequired()))
                .map(FeedbackAssignmentQuestion::getId)
                .collect(Collectors.toSet());
        if (requiredAssignmentQuestionIds.isEmpty()) {
            return true;
        }

        Map<Long, Long> assignmentQuestionIdByLegacyQuestionId = assignmentQuestions.stream()
                .filter(question -> question.getSourceQuestion() != null && question.getSourceQuestion().getId() != null)
                .collect(Collectors.toMap(question -> question.getSourceQuestion().getId(), FeedbackAssignmentQuestion::getId, (first, duplicate) -> first));

        Set<Long> answeredRequiredQuestionIds = new HashSet<>();
        for (FeedbackResponseItem item : response.getItems()) {
            if (item == null || item.getRatingValue() == null) {
                continue;
            }
            Long assignmentQuestionId = item.getAssignmentQuestion() != null ? item.getAssignmentQuestion().getId() : null;
            if (assignmentQuestionId == null && item.getQuestion() != null) {
                assignmentQuestionId = assignmentQuestionIdByLegacyQuestionId.get(item.getQuestion().getId());
            }
            if (assignmentQuestionId != null && requiredAssignmentQuestionIds.contains(assignmentQuestionId)) {
                answeredRequiredQuestionIds.add(assignmentQuestionId);
            }
        }
        return answeredRequiredQuestionIds.containsAll(requiredAssignmentQuestionIds);
    }

    private FeedbackCampaign getCampaignById(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    private void ensureDraftCampaign(FeedbackCampaign campaign, String message) {
        if (campaign.getStatus() != FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException(message);
        }
    }

    private void ensureActiveCampaign(FeedbackCampaign campaign) {
        if (campaign.getStatus() != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Only ACTIVE campaigns can be closed or reviewed for early close.");
        }
    }

    private boolean isBeforeDeadline(FeedbackCampaign campaign) {
        LocalDateTime endAt = campaign.getEndAt();
        return endAt != null && LocalDateTime.now().isBefore(endAt);
    }

    private AssignmentCounts assignmentCounts(Long campaignId) {
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaignId).stream()
                .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
                .toList();
        long submitted = assignments.stream()
                .filter(assignment -> assignment.getStatus() == AssignmentStatus.SUBMITTED)
                .count();
        return new AssignmentCounts(assignments.size(), submitted);
    }

    private String noteSuffix(String note) {
        String normalized = normalizeText(note, 1000);
        return normalized == null || normalized.isBlank() ? "" : ": " + normalized;
    }

    private void auditLifecycleChange(
            Long actorUserId,
            FeedbackCampaign campaign,
            FeedbackCampaignStatus oldStatus,
            FeedbackCampaignStatus newStatus,
            String reason
    ) {
        String action = switch (newStatus) {
            case DRAFT -> FeedbackOperationalService.CAMPAIGN_CREATED;
            case READY_TO_ACTIVATE -> FeedbackOperationalService.CAMPAIGN_READY_TO_ACTIVATE;
            case ACTIVE -> FeedbackOperationalService.CAMPAIGN_ACTIVATED;
            case CLOSED -> FeedbackOperationalService.CAMPAIGN_CLOSED;
            case PUBLISHED -> FeedbackOperationalService.CAMPAIGN_PUBLISHED;
        };
        feedbackOperationalService.audit(
                actorUserId,
                action,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaign.getId(),
                oldStatus != null ? "status=" + oldStatus : null,
                "status=" + newStatus,
                reason
        );
    }

    private String normalizeText(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isBlank()) {
            return null;
        }
        return trimmed.length() > maxLength ? trimmed.substring(0, maxLength) : trimmed;
    }

    private record AssignmentCounts(long totalAssignments, long submittedAssignments) {
        long pendingAssignments() {
            return Math.max(0, totalAssignments - submittedAssignments);
        }
    }

    private record AutoSubmitCloseResult(int submittedCount, int skippedIncompleteCount) {
        private static AutoSubmitCloseResult empty() {
            return new AutoSubmitCloseResult(0, 0);
        }
    }
}
