package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignActivationReadinessResponse;
import com.epms.dto.FeedbackCampaignCloseRequest;
import com.epms.dto.FeedbackCampaignMonitoringDtos.CloseReadinessChecklistItemDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.CloseReadinessDto;
import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackCampaignMonitoringResponse;
import com.epms.dto.FeedbackCampaignScoringConfigRequest;
import com.epms.dto.FeedbackCampaignScoringConfigResponse;
import com.epms.dto.FeedbackCampaignTargetsResponse;
import com.epms.dto.FeedbackReminderRequest;
import com.epms.dto.FeedbackReminderResponse;
import com.epms.dto.FeedbackTargetCandidateResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignEarlyCloseStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.FeedbackCampaignMonitoringService;
import com.epms.service.FeedbackCampaignLifecycleService;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import com.epms.service.FeedbackCampaignReadinessService;
import com.epms.service.FeedbackCampaignScoringConfigService;
import com.epms.service.FeedbackCampaignService;
import com.epms.service.FeedbackCampaignTargetService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignServiceImpl implements FeedbackCampaignService {

    private static final String DEFAULT_CAMPAIGN_TYPE = "360 Feedback";


    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackCampaignQuestionReviewService questionReviewService;
    private final FeedbackCampaignReadinessService campaignReadinessService;
    private final FeedbackCampaignMonitoringService feedbackCampaignMonitoringService;
    private final FeedbackCampaignLifecycleService campaignLifecycleService;
    private final FeedbackCampaignTargetService campaignTargetService;
    private final FeedbackCampaignScoringConfigService campaignScoringConfigService;

    @Override
    @Transactional
    public FeedbackCampaign createCampaign(FeedbackCampaignCreateRequest request, Long createdByUserId) {
        CampaignWindow window = resolveWindow(request);
        applyCampaignDefaults(request, window);
        validateCampaignMetadata(request, window);
        // Drafts may be saved for planning. Submission-window overlap is checked during launch readiness/activation.
        // New campaign setup is rule-based. formId is legacy-only and ignored here.

        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setName(request.getName().trim());
        campaign.setCampaignType(resolveCampaignType(request.getCampaignType()));
        campaign.setReviewYear(request.getReviewYear());
        campaign.setStartDate(window.startAt.toLocalDate());
        campaign.setEndDate(window.endAt.toLocalDate());
        campaign.setStartTime(window.startAt.toLocalTime());
        campaign.setEndTime(window.endAt.toLocalTime());
        campaign.setDescription(normalizeText(request.getDescription(), 2000));
        campaign.setInstructions(normalizeText(request.getInstructions(), 4000));
        campaign.setFormId(null);
        applyCampaignPolicy(campaign, request);
        campaign.setAutoSubmitCompletedDraftsOnClose(Boolean.TRUE.equals(request.getAutoSubmitCompletedDraftsOnClose()));
        campaign.setStatus(FeedbackCampaignStatus.DRAFT);
        campaign.setCreatedByUserId(createdByUserId);
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);
        campaignScoringConfigService.ensureDefaultRelationshipWeights(saved);
        auditLifecycleChange(createdByUserId, saved, null, FeedbackCampaignStatus.DRAFT, "Feedback campaign created");
        return saved;
    }

    @Override
    @Transactional
    public FeedbackCampaign updateDraftCampaign(Long campaignId, FeedbackCampaignCreateRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureDraftCampaign(campaign, "Only DRAFT campaigns can be edited.");

        CampaignWindow window = resolveWindow(request);
        applyCampaignDefaults(request, window);
        validateCampaignMetadata(request, window);
        // New campaign setup is rule-based. formId is legacy-only and ignored here.

        String oldValue = "name=" + campaign.getName() + ",campaignType=" + campaign.getCampaignType() + ",reviewYear=" + campaign.getReviewYear();
        campaign.setName(request.getName().trim());
        campaign.setCampaignType(resolveCampaignType(request.getCampaignType()));
        campaign.setReviewYear(request.getReviewYear());
        campaign.setStartDate(window.startAt.toLocalDate());
        campaign.setEndDate(window.endAt.toLocalDate());
        campaign.setStartTime(window.startAt.toLocalTime());
        campaign.setEndTime(window.endAt.toLocalTime());
        campaign.setDescription(normalizeText(request.getDescription(), 2000));
        campaign.setInstructions(normalizeText(request.getInstructions(), 4000));
        campaign.setFormId(null);
        applyCampaignPolicy(campaign, request);
        campaign.setAutoSubmitCompletedDraftsOnClose(Boolean.TRUE.equals(request.getAutoSubmitCompletedDraftsOnClose()));

        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_UPDATED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                saved.getId(),
                oldValue,
                "name=" + saved.getName() + ",campaignType=" + saved.getCampaignType() + ",reviewYear=" + saved.getReviewYear(),
                "Feedback campaign draft updated"
        );
        return saved;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaign getCampaignById(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackCampaign> getAllCampaigns() {
        return feedbackCampaignRepository.findAllByOrderByStartDateDesc();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackCampaign> getPendingEarlyCloseRequests() {
        return feedbackCampaignRepository.findByEarlyCloseRequestStatusOrderByEarlyCloseRequestedAtAsc(
                FeedbackCampaignEarlyCloseStatus.REQUESTED
        );
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackRequest> getRequestsForCampaign(Long campaignId) {
        return feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackTargetCandidateResponse> searchTargetCandidates(
            String search,
            Integer currentDepartmentId,
            Integer parentDepartmentId,
            Integer teamId,
            String readiness,
            String levelCode,
            Long actorUserId
    ) {
        return campaignTargetService.searchTargetCandidates(
                search,
                currentDepartmentId,
                parentDepartmentId,
                teamId,
                readiness,
                levelCode,
                actorUserId
        );
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignTargetsResponse getCampaignTargets(Long campaignId) {
        return campaignTargetService.getCampaignTargets(campaignId);
    }

    @Override
    @Transactional
    public FeedbackCampaignTargetsResponse updateTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId) {
        return campaignTargetService.updateTargets(campaignId, targetEmployeeIds, requestedByUserId);
    }

    @Override
    @Transactional
    public List<FeedbackRequest> replaceTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId) {
        return campaignTargetService.replaceTargets(campaignId, targetEmployeeIds, requestedByUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignScoringConfigResponse getScoringConfig(Long campaignId) {
        return campaignScoringConfigService.getScoringConfig(campaignId);
    }

    @Override
    @Transactional
    public FeedbackCampaignScoringConfigResponse updateScoringConfig(Long campaignId, FeedbackCampaignScoringConfigRequest request, Long actorUserId) {
        return campaignScoringConfigService.updateScoringConfig(campaignId, request, actorUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignActivationReadinessResponse getActivationReadiness(Long campaignId) {
        return campaignReadinessService.getActivationReadiness(campaignId);
    }

    @Override
    @Transactional
    public FeedbackCampaign markReadyToActivate(Long campaignId, Long actorUserId) {
        return campaignLifecycleService.markReadyToActivate(campaignId, actorUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignMonitoringResponse getCampaignMonitoring(Long campaignId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        return buildMonitoring(campaign);
    }

    @Override
    @Transactional
    public FeedbackCampaign activateCampaign(Long campaignId, Long actorUserId) {
        return campaignLifecycleService.activateCampaign(campaignId, actorUserId);
    }

    @Override
    @Transactional
    public FeedbackCampaign requestEarlyClose(Long campaignId, Long actorUserId, String reason) {
        return campaignLifecycleService.requestEarlyClose(campaignId, actorUserId, reason);
    }

    @Override
    @Transactional
    public FeedbackCampaign approveEarlyClose(Long campaignId, Long actorUserId, String reviewNote) {
        return campaignLifecycleService.approveEarlyClose(campaignId, actorUserId, reviewNote);
    }

    @Override
    @Transactional
    public FeedbackCampaign rejectEarlyClose(Long campaignId, Long actorUserId, String reviewNote) {
        return campaignLifecycleService.rejectEarlyClose(campaignId, actorUserId, reviewNote);
    }

    @Override
    @Transactional
    public FeedbackCampaign closeCampaign(Long campaignId, Long actorUserId) {
        return closeCampaignWithReadiness(campaignId, null, actorUserId);
    }

    @Override
    @Transactional
    public FeedbackCampaign closeCampaignWithReadiness(Long campaignId, FeedbackCampaignCloseRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return campaign;
        }
        if (campaign.getStatus() != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Only ACTIVE campaigns can be closed from monitoring.");
        }

        com.epms.dto.FeedbackCampaignMonitoringDtos.FeedbackCampaignMonitoringResponse monitoring = feedbackCampaignMonitoringService.getMonitoring(campaignId);
        CloseReadinessDto readiness = monitoring.getCloseReadiness();
        if (readiness == null || !Boolean.TRUE.equals(readiness.getCanClose())) {
            String blockerMessage = readiness == null
                    ? "Campaign close readiness could not be verified."
                    : readiness.getChecklist().stream()
                      .filter(item -> "BLOCKER".equals(item.getStatus()))
                      .map(CloseReadinessChecklistItemDto::getMessage)
                      .filter(message -> message != null && !message.isBlank())
                      .collect(Collectors.joining(" "));
            throw new BusinessValidationException(blockerMessage == null || blockerMessage.isBlank()
                    ? "Campaign is not ready to close. Resolve blocking issues first."
                    : blockerMessage);
        }

        boolean closeWithWarnings = Boolean.TRUE.equals(readiness.getCanCloseWithWarnings())
                || "CLOSE_WITH_WARNINGS".equalsIgnoreCase(readiness.getStatus());

        String requestMode = request == null ? null : normalizeText(request.getCloseMode(), 40);
        boolean acknowledgedWarnings = request != null && Boolean.TRUE.equals(request.getAcknowledgedWarnings());

        // Older close buttons in the campaign setup screen call this endpoint without a body.
        // Treat that as an explicit HR/Admin close-with-warnings request when readiness has only warnings.
        // Hard blockers are still blocked by the readiness.canClose check above.
        if (closeWithWarnings && request == null) {
            requestMode = "WITH_WARNINGS";
            acknowledgedWarnings = true;
        }

        if (closeWithWarnings && !acknowledgedWarnings) {
            throw new BusinessValidationException("Acknowledge the close warnings before closing this campaign.");
        }

        if (requestMode != null && requestMode.equalsIgnoreCase("STANDARD") && closeWithWarnings) {
            throw new BusinessValidationException("This campaign still has warnings. Use close with warnings and acknowledge them before closing.");
        }

        String reason = request == null ? "Closed from campaign action with warning acknowledgement." : normalizeText(request.getReason(), 1000);
        String readinessNote = closeWithWarnings
                ? "Readiness status=CLOSE_WITH_WARNINGS, warnings=" + readiness.getWarningCount()
                  + ", pendingAssignments=" + readiness.getPendingAssignments()
                  + ", overdueAssignments=" + readiness.getOverdueAssignments()
                  + ", privacyRiskTargets=" + readiness.getPrivacyRiskTargets()
                : "Readiness status=READY_TO_CLOSE";
        String finalReason = reason == null ? readinessNote : readinessNote + "; HR note=" + reason;
        return campaignLifecycleService.closeCampaignWithReadiness(campaignId, actorUserId, finalReason, closeWithWarnings);
    }

    @Override
    @Transactional
    public int closeExpiredCampaigns() {
        return campaignLifecycleService.closeExpiredCampaigns();
    }


    private void applyCampaignPolicy(FeedbackCampaign campaign, FeedbackCampaignCreateRequest request) {
        // Manager and self feedback are direct relationship records, so they are not configurable anonymity policies.
        campaign.setManagerFeedbackAnonymous(false);
        campaign.setPeerFeedbackAnonymous(!Boolean.FALSE.equals(request.getPeerFeedbackAnonymous()));
        campaign.setSubordinateFeedbackAnonymous(!Boolean.FALSE.equals(request.getSubordinateFeedbackAnonymous()));
        campaign.setSelfFeedbackAnonymous(false);
        campaign.setRedistributeMissingRelationshipWeight(!Boolean.FALSE.equals(request.getRedistributeMissingRelationshipWeight()));
    }

    private FeedbackCampaignMonitoringResponse buildMonitoring(FeedbackCampaign campaign) {
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaign.getId());
        Map<String, List<FeedbackEvaluatorAssignment>> byRole = assignments.stream()
                .collect(Collectors.groupingBy(assignment -> assignment.getRelationshipType() == null ? "UNKNOWN" : assignment.getRelationshipType().name()));
        List<FeedbackCampaignMonitoringResponse.RoleProgress> roleProgress = byRole.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> buildRoleProgress(entry.getKey(), entry.getValue()))
                .toList();

        Map<Long, List<FeedbackEvaluatorAssignment>> byRequest = assignments.stream()
                .filter(assignment -> assignment.getFeedbackRequest() != null)
                .collect(Collectors.groupingBy(assignment -> assignment.getFeedbackRequest().getId(), LinkedHashMap::new, Collectors.toList()));
        List<FeedbackCampaignMonitoringResponse.TargetProgress> targetProgress = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId()).stream()
                .map(request -> buildTargetProgress(request, byRequest.getOrDefault(request.getId(), List.of())))
                .toList();

        int total = assignments.size();
        int submitted = countAssignmentsByStatus(assignments, AssignmentStatus.SUBMITTED);
        int inProgress = countAssignmentsByStatus(assignments, AssignmentStatus.IN_PROGRESS);
        int cancelled = countAssignmentsByStatus(assignments, AssignmentStatus.CANCELLED);
        int notStarted = countAssignmentsByStatus(assignments, AssignmentStatus.PENDING);
        List<String> warnings = new ArrayList<>();
        if (campaign.getStatus() == FeedbackCampaignStatus.ACTIVE && total == 0) {
            warnings.add("Active campaign has no evaluator assignments.");
        }
        if (campaign.getEndAt() != null && campaign.getStatus() == FeedbackCampaignStatus.ACTIVE && LocalDateTime.now().isAfter(campaign.getEndAt())) {
            warnings.add("Campaign deadline has passed. Close the campaign when ready to lock submissions.");
        }

        return FeedbackCampaignMonitoringResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .campaignStatus(campaign.getStatus().name())
                .targetCount(targetProgress.size())
                .assignmentCount(total)
                .notStartedCount(notStarted)
                .inProgressCount(inProgress)
                .submittedCount(submitted)
                .cancelledCount(cancelled)
                .completionPercent(roundPercent(total == 0 ? 0.0 : submitted * 100.0 / total))
                .byRole(roleProgress)
                .targets(targetProgress)
                .warnings(warnings)
                .build();
    }

    private FeedbackCampaignMonitoringResponse.RoleProgress buildRoleProgress(String role, List<FeedbackEvaluatorAssignment> assignments) {
        int total = assignments.size();
        int submitted = countAssignmentsByStatus(assignments, AssignmentStatus.SUBMITTED);
        int inProgress = countAssignmentsByStatus(assignments, AssignmentStatus.IN_PROGRESS);
        int cancelled = countAssignmentsByStatus(assignments, AssignmentStatus.CANCELLED);
        int notStarted = countAssignmentsByStatus(assignments, AssignmentStatus.PENDING);
        return FeedbackCampaignMonitoringResponse.RoleProgress.builder()
                .role(role)
                .total(total)
                .notStarted(notStarted)
                .inProgress(inProgress)
                .submitted(submitted)
                .cancelled(cancelled)
                .completionPercent(roundPercent(total == 0 ? 0.0 : submitted * 100.0 / total))
                .build();
    }

    private FeedbackCampaignMonitoringResponse.TargetProgress buildTargetProgress(FeedbackRequest request, List<FeedbackEvaluatorAssignment> assignments) {
        int total = assignments.size();
        int submitted = countAssignmentsByStatus(assignments, AssignmentStatus.SUBMITTED);
        int inProgress = countAssignmentsByStatus(assignments, AssignmentStatus.IN_PROGRESS);
        int cancelled = countAssignmentsByStatus(assignments, AssignmentStatus.CANCELLED);
        int notStarted = countAssignmentsByStatus(assignments, AssignmentStatus.PENDING);
        String status = submitted == total && total > 0 ? "COMPLETE" : submitted > 0 || inProgress > 0 ? "IN_PROGRESS" : total == 0 ? "NO_ASSIGNMENTS" : "NOT_STARTED";
        return FeedbackCampaignMonitoringResponse.TargetProgress.builder()
                .requestId(request.getId())
                .targetEmployeeId(request.getTargetEmployeeId())
                .targetEmployeeName(displayTarget(request))
                .currentDepartmentName(request.getTargetCurrentDepartmentName())
                .assignmentCount(total)
                .notStartedCount(notStarted)
                .inProgressCount(inProgress)
                .submittedCount(submitted)
                .cancelledCount(cancelled)
                .completionPercent(roundPercent(total == 0 ? 0.0 : submitted * 100.0 / total))
                .status(status)
                .build();
    }

    private int countAssignmentsByStatus(List<FeedbackEvaluatorAssignment> assignments, AssignmentStatus status) {
        return (int) assignments.stream().filter(assignment -> assignment.getStatus() == status).count();
    }

    private String displayTarget(FeedbackRequest request) {
        if (request == null) {
            return "Unknown target";
        }
        if (request.getTargetEmployeeName() != null && !request.getTargetEmployeeName().isBlank()) {
            return request.getTargetEmployeeName();
        }
        return "Employee #" + request.getTargetEmployeeId();
    }

    private Double roundPercent(double value) {
        return Math.round(value * 100.0) / 100.0;
    }


    @Override
    @Transactional
    public FeedbackCampaign publishCampaign(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.PUBLISHED) {
            return campaign;
        }
        if (campaign.getStatus() != FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Only CLOSED campaigns can be published.");
        }
        FeedbackCampaignStatus oldStatus = campaign.getStatus();
        campaign.setStatus(FeedbackCampaignStatus.PUBLISHED);
        FeedbackCampaign saved = feedbackCampaignRepository.save(campaign);
        auditLifecycleChange(actorUserId, saved, oldStatus, FeedbackCampaignStatus.PUBLISHED, "Feedback campaign published");
        return saved;
    }

    @Override
    @Transactional
    public void deleteDraftCampaign(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureDraftCampaign(campaign, "Only draft campaigns can be deleted.");

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (!requests.isEmpty()) {
            assignmentRepository.deleteByFeedbackRequestCampaignId(campaignId);
            assignmentRepository.flush();
            feedbackRequestRepository.deleteAllInBatch(requests);
            feedbackRequestRepository.flush();
        }
        questionReviewService.clearCampaignQuestionSelection(campaignId);

        feedbackCampaignRepository.delete(campaign);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_DELETED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                "status=DRAFT",
                null,
                "Draft feedback campaign deleted"
        );
    }

    @Override
    @Transactional(readOnly = true)
    public long countAssignments(Long campaignId) {
        return feedbackRequestRepository.findByCampaignId(campaignId).stream()
                .mapToLong(request -> assignmentRepository.countByFeedbackRequestId(request.getId()))
                .sum();
    }

    @Override
    @Transactional
    public FeedbackReminderResponse sendPendingEvaluatorReminders(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Reminders can only be sent for ACTIVE feedback campaigns.");
        }

        FeedbackOperationalService.FeedbackReminderKind kind = LocalDateTime.now().isAfter(campaign.getEndAt())
                ? FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                : FeedbackOperationalService.FeedbackReminderKind.DEADLINE;

        FeedbackOperationalService.NotificationDeliveryResult result = feedbackOperationalService.notifyPendingEvaluatorReminders(campaign, kind, true);

        if (actorUserId != null) {
            feedbackOperationalService.audit(
                    actorUserId,
                    kind == FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                            ? FeedbackOperationalService.OVERDUE_REMINDERS_SENT
                            : FeedbackOperationalService.DEADLINE_REMINDERS_SENT,
                    FeedbackOperationalService.ENTITY_CAMPAIGN,
                    campaignId,
                    null,
                    "pendingAssignments=" + result.getCandidateCount() + ", notifiedAssignments=" + result.getSentCount()
                            + ", notifiedUsers=" + result.getUniqueUserCount() + ", skippedAssignments=" + result.getSkippedCount(),
                    kind == FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                            ? "Overdue 360 feedback reminders sent"
                            : "Pending 360 feedback reminders sent"
            );
        }

        return FeedbackReminderResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .pendingAssignmentCount(result.getCandidateCount())
                .notifiedEvaluatorCount(result.getSentCount())
                .skippedAssignmentCount(result.getSkippedCount())
                .notifiedUserCount(result.getUniqueUserCount())
                .reminderScope("CAMPAIGN")
                .onlyOverdue(kind == FeedbackOperationalService.FeedbackReminderKind.OVERDUE)
                .warnings(result.getWarnings())
                .build();
    }

    @Override
    @Transactional
    public FeedbackReminderResponse sendScopedEvaluatorReminders(Long campaignId, FeedbackReminderRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Reminders can only be sent for ACTIVE feedback campaigns.");
        }

        FeedbackReminderRequest safeRequest = request == null ? new FeedbackReminderRequest() : request;
        String scope = normalizeReminderScope(safeRequest.getScope());
        FeedbackRelationshipType relationship = parseReminderRelationship(safeRequest.getRelationshipType());
        boolean onlyOverdue = Boolean.TRUE.equals(safeRequest.getOnlyOverdue());

        validateReminderScope(scope, safeRequest, relationship);

        List<FeedbackEvaluatorAssignment> candidates = assignmentRepository.findByCampaignIdWithRequest(campaignId).stream()
                .filter(assignment -> isPendingReminderCandidate(assignment))
                .filter(assignment -> matchesReminderScope(scope, safeRequest, relationship, assignment))
                .filter(assignment -> !onlyOverdue || isAssignmentPastDue(campaign, assignment))
                .toList();

        FeedbackOperationalService.FeedbackReminderKind kind = resolveReminderKind(campaign, onlyOverdue);

        FeedbackOperationalService.NotificationDeliveryResult result = feedbackOperationalService.notifyEvaluatorReminders(campaign, candidates, kind, true);
        List<Long> assignmentIds = candidates.stream()
                .map(FeedbackEvaluatorAssignment::getId)
                .toList();

        if (actorUserId != null) {
            feedbackOperationalService.audit(
                    actorUserId,
                    kind == FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                            ? FeedbackOperationalService.OVERDUE_REMINDERS_SENT
                            : FeedbackOperationalService.DEADLINE_REMINDERS_SENT,
                    FeedbackOperationalService.ENTITY_CAMPAIGN,
                    campaignId,
                    null,
                    buildScopedReminderAuditValue(scope, safeRequest, relationship, onlyOverdue, result, assignmentIds),
                    kind == FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                            ? "Scoped overdue 360 feedback reminders sent"
                            : "Scoped pending 360 feedback reminders sent"
            );
        }

        return FeedbackReminderResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .pendingAssignmentCount(result.getCandidateCount())
                .notifiedEvaluatorCount(result.getSentCount())
                .skippedAssignmentCount(result.getSkippedCount())
                .notifiedUserCount(result.getUniqueUserCount())
                .reminderScope(scope)
                .targetEmployeeId(safeRequest.getTargetEmployeeId())
                .evaluatorEmployeeId(safeRequest.getEvaluatorEmployeeId())
                .relationshipType(relationship == null ? null : relationship.name())
                .assignmentIds(assignmentIds)
                .onlyOverdue(onlyOverdue)
                .warnings(result.getWarnings())
                .build();
    }

    private String normalizeReminderScope(String rawScope) {
        String normalized = rawScope == null ? "CAMPAIGN" : rawScope.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        return switch (normalized) {
            case "TARGET", "RELATIONSHIP", "TARGET_RELATIONSHIP", "EVALUATOR", "ASSIGNMENTS", "CAMPAIGN" -> normalized;
            default -> throw new BusinessValidationException("Unsupported reminder scope: " + rawScope + ".");
        };
    }

    private FeedbackRelationshipType parseReminderRelationship(String rawRelationship) {
        String normalized = normalizeText(rawRelationship, 80);
        if (normalized == null || normalized.isBlank()) {
            return null;
        }
        normalized = normalized.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        if ("DIRECT_REPORT".equals(normalized) || "DIRECT_REPORTS".equals(normalized)) {
            normalized = "SUBORDINATE";
        }
        try {
            return FeedbackRelationshipType.valueOf(normalized);
        } catch (IllegalArgumentException ex) {
            throw new BusinessValidationException("Unsupported reminder relationship: " + rawRelationship + ".");
        }
    }

    private void validateReminderScope(String scope, FeedbackReminderRequest request, FeedbackRelationshipType relationship) {
        switch (scope) {
            case "TARGET" -> requireReminderValue(request.getTargetEmployeeId(), "Target employee is required for a target reminder.");
            case "RELATIONSHIP" -> {
                if (relationship == null) {
                    throw new BusinessValidationException("Relationship type is required for a relationship reminder.");
                }
            }
            case "TARGET_RELATIONSHIP" -> {
                requireReminderValue(request.getTargetEmployeeId(), "Target employee is required for a target relationship reminder.");
                if (relationship == null) {
                    throw new BusinessValidationException("Relationship type is required for a target relationship reminder.");
                }
            }
            case "EVALUATOR" -> requireReminderValue(request.getEvaluatorEmployeeId(), "Evaluator employee is required for an evaluator reminder.");
            case "ASSIGNMENTS" -> {
                if (request.getAssignmentIds() == null || request.getAssignmentIds().isEmpty()) {
                    throw new BusinessValidationException("At least one assignment ID is required for an assignment reminder.");
                }
            }
            case "CAMPAIGN" -> {
                // No additional scope fields needed.
            }
            default -> throw new BusinessValidationException("Unsupported reminder scope: " + scope + ".");
        }
    }

    private void requireReminderValue(Long value, String message) {
        if (value == null || value <= 0) {
            throw new BusinessValidationException(message);
        }
    }

    private boolean matchesReminderScope(
            String scope,
            FeedbackReminderRequest request,
            FeedbackRelationshipType relationship,
            FeedbackEvaluatorAssignment assignment
    ) {
        FeedbackRequest feedbackRequest = assignment.getFeedbackRequest();
        return switch (scope) {
            case "TARGET" -> sameLong(feedbackRequest.getTargetEmployeeId(), request.getTargetEmployeeId());
            case "RELATIONSHIP" -> assignment.getRelationshipType() == relationship;
            case "TARGET_RELATIONSHIP" -> sameLong(feedbackRequest.getTargetEmployeeId(), request.getTargetEmployeeId())
                    && assignment.getRelationshipType() == relationship;
            case "EVALUATOR" -> sameLong(assignment.getEvaluatorEmployeeId(), request.getEvaluatorEmployeeId());
            case "ASSIGNMENTS" -> request.getAssignmentIds() != null && request.getAssignmentIds().contains(assignment.getId());
            case "CAMPAIGN" -> true;
            default -> false;
        };
    }

    private boolean isPendingReminderCandidate(FeedbackEvaluatorAssignment assignment) {
        return assignment != null
                && (assignment.getStatus() == AssignmentStatus.PENDING || assignment.getStatus() == AssignmentStatus.IN_PROGRESS);
    }

    private FeedbackOperationalService.FeedbackReminderKind resolveReminderKind(FeedbackCampaign campaign, boolean onlyOverdue) {
        LocalDateTime deadline = campaign.getEndAt();
        return onlyOverdue || (deadline != null && LocalDateTime.now().isAfter(deadline))
                ? FeedbackOperationalService.FeedbackReminderKind.OVERDUE
                : FeedbackOperationalService.FeedbackReminderKind.DEADLINE;
    }

    private boolean isAssignmentPastDue(FeedbackCampaign campaign, FeedbackEvaluatorAssignment assignment) {
        LocalDateTime dueAt = assignment.getFeedbackRequest() == null ? null : assignment.getFeedbackRequest().getDueAt();
        LocalDateTime deadline = dueAt != null ? dueAt : campaign.getEndAt();
        return deadline != null && deadline.isBefore(LocalDateTime.now());
    }

    private boolean sameLong(Long left, Long right) {
        return left != null && right != null && left.equals(right);
    }

    private String buildScopedReminderAuditValue(
            String scope,
            FeedbackReminderRequest request,
            FeedbackRelationshipType relationship,
            boolean onlyOverdue,
            FeedbackOperationalService.NotificationDeliveryResult result,
            List<Long> assignmentIds
    ) {
        Set<String> values = new LinkedHashSet<>();
        values.add("scope=" + scope);
        if (request.getTargetEmployeeId() != null) values.add("targetEmployeeId=" + request.getTargetEmployeeId());
        if (request.getEvaluatorEmployeeId() != null) values.add("evaluatorEmployeeId=" + request.getEvaluatorEmployeeId());
        if (relationship != null) values.add("relationshipType=" + relationship.name());
        values.add("onlyOverdue=" + onlyOverdue);
        values.add("pendingAssignments=" + result.getCandidateCount());
        values.add("notifiedAssignments=" + result.getSentCount());
        values.add("notifiedUsers=" + result.getUniqueUserCount());
        values.add("skippedAssignments=" + result.getSkippedCount());
        values.add("assignmentIds=" + assignmentIds);
        return String.join(", ", values);
    }


    private void applyCampaignDefaults(FeedbackCampaignCreateRequest request, CampaignWindow window) {
        if (request.getReviewYear() == null) {
            request.setReviewYear(window.startAt.getYear());
        }
    }


    private String resolveCampaignType(String campaignType) {
        String normalized = normalizeText(campaignType, 80);
        return normalized == null || normalized.isBlank() ? DEFAULT_CAMPAIGN_TYPE : normalized;
    }

    private CampaignWindow resolveWindow(FeedbackCampaignCreateRequest request) {
        LocalDateTime startAt = request.getStartAt();
        LocalDateTime endAt = request.getEndAt();

        if (startAt == null && request.getStartDate() != null) {
            startAt = request.getStartDate().atTime(LocalTime.of(9, 0));
        }
        if (endAt == null && request.getEndDate() != null) {
            endAt = request.getEndDate().atTime(LocalTime.of(17, 0));
        }

        if (startAt == null || endAt == null) {
            throw new BusinessValidationException("Campaign start and end date/time are required.");
        }

        LocalDateTime now = LocalDateTime.now().withSecond(0).withNano(0);
        if (startAt.isBefore(now)) {
            throw new BusinessValidationException("Campaign start date/time cannot be in the past.");
        }
        if (endAt.isBefore(now)) {
            throw new BusinessValidationException("Campaign end date/time cannot be in the past.");
        }
        if (!startAt.isBefore(endAt)) {
            throw new BusinessValidationException("Campaign start date/time must be earlier than the end date/time.");
        }
        return new CampaignWindow(startAt, endAt);
    }

    private void validateCampaignMetadata(FeedbackCampaignCreateRequest request, CampaignWindow window) {
        if (request.getName() == null || request.getName().trim().isBlank()) {
            throw new BusinessValidationException("Campaign name is required.");
        }
        if (request.getName().trim().length() > 255) {
            throw new BusinessValidationException("Campaign name cannot exceed 255 characters.");
        }
        if (request.getReviewYear() == null) {
            throw new BusinessValidationException("Review year is required.");
        }
        if (request.getCampaignType() != null && request.getCampaignType().trim().length() > 80) {
            throw new BusinessValidationException("Campaign type cannot exceed 80 characters.");
        }
        if (window.startAt.toLocalDate().isAfter(window.endAt.toLocalDate())) {
            throw new BusinessValidationException("Campaign start date cannot be after end date.");
        }
        if (window.startAt.getYear() != request.getReviewYear() && window.endAt.getYear() != request.getReviewYear()) {
            throw new BusinessValidationException("Campaign window should belong to the selected review year.");
        }
        if (request.getDescription() != null && request.getDescription().length() > 2000) {
            throw new BusinessValidationException("Campaign description cannot exceed 2,000 characters.");
        }
        if (request.getInstructions() != null && request.getInstructions().length() > 4000) {
            throw new BusinessValidationException("Campaign instructions cannot exceed 4,000 characters.");
        }
    }


    private void ensureDraftCampaign(FeedbackCampaign campaign, String message) {
        if (campaign.getStatus() != FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException(message);
        }
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


    private static class CampaignWindow {
        private final LocalDateTime startAt;
        private final LocalDateTime endAt;

        private CampaignWindow(LocalDateTime startAt, LocalDateTime endAt) {
            this.startAt = startAt;
            this.endAt = endAt;
        }
    }
}
