package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignActivationReadinessResponse;
import com.epms.dto.FeedbackCampaignCreateRequest;
import com.epms.dto.FeedbackCampaignMonitoringResponse;
import com.epms.dto.FeedbackCampaignRelationshipWeightRequest;
import com.epms.dto.FeedbackCampaignScoringConfigRequest;
import com.epms.dto.FeedbackCampaignScoringConfigResponse;
import com.epms.dto.FeedbackRelationshipWeightResponse;
import com.epms.dto.FeedbackCampaignQuestionReviewResponse;
import com.epms.dto.FeedbackCampaignTargetResponse;
import com.epms.dto.FeedbackCampaignTargetsResponse;
import com.epms.dto.FeedbackReminderResponse;
import com.epms.dto.FeedbackTargetCandidateResponse;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignRelationshipWeight;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.Position;
import com.epms.entity.PositionLevel;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignEarlyCloseStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackAssignmentQuestionRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackCampaignRelationshipWeightRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import com.epms.service.FeedbackCampaignService;
import com.epms.service.FeedbackQuestionResolverService;
import com.epms.service.FeedbackSummaryService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignServiceImpl implements FeedbackCampaignService {

    private static final String DEFAULT_CAMPAIGN_TYPE = "360 Feedback";
    private static final Set<String> TARGET_LEVEL_CODES = Set.of("L04", "L05", "L06", "L07");
    private static final Set<String> TARGET_EXCLUDED_ROLES = Set.of(
            "ADMIN", "HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES", "HR_MANAGER", "HR_ADMIN",
            "CEO", "EXECUTIVE"
    );

    private static final List<FeedbackCampaignStatus> OVERLAP_BLOCKING_STATUSES = List.of(
            FeedbackCampaignStatus.DRAFT,
            FeedbackCampaignStatus.READY_TO_ACTIVATE,
            FeedbackCampaignStatus.ACTIVE
    );

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackCampaignRelationshipWeightRepository relationshipWeightRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackAssignmentQuestionRepository assignmentQuestionRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackSummaryService feedbackSummaryService;
    private final FeedbackQuestionResolverService questionResolverService;
    private final FeedbackCampaignQuestionReviewService questionReviewService;

    @Override
    @Transactional
    public FeedbackCampaign createCampaign(FeedbackCampaignCreateRequest request, Long createdByUserId) {
        CampaignWindow window = resolveWindow(request);
        applyCampaignDefaults(request, window);
        validateCampaignMetadata(request, window);
        validateNoOverlappingOpenCampaign(window);
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
        ensureDefaultRelationshipWeights(saved);
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
        String normalizedSearch = normalizeSearch(search);
        String normalizedReadiness = normalizeFilter(readiness);
        String normalizedLevelCode = normalizeLevelCode(levelCode);

        return buildTargetContextMap(actorUserId).values().stream()
                .filter(context -> matchesSearch(context, normalizedSearch))
                .filter(context -> currentDepartmentId == null || Objects.equals(context.currentDepartmentId, currentDepartmentId))
                .filter(context -> parentDepartmentId == null || Objects.equals(context.parentDepartmentId, parentDepartmentId))
                .filter(context -> teamId == null || context.activeTeamIds.contains(teamId))
                .filter(context -> normalizedLevelCode == null || Objects.equals(normalizeLevelCode(context.levelCode), normalizedLevelCode))
                .filter(context -> matchesReadiness(context, normalizedReadiness))
                .sorted(Comparator.comparing(context -> context.employeeName.toLowerCase()))
                .map(this::toCandidateResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignTargetsResponse getCampaignTargets(Long campaignId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        Map<Long, TargetContext> contexts = buildTargetContextMap(campaign.getCreatedByUserId());
        List<FeedbackCampaignTargetResponse> targets = requests.stream()
                .map(request -> toCampaignTargetResponse(request, contexts.get(request.getTargetEmployeeId())))
                .toList();
        return buildTargetsResponse(campaign, targets);
    }

    @Override
    @Transactional
    public FeedbackCampaignTargetsResponse updateTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId) {
        replaceTargets(campaignId, targetEmployeeIds, requestedByUserId);
        return getCampaignTargets(campaignId);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignScoringConfigResponse getScoringConfig(Long campaignId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        return buildScoringConfigResponse(campaign, relationshipWeightsByType(campaign));
    }

    @Override
    @Transactional
    public FeedbackCampaignScoringConfigResponse updateScoringConfig(Long campaignId, FeedbackCampaignScoringConfigRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureDraftCampaign(campaign, "Scoring weights can be changed only while the campaign is DRAFT.");
        if (request == null || request.getRelationshipWeights() == null || request.getRelationshipWeights().isEmpty()) {
            throw new BusinessValidationException("Relationship weights are required.");
        }

        Map<FeedbackRelationshipType, BigDecimal> normalized = normalizeRelationshipWeightRequest(request.getRelationshipWeights());
        validateRelationshipWeightsTotal(normalized);

        campaign.setRedistributeMissingRelationshipWeight(!Boolean.FALSE.equals(request.getRedistributeMissingRelationshipWeight()));
        feedbackCampaignRepository.save(campaign);

        Map<FeedbackRelationshipType, FeedbackCampaignRelationshipWeight> existing = relationshipWeightsByType(campaign);
        List<FeedbackCampaignRelationshipWeight> toSave = new ArrayList<>();
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            FeedbackCampaignRelationshipWeight weight = existing.get(type);
            if (weight == null) {
                weight = new FeedbackCampaignRelationshipWeight();
                weight.setCampaign(campaign);
                weight.setRelationshipType(type);
            }
            weight.setWeightPercent(normalized.getOrDefault(type, BigDecimal.ZERO).setScale(2, RoundingMode.HALF_UP));
            toSave.add(weight);
        }
        relationshipWeightRepository.saveAll(toSave);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.CAMPAIGN_UPDATED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                null,
                "relationshipWeights=" + normalized + ",redistributeMissingRelationshipWeight=" + campaign.getRedistributeMissingRelationshipWeight(),
                "Campaign relationship scoring weights updated"
        );
        return buildScoringConfigResponse(campaign, relationshipWeightsByType(campaign));
    }

    @Override
    @Transactional
    public List<FeedbackRequest> replaceTargets(Long campaignId, List<Long> targetEmployeeIds, Long requestedByUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        ensureDraftCampaign(campaign, "Only DRAFT campaigns can be reconfigured.");

        Set<Long> uniqueTargetIds = normalizeTargetIds(targetEmployeeIds);
        Map<Long, TargetContext> contexts = buildTargetContextMap(campaign.getCreatedByUserId() != null ? campaign.getCreatedByUserId() : requestedByUserId);
        List<TargetContext> selectedContexts = uniqueTargetIds.stream()
                .map(targetEmployeeId -> {
                    TargetContext context = contexts.get(targetEmployeeId);
                    if (context == null) {
                        throw new ResourceNotFoundException("Target employee not found: " + targetEmployeeId + ".");
                    }
                    if (!context.blockReasons.isEmpty()) {
                        throw new BusinessValidationException("Some selected employees are not available for this campaign.");
                    }
                    return context;
                })
                .toList();

        List<FeedbackRequest> existingRequests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (!existingRequests.isEmpty()) {
            // Draft target changes intentionally clear old generated assignments because assignment pools
            // depend on target, department, manager, and team readiness snapshots.
            assignmentRepository.deleteByFeedbackRequestCampaignId(campaignId);
            assignmentRepository.flush();
            feedbackRequestRepository.deleteAllInBatch(existingRequests);
            feedbackRequestRepository.flush();
            questionReviewService.clearCampaignQuestionSelection(campaignId);
        }

        List<FeedbackRequest> newRequests = selectedContexts.stream()
                .map(context -> buildRequest(campaign, context, requestedByUserId))
                .toList();
        List<FeedbackRequest> saved = feedbackRequestRepository.saveAll(newRequests);
        feedbackOperationalService.audit(
                requestedByUserId,
                FeedbackOperationalService.TARGETS_UPDATED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                null,
                "targetCount=" + saved.size(),
                "Feedback campaign targets replaced"
        );
        return saved;
    }


    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaignActivationReadinessResponse getActivationReadiness(Long campaignId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        return buildActivationReadiness(campaign);
    }

    @Override
    @Transactional
    public FeedbackCampaign markReadyToActivate(Long campaignId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.READY_TO_ACTIVATE) {
            return campaign;
        }
        ensureDraftCampaign(campaign, "Only DRAFT campaigns can be validated for activation.");
        FeedbackCampaignActivationReadinessResponse readiness = buildActivationReadiness(campaign);
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
    @Transactional(readOnly = true)
    public FeedbackCampaignMonitoringResponse getCampaignMonitoring(Long campaignId) {
        FeedbackCampaign campaign = getCampaignById(campaignId);
        return buildMonitoring(campaign);
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
        FeedbackCampaignActivationReadinessResponse readiness = buildActivationReadiness(campaign);
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

        questionResolverService.snapshotCampaignAssignments(campaignId);
        FeedbackCampaignActivationReadinessResponse afterSnapshot = buildActivationReadiness(campaign);
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
        FeedbackCampaign campaign = getCampaignById(campaignId);
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return campaign;
        }
        ensureActiveCampaign(campaign);
        String reason = isBeforeDeadline(campaign)
                ? "Feedback campaign manually closed by HR before the scheduled deadline"
                : "Feedback campaign closed after scheduled deadline";
        return closeCampaignInternal(campaign, actorUserId, isBeforeDeadline(campaign), reason, true);
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
        questionResolverService.snapshotCampaignAssignments(campaign.getId());

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
            if (!hasAllRequiredRatings(response, questionResolverService.findOrCreateAssignmentQuestions(assignment))) {
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


    private void applyCampaignPolicy(FeedbackCampaign campaign, FeedbackCampaignCreateRequest request) {
        campaign.setManagerFeedbackAnonymous(Boolean.TRUE.equals(request.getManagerFeedbackAnonymous()));
        campaign.setPeerFeedbackAnonymous(!Boolean.FALSE.equals(request.getPeerFeedbackAnonymous()));
        campaign.setSubordinateFeedbackAnonymous(!Boolean.FALSE.equals(request.getSubordinateFeedbackAnonymous()));
        campaign.setSelfFeedbackAnonymous(Boolean.TRUE.equals(request.getSelfFeedbackAnonymous()));
        campaign.setRedistributeMissingRelationshipWeight(!Boolean.FALSE.equals(request.getRedistributeMissingRelationshipWeight()));
    }

    private void ensureDefaultRelationshipWeights(FeedbackCampaign campaign) {
        if (campaign == null || campaign.getId() == null) {
            return;
        }
        Map<FeedbackRelationshipType, FeedbackCampaignRelationshipWeight> existing = relationshipWeightsByType(campaign);
        boolean changed = false;
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            if (!existing.containsKey(type)) {
                FeedbackCampaignRelationshipWeight weight = new FeedbackCampaignRelationshipWeight();
                weight.setCampaign(campaign);
                weight.setRelationshipType(type);
                weight.setWeightPercent(defaultRelationshipWeight(type));
                relationshipWeightRepository.save(weight);
                changed = true;
            }
        }
        if (changed) {
            relationshipWeightRepository.flush();
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

    private Map<FeedbackRelationshipType, BigDecimal> normalizeRelationshipWeightRequest(List<FeedbackCampaignRelationshipWeightRequest> requests) {
        Map<FeedbackRelationshipType, BigDecimal> result = new EnumMap<>(FeedbackRelationshipType.class);
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            result.put(type, BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));
        }
        for (FeedbackCampaignRelationshipWeightRequest item : requests) {
            if (item == null || item.getRelationshipType() == null) {
                throw new BusinessValidationException("Every relationship weight must include a relationship type.");
            }
            BigDecimal value = item.getWeightPercent() == null ? BigDecimal.ZERO : item.getWeightPercent();
            if (value.compareTo(BigDecimal.ZERO) < 0 || value.compareTo(new BigDecimal("100.00")) > 0) {
                throw new BusinessValidationException("Relationship weight must be between 0 and 100%.");
            }
            if (result.containsKey(item.getRelationshipType()) && result.get(item.getRelationshipType()).compareTo(BigDecimal.ZERO) > 0) {
                throw new BusinessValidationException("Duplicate relationship weight for " + item.getRelationshipType() + ".");
            }
            result.put(item.getRelationshipType(), value.setScale(2, RoundingMode.HALF_UP));
        }
        return result;
    }

    private void validateRelationshipWeightsTotal(Map<FeedbackRelationshipType, BigDecimal> weights) {
        BigDecimal total = relationshipWeightTotal(weights);
        if (total.compareTo(new BigDecimal("100.00")) != 0) {
            throw new BusinessValidationException("Relationship weights must total exactly 100%. Current total is " + total + "%.");
        }
        boolean anyPositive = weights.values().stream().anyMatch(value -> value.compareTo(BigDecimal.ZERO) > 0);
        if (!anyPositive) {
            throw new BusinessValidationException("At least one evaluator relationship must have a positive weight.");
        }
    }

    private BigDecimal relationshipWeightTotal(Map<FeedbackRelationshipType, BigDecimal> weights) {
        return weights.values().stream()
                .reduce(BigDecimal.ZERO, BigDecimal::add)
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

    private FeedbackCampaignScoringConfigResponse buildScoringConfigResponse(
            FeedbackCampaign campaign,
            Map<FeedbackRelationshipType, FeedbackCampaignRelationshipWeight> storedWeights
    ) {
        Map<FeedbackRelationshipType, BigDecimal> weights = new EnumMap<>(FeedbackRelationshipType.class);
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            FeedbackCampaignRelationshipWeight stored = storedWeights.get(type);
            weights.put(type, stored == null ? defaultRelationshipWeight(type) : stored.getWeightPercent().setScale(2, RoundingMode.HALF_UP));
        }
        BigDecimal total = relationshipWeightTotal(weights);
        List<FeedbackEvaluatorAssignment> assignments = campaign == null || campaign.getId() == null
                ? List.of()
                : assignmentRepository.findByCampaignIdWithRequest(campaign.getId());
        Map<FeedbackRelationshipType, Long> assignmentCountByRole = assignments.stream()
                .filter(assignment -> assignment.getRelationshipType() != null)
                .collect(Collectors.groupingBy(
                        FeedbackEvaluatorAssignment::getRelationshipType,
                        () -> new EnumMap<>(FeedbackRelationshipType.class),
                        Collectors.counting()
                ));
        Map<FeedbackRelationshipType, Set<Long>> targetsByRole = new EnumMap<>(FeedbackRelationshipType.class);
        for (FeedbackEvaluatorAssignment assignment : assignments) {
            if (assignment.getRelationshipType() == null || assignment.getFeedbackRequest() == null) continue;
            targetsByRole.computeIfAbsent(assignment.getRelationshipType(), ignored -> new LinkedHashSet<>())
                    .add(assignment.getFeedbackRequest().getId());
        }
        List<String> warnings = relationshipWeightWarnings(campaign, weights, assignments);
        List<FeedbackRelationshipWeightResponse> responseWeights = Arrays.stream(FeedbackRelationshipType.values())
                .map(type -> FeedbackRelationshipWeightResponse.builder()
                        .relationshipType(type.name())
                        .label(relationshipLabel(type))
                        .weightPercent(weights.get(type))
                        .assignmentCount(assignmentCountByRole.getOrDefault(type, 0L).intValue())
                        .targetCountWithRole(targetsByRole.getOrDefault(type, Set.of()).size())
                        .currentlyAvailable(assignmentCountByRole.getOrDefault(type, 0L) > 0)
                        .build())
                .toList();
        return FeedbackCampaignScoringConfigResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .campaignStatus(campaign.getStatus() == null ? null : campaign.getStatus().name())
                .redistributeMissingRelationshipWeight(!Boolean.FALSE.equals(campaign.getRedistributeMissingRelationshipWeight()))
                .totalRelationshipWeight(total)
                .relationshipWeightsReady(total.compareTo(new BigDecimal("100.00")) == 0)
                .relationshipWeights(responseWeights)
                .warnings(warnings)
                .build();
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
                .filter(entry -> entry.getValue().compareTo(BigDecimal.ZERO) > 0)
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

    private String relationshipLabel(FeedbackRelationshipType type) {
        return switch (type) {
            case MANAGER -> "Manager";
            case PEER -> "Peer";
            case SUBORDINATE -> "Subordinate";
            case SELF -> "Self";
        };
    }

    private FeedbackCampaignActivationReadinessResponse buildActivationReadiness(FeedbackCampaign campaign) {
        List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks = new ArrayList<>();
        List<String> blocking = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaign.getId());
        long snapshotCount = assignmentQuestionRepository.countByAssignmentFeedbackRequestCampaignId(campaign.getId());

        addLifecycleCheck(campaign, checks);
        addCampaignInfoCheck(campaign, checks, blocking, warnings);
        addTargetCheck(requests, checks, blocking, warnings);
        addAssignmentCheck(requests, assignments, checks, blocking, warnings);
        addQuestionReviewCheck(campaign, assignments, checks, blocking, warnings);
        addScoringConfigCheck(campaign, assignments, checks, blocking, warnings);
        addPrivacyPolicyCheck(campaign, checks, warnings);
        addSubmissionWindowCheck(campaign, checks, blocking, warnings);

        int totalAssignments = assignments.size();
        int submitted = countAssignmentsByStatus(assignments, AssignmentStatus.SUBMITTED);
        int inProgress = countAssignmentsByStatus(assignments, AssignmentStatus.IN_PROGRESS);
        int pending = countAssignmentsByStatus(assignments, AssignmentStatus.PENDING);
        double completion = totalAssignments == 0 ? 0.0 : (submitted * 100.0) / totalAssignments;

        boolean noBlocking = blocking.isEmpty();
        boolean canMarkReady = noBlocking && campaign.getStatus() == FeedbackCampaignStatus.DRAFT;
        boolean canActivate = noBlocking && campaign.getStatus() == FeedbackCampaignStatus.READY_TO_ACTIVATE;

        return FeedbackCampaignActivationReadinessResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .campaignStatus(campaign.getStatus().name())
                .ready(noBlocking)
                .canMarkReady(canMarkReady)
                .canActivate(canActivate)
                .summary(FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationSummary.builder()
                        .targetCount(requests.size())
                        .assignmentCount(totalAssignments)
                        .questionSelectionCount(resolveIncludedQuestionSelectionCount(campaign.getId()))
                        .assignmentQuestionSnapshotCount((int) snapshotCount)
                        .pendingAssignmentCount(pending)
                        .inProgressAssignmentCount(inProgress)
                        .submittedAssignmentCount(submitted)
                        .completionPercent(roundPercent(completion))
                        .build())
                .checks(checks)
                .blockingIssues(blocking.stream().distinct().toList())
                .warnings(warnings.stream().distinct().toList())
                .build();
    }

    private void addLifecycleCheck(
            FeedbackCampaign campaign,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks
    ) {
        FeedbackCampaignStatus status = campaign.getStatus();
        if (status == FeedbackCampaignStatus.DRAFT) {
            checks.add(readinessCheck(
                    "LIFECYCLE",
                    "Lifecycle gate",
                    "WARNING",
                    "Setup can be validated after all launch checks pass. Activation is available only after the campaign is marked Ready to activate."
            ));
            return;
        }
        if (status == FeedbackCampaignStatus.READY_TO_ACTIVATE) {
            checks.add(readinessCheck(
                    "LIFECYCLE",
                    "Lifecycle gate",
                    "PASS",
                    "Campaign setup is validated and locked. Activation is available after the final launch check passes."
            ));
            return;
        }
        checks.add(readinessCheck(
                "LIFECYCLE",
                "Lifecycle gate",
                "PASS",
                "Campaign is already past setup validation. Current status: " + status + "."
        ));
    }

    private void addCampaignInfoCheck(
            FeedbackCampaign campaign,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks,
            List<String> blocking,
            List<String> warnings
    ) {
        List<String> issues = new ArrayList<>();
        if (isBlank(campaign.getName())) issues.add("Campaign name is missing.");
        if (campaign.getReviewYear() == null) issues.add("Review year is missing.");
        if (campaign.getStartAt() == null) issues.add("Start date/time is missing.");
        if (campaign.getEndAt() == null) issues.add("End date/time is missing.");
        if (campaign.getStartAt() != null && campaign.getEndAt() != null && !campaign.getStartAt().isBefore(campaign.getEndAt())) {
            issues.add("End date/time must be after start date/time.");
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
            blocking.add("Select at least one target employee.");
            checks.add(readinessCheck("TARGETS", "Targets", "BLOCKED", "No feedback recipients have been saved."));
            return;
        }
        int warningTargets = 0;
        List<String> targetIssues = new ArrayList<>();
        for (FeedbackRequest request : requests) {
            if (request.getTargetUserId() == null) {
                targetIssues.add("Target " + displayTarget(request) + " has no linked user account.");
            }
            if (request.getTargetEmployeeName() == null || request.getTargetEmployeeName().isBlank()) {
                targetIssues.add("Target employee ID " + request.getTargetEmployeeId() + " has no display name snapshot.");
            }
            if (request.getTargetWarningSnapshot() != null && !request.getTargetWarningSnapshot().isBlank()) {
                warningTargets++;
            }
        }
        if (!targetIssues.isEmpty()) {
            blocking.addAll(targetIssues);
            checks.add(readinessCheck("TARGETS", "Targets", "BLOCKED", "Some selected recipients need attention before launch."));
        } else if (warningTargets > 0) {
            warnings.add(warningTargets + " selected recipient(s) need review.");
            checks.add(readinessCheck("TARGETS", "Targets", "WARNING", requests.size() + " recipient(s) saved; " + warningTargets + " need HR review but can proceed."));
        } else {
            checks.add(readinessCheck("TARGETS", "Targets", "PASS", requests.size() + " feedback recipient(s) are saved and ready."));
        }
    }

    private void addAssignmentCheck(
            List<FeedbackRequest> requests,
            List<FeedbackEvaluatorAssignment> assignments,
            List<FeedbackCampaignActivationReadinessResponse.FeedbackCampaignActivationCheck> checks,
            List<String> blocking,
            List<String> warnings
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
        Set<Long> requestIds = requests.stream().map(FeedbackRequest::getId).collect(Collectors.toSet());
        Set<String> uniqueAssignmentKeys = new HashSet<>();
        List<String> assignmentIssues = new ArrayList<>();
        for (FeedbackEvaluatorAssignment assignment : assignments) {
            if (assignment.getFeedbackRequest() == null || !requestIds.contains(assignment.getFeedbackRequest().getId())) {
                assignmentIssues.add("Assignment " + assignment.getId() + " is not linked to a selected target.");
            }
            if (assignment.getEvaluatorEmployeeId() == null) {
                assignmentIssues.add("Assignment " + assignment.getId() + " has no evaluator employee.");
            }
            if (assignment.getRelationshipType() == null) {
                assignmentIssues.add("Assignment " + assignment.getId() + " has no relationship role.");
            }
            String key = (assignment.getFeedbackRequest() == null ? "?" : assignment.getFeedbackRequest().getId())
                    + "::" + assignment.getEvaluatorEmployeeId()
                    + "::" + assignment.getRelationshipType();
            if (!uniqueAssignmentKeys.add(key)) {
                assignmentIssues.add("Duplicate evaluator assignment detected for request/evaluator/role: " + key + ".");
            }
        }
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
            List<FeedbackEvaluatorAssignment> assignments,
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
        } catch (RuntimeException ignored) {
            return 0;
        }
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

        FeedbackOperationalService.NotificationDeliveryResult result = feedbackOperationalService.notifyPendingEvaluatorReminders(campaign, kind);

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
                .warnings(result.getWarnings())
                .build();
    }

    private void ensureActiveCampaign(FeedbackCampaign campaign) {
        if (campaign.getStatus() != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Only ACTIVE campaigns can be closed or reviewed for early close.");
        }
    }

    private void ensureReadyToActivateCampaign(FeedbackCampaign campaign, String message) {
        if (campaign.getStatus() != FeedbackCampaignStatus.READY_TO_ACTIVATE) {
            throw new BusinessValidationException(message);
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

    private FeedbackRequest buildRequest(FeedbackCampaign campaign, TargetContext context, Long requestedByUserId) {
        FeedbackRequest request = new FeedbackRequest();
        request.setCampaign(campaign);
        request.setTargetEmployeeId(context.employeeId);
        request.setForm(null);
        request.setRequestedByUserId(requestedByUserId);
        request.setDueAt(null);
        request.setIsAnonymousEnabled(false);
        request.setStatus(FeedbackRequestStatus.PENDING);

        request.setTargetUserId(context.userId);
        request.setTargetEmployeeCode(context.employeeCode);
        request.setTargetEmployeeName(context.employeeName);
        request.setTargetEmployeeEmail(context.email);
        request.setTargetParentDepartmentId(context.parentDepartmentId);
        request.setTargetParentDepartmentName(context.parentDepartmentName);
        request.setTargetCurrentDepartmentId(context.currentDepartmentId);
        request.setTargetCurrentDepartmentName(context.currentDepartmentName);
        request.setTargetPositionId(context.positionId);
        request.setTargetPositionName(context.positionName);
        request.setTargetLevelCode(context.levelCode);
        request.setTargetManagerUserId(context.managerUserId);
        request.setTargetManagerEmployeeId(context.managerEmployeeId);
        request.setTargetManagerName(context.managerName);
        request.setTargetEmploymentStatus(context.employmentStatus);
        request.setTargetWarningSnapshot(joinSnapshotMessages(context));
        request.setSelectedAt(LocalDateTime.now());
        request.setSelectedByUserId(requestedByUserId);
        return request;
    }

    private Map<Long, TargetContext> buildTargetContextMap() {
        return buildTargetContextMap(null);
    }

    private Map<Long, TargetContext> buildTargetContextMap(Long excludedTargetUserId) {
        List<Employee> employees = employeeRepository.findAll();
        Map<Integer, Employee> employeesById = employees.stream()
                .filter(employee -> employee.getId() != null)
                .collect(Collectors.toMap(Employee::getId, employee -> employee, (left, right) -> left));

        List<User> users = userRepository.findAll();
        Map<Integer, User> usersById = users.stream()
                .filter(user -> user.getId() != null)
                .collect(Collectors.toMap(User::getId, user -> user, (left, right) -> left));
        Map<Integer, User> usersByEmployeeId = users.stream()
                .filter(user -> user.getEmployeeId() != null)
                .collect(Collectors.toMap(User::getEmployeeId, user -> user, (left, right) -> preferActiveUser(left, right)));

        List<TeamMember> activeMemberships = teamMemberRepository.findActiveMemberships();
        Map<Integer, List<TeamMember>> membershipsByUserId = activeMemberships.stream()
                .filter(member -> member.getMemberUser() != null && member.getMemberUser().getId() != null)
                .collect(Collectors.groupingBy(member -> member.getMemberUser().getId()));

        Map<Long, TargetContext> contexts = new HashMap<>();
        for (Employee employee : employees) {
            User user = employee.getId() == null ? null : usersByEmployeeId.get(employee.getId());
            TargetContext context = buildBaseTargetContext(employee, user, usersById, employeesById, membershipsByUserId, excludedTargetUserId);
            contexts.put(context.employeeId, context);
        }

        contexts.values().forEach(context -> enrichRelationshipCounts(context, contexts.values()));
        return contexts;
    }

    private TargetContext buildBaseTargetContext(
            Employee employee,
            User user,
            Map<Integer, User> usersById,
            Map<Integer, Employee> employeesById,
            Map<Integer, List<TeamMember>> membershipsByUserId,
            Long excludedTargetUserId
    ) {
        EmployeeDepartment assignment = latestActiveDepartmentAssignment(employee);
        Department parentDepartment = assignment == null ? null : assignment.getParentDepartment();
        Department currentDepartment = assignment == null ? null : assignment.getCurrentDepartment();
        if (currentDepartment == null && parentDepartment != null) {
            currentDepartment = parentDepartment;
        }
        if (parentDepartment == null && currentDepartment != null) {
            parentDepartment = currentDepartment;
        }

        User managerUser = user != null && user.getManagerId() != null ? usersById.get(user.getManagerId()) : null;
        Employee managerEmployee = managerUser != null && managerUser.getEmployeeId() != null
                ? employeesById.get(managerUser.getEmployeeId())
                : null;
        Position position = employee.getPosition();
        PositionLevel level = position == null ? null : position.getLevel();

        List<TeamMember> memberships = user == null ? List.of() : membershipsByUserId.getOrDefault(user.getId(), List.of());
        Set<Integer> activeTeamIds = memberships.stream()
                .filter(member -> member.getTeam() != null && member.getTeam().getId() != null)
                .map(member -> member.getTeam().getId())
                .collect(Collectors.toCollection(LinkedHashSet::new));
        List<String> activeTeamNames = memberships.stream()
                .filter(member -> member.getTeam() != null)
                .map(member -> safeText(member.getTeam().getTeamName(), "Team #" + member.getTeam().getId()))
                .distinct()
                .sorted()
                .toList();

        String employmentStatus = resolveEmploymentStatus(user);
        List<String> blockReasons = new ArrayList<>();
        List<String> warnings = new ArrayList<>();
        List<String> notes = new ArrayList<>();

        if (!isEmployeeActive(employee)) {
            blockReasons.add("This employee is not active.");
        }
        if (user == null) {
            blockReasons.add("No active login account is available.");
        } else if (!isUserActive(user)) {
            blockReasons.add("No active login account is available.");
        }
        if (isNonPermanentEmploymentStatus(employmentStatus)) {
            blockReasons.add("This employee is not available for this campaign.");
        }
        String normalizedLevelCode = normalizeLevelCode(level == null ? null : level.getLevelCode());
        boolean departmentHeadTarget = user != null && hasDepartmentHeadRole(user);
        if ((normalizedLevelCode == null || !TARGET_LEVEL_CODES.contains(normalizedLevelCode)) && !departmentHeadTarget) {
            blockReasons.add("This employee is outside the selected campaign audience.");
        }
        if (user != null && hasTargetExcludedRole(user)) {
            blockReasons.add("HR, Admin, and Executive users can give feedback when assigned, but they are not included as feedback recipients.");
        }
        if (excludedTargetUserId != null && user != null && user.getId() != null
                && Objects.equals(user.getId().longValue(), excludedTargetUserId)) {
            blockReasons.add("Campaign owner is not available as a feedback recipient.");
        }

        if (currentDepartment == null) {
            warnings.add("Current department is missing.");
        }
        if (user != null && (managerUser == null || !isUserActive(managerUser))) {
            warnings.add("No active manager found.");
        }
        if (activeTeamIds.isEmpty()) {
            notes.add("No active team found.");
        }

        String employeeName = employeeDisplayName(employee, user);
        return new TargetContext(
                employee.getId() == null ? null : employee.getId().longValue(),
                user == null ? null : user.getId(),
                safeText(user == null ? null : user.getEmployeeCode(), employee.getId() == null ? null : "EMP-" + employee.getId()),
                employeeName,
                safeText(employee.getEmail(), user == null ? null : user.getEmail()),
                departmentId(parentDepartment),
                departmentName(parentDepartment),
                departmentId(currentDepartment),
                departmentName(currentDepartment),
                position == null ? null : position.getId(),
                position == null ? null : position.getPositionTitle(),
                level == null ? null : level.getLevelCode(),
                managerUser == null ? null : managerUser.getId(),
                managerUser == null ? null : managerUser.getEmployeeId(),
                managerDisplayName(managerUser, managerEmployee),
                employmentStatus,
                activeTeamIds,
                activeTeamNames,
                blockReasons,
                warnings,
                notes
        );
    }

    private void enrichRelationshipCounts(TargetContext context, Collection<TargetContext> contexts) {
        if (context.userId == null) {
            context.peerCandidateCount = 0;
            context.subordinateCandidateCount = 0;
            return;
        }

        Set<Long> subordinateEmployeeIds = contexts.stream()
                .filter(other -> other.userId != null && Objects.equals(other.managerUserId, context.userId))
                .filter(this::isEligibleEvaluatorContext)
                .map(other -> other.employeeId)
                .collect(Collectors.toSet());
        context.subordinateCandidateCount = subordinateEmployeeIds.size();

        context.peerCandidateCount = (int) contexts.stream()
                .filter(other -> isPeerCandidate(context, other, subordinateEmployeeIds))
                .count();

        if (context.peerCandidateCount < 2 && context.blockReasons.isEmpty()) {
            context.warnings.add("Limited peer options found.");
        }
        if (context.subordinateCandidateCount == 0) {
            context.notes.add("No direct reports found.");
        }
    }


    private boolean hasTargetExcludedRole(User user) {
        if (user == null || user.getId() == null) {
            return false;
        }
        return userRepository.findNormalizedRoleNamesByUserId(user.getId()).stream()
                .map(this::normalizeRoleNameForPolicy)
                .anyMatch(TARGET_EXCLUDED_ROLES::contains);
    }

    private boolean hasDepartmentHeadRole(User user) {
        if (user == null || user.getId() == null) {
            return false;
        }
        return userRepository.findNormalizedRoleNamesByUserId(user.getId()).stream()
                .map(this::normalizeRoleNameForPolicy)
                .anyMatch(role -> role.equals("DEPARTMENT_HEAD")
                        || role.equals("DEPARTMENTHEAD")
                        || role.equals("DEPT_HEAD")
                        || role.equals("HEAD_OF_DEPARTMENT"));
    }

    private String normalizeRoleNameForPolicy(String role) {
        if (role == null) {
            return "";
        }
        return role.trim()
                .replaceFirst("(?i)^ROLE_", "")
                .replace(' ', '_')
                .replace('-', '_')
                .replace('/', '_')
                .toUpperCase(Locale.ROOT);
    }

    private boolean isPeerCandidate(TargetContext target, TargetContext other, Set<Long> subordinateEmployeeIds) {
        if (!isEligibleEvaluatorContext(other) || Objects.equals(target.employeeId, other.employeeId)) {
            return false;
        }
        if (Objects.equals(other.userId, target.managerUserId)) {
            return false;
        }
        if (subordinateEmployeeIds.contains(other.employeeId)) {
            return false;
        }
        if (!target.activeTeamIds.isEmpty()) {
            return other.activeTeamIds.stream().anyMatch(target.activeTeamIds::contains);
        }
        return target.currentDepartmentId != null && Objects.equals(target.currentDepartmentId, other.currentDepartmentId);
    }

    private boolean isEligibleEvaluatorContext(TargetContext context) {
        return context != null
                && context.userId != null
                && context.employeeId != null
                && context.blockReasons.isEmpty()
                && !isNonPermanentEmploymentStatus(context.employmentStatus);
    }

    private FeedbackTargetCandidateResponse toCandidateResponse(TargetContext context) {
        return FeedbackTargetCandidateResponse.builder()
                .employeeId(context.employeeId)
                .userId(context.userId)
                .employeeCode(context.employeeCode)
                .employeeName(context.employeeName)
                .email(context.email)
                .parentDepartmentId(context.parentDepartmentId)
                .parentDepartmentName(context.parentDepartmentName)
                .currentDepartmentId(context.currentDepartmentId)
                .currentDepartmentName(context.currentDepartmentName)
                .positionId(context.positionId)
                .positionName(context.positionName)
                .levelCode(context.levelCode)
                .managerUserId(context.managerUserId)
                .managerEmployeeId(context.managerEmployeeId)
                .managerName(context.managerName)
                .employmentStatus(context.employmentStatus)
                .eligible(context.blockReasons.isEmpty())
                .blockReasons(List.copyOf(context.blockReasons))
                .warnings(List.copyOf(context.warnings))
                .notes(List.copyOf(context.notes))
                .activeTeamCount(context.activeTeamIds.size())
                .activeTeamNames(List.copyOf(context.activeTeamNames))
                .peerCandidateCount(context.peerCandidateCount)
                .subordinateCandidateCount(context.subordinateCandidateCount)
                .build();
    }

    private FeedbackCampaignTargetResponse toCampaignTargetResponse(FeedbackRequest request, TargetContext liveContext) {
        List<String> warnings = liveContext != null ? List.copyOf(liveContext.warnings) : snapshotMessages(request.getTargetWarningSnapshot());
        List<String> blockReasons = liveContext != null ? List.copyOf(liveContext.blockReasons) : List.of();
        List<String> notes = liveContext != null ? List.copyOf(liveContext.notes) : List.of();

        return FeedbackCampaignTargetResponse.builder()
                .requestId(request.getId())
                .employeeId(request.getTargetEmployeeId())
                .userId(coalesce(request.getTargetUserId(), liveContext == null ? null : liveContext.userId))
                .employeeCode(coalesceText(request.getTargetEmployeeCode(), liveContext == null ? null : liveContext.employeeCode))
                .employeeName(coalesceText(request.getTargetEmployeeName(), liveContext == null ? null : liveContext.employeeName))
                .email(coalesceText(request.getTargetEmployeeEmail(), liveContext == null ? null : liveContext.email))
                .parentDepartmentId(coalesce(request.getTargetParentDepartmentId(), liveContext == null ? null : liveContext.parentDepartmentId))
                .parentDepartmentName(coalesceText(request.getTargetParentDepartmentName(), liveContext == null ? null : liveContext.parentDepartmentName))
                .currentDepartmentId(coalesce(request.getTargetCurrentDepartmentId(), liveContext == null ? null : liveContext.currentDepartmentId))
                .currentDepartmentName(coalesceText(request.getTargetCurrentDepartmentName(), liveContext == null ? null : liveContext.currentDepartmentName))
                .positionId(coalesce(request.getTargetPositionId(), liveContext == null ? null : liveContext.positionId))
                .positionName(coalesceText(request.getTargetPositionName(), liveContext == null ? null : liveContext.positionName))
                .levelCode(coalesceText(request.getTargetLevelCode(), liveContext == null ? null : liveContext.levelCode))
                .managerUserId(coalesce(request.getTargetManagerUserId(), liveContext == null ? null : liveContext.managerUserId))
                .managerEmployeeId(coalesce(request.getTargetManagerEmployeeId(), liveContext == null ? null : liveContext.managerEmployeeId))
                .managerName(coalesceText(request.getTargetManagerName(), liveContext == null ? null : liveContext.managerName))
                .employmentStatus(coalesceText(request.getTargetEmploymentStatus(), liveContext == null ? null : liveContext.employmentStatus))
                .eligible(blockReasons.isEmpty())
                .blockReasons(blockReasons)
                .warnings(warnings)
                .notes(notes)
                .activeTeamCount(liveContext == null ? 0 : liveContext.activeTeamIds.size())
                .activeTeamNames(liveContext == null ? List.of() : List.copyOf(liveContext.activeTeamNames))
                .peerCandidateCount(liveContext == null ? 0 : liveContext.peerCandidateCount)
                .subordinateCandidateCount(liveContext == null ? 0 : liveContext.subordinateCandidateCount)
                .selectedAt(request.getSelectedAt())
                .selectedByUserId(request.getSelectedByUserId())
                .build();
    }

    private FeedbackCampaignTargetsResponse buildTargetsResponse(FeedbackCampaign campaign, List<FeedbackCampaignTargetResponse> targets) {
        int blocked = (int) targets.stream().filter(target -> !Boolean.TRUE.equals(target.getEligible())).count();
        int warnings = (int) targets.stream().filter(target -> target.getWarnings() != null && !target.getWarnings().isEmpty()).count();
        List<String> summaryWarnings = new ArrayList<>();
        if (targets.isEmpty()) {
            summaryWarnings.add("Select at least one feedback recipient before continuing.");
        }
        if (blocked > 0) {
            summaryWarnings.add(blocked + " selected employee(s) are no longer available for this campaign.");
        }
        if (warnings > 0) {
            summaryWarnings.add(warnings + " selected employee(s) need review before continuing.");
        }

        return FeedbackCampaignTargetsResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .campaignStatus(campaign.getStatus().name())
                .targetCount(targets.size())
                .readyCount((int) targets.stream().filter(target -> Boolean.TRUE.equals(target.getEligible())
                        && (target.getWarnings() == null || target.getWarnings().isEmpty())).count())
                .warningCount(warnings)
                .blockedCount(blocked)
                .targets(targets)
                .warnings(summaryWarnings)
                .build();
    }

    private EmployeeDepartment latestActiveDepartmentAssignment(Employee employee) {
        if (employee == null || employee.getEmployeeDepartments() == null) {
            return null;
        }
        return employee.getEmployeeDepartments().stream()
                .filter(assignment -> assignment.getEnddate() == null)
                .max(Comparator
                        .comparing(EmployeeDepartment::getStartdate, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(EmployeeDepartment::getId, Comparator.nullsLast(Comparator.naturalOrder())))
                .orElse(null);
    }

    private boolean matchesSearch(TargetContext context, String search) {
        if (search == null || search.isBlank()) {
            return true;
        }
        String haystack = String.join(" ",
                nullToEmpty(context.employeeName),
                nullToEmpty(context.employeeCode),
                nullToEmpty(context.email),
                nullToEmpty(context.currentDepartmentName),
                nullToEmpty(context.parentDepartmentName),
                nullToEmpty(context.positionName),
                nullToEmpty(context.levelCode)
        ).toLowerCase();
        return haystack.contains(search);
    }

    private String normalizeLevelCode(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toUpperCase(Locale.ROOT).replace(" ", "");
    }

    private boolean matchesReadiness(TargetContext context, String readiness) {
        if (readiness == null || readiness.isBlank() || readiness.equals("ALL")) {
            return true;
        }
        return switch (readiness) {
            case "AVAILABLE" -> context.blockReasons.isEmpty();
            case "READY" -> context.blockReasons.isEmpty() && context.warnings.isEmpty();
            case "WARNINGS" -> context.blockReasons.isEmpty() && !context.warnings.isEmpty();
            case "BLOCKED" -> !context.blockReasons.isEmpty();
            default -> true;
        };
    }

    private String joinSnapshotMessages(TargetContext context) {
        List<String> messages = new ArrayList<>();
        messages.addAll(context.warnings);
        messages.addAll(context.notes);
        return messages.isEmpty() ? null : String.join(" | ", messages);
    }

    private List<String> snapshotMessages(String snapshot) {
        if (snapshot == null || snapshot.isBlank()) {
            return List.of();
        }
        return List.of(snapshot.split("\\s*\\|\\s*"));
    }

    private String resolveEmploymentStatus(User user) {
        if (user == null || isBlank(user.getAccountStatus())) {
            return "UNKNOWN";
        }
        return user.getAccountStatus().trim();
    }

    private boolean isNonPermanentEmploymentStatus(String status) {
        if (status == null) {
            return false;
        }
        String normalized = status.toUpperCase();
        return normalized.contains("PROBATION")
                || normalized.contains("CONTRACT")
                || normalized.contains("TEMP")
                || normalized.contains("INTERN")
                || normalized.contains("PART_TIME")
                || normalized.contains("PART TIME");
    }

    private User preferActiveUser(User left, User right) {
        if (isUserActive(left) && !isUserActive(right)) {
            return left;
        }
        if (isUserActive(right) && !isUserActive(left)) {
            return right;
        }
        return left.getId() != null && right.getId() != null && right.getId() > left.getId() ? right : left;
    }

    private boolean isEmployeeActive(Employee employee) {
        return employee != null && !Boolean.FALSE.equals(employee.getActive());
    }

    private boolean isUserActive(User user) {
        return user != null && !Boolean.FALSE.equals(user.getActive());
    }

    private String employeeDisplayName(Employee employee, User user) {
        String combined = (nullToEmpty(employee.getFirstName()) + " " + nullToEmpty(employee.getLastName())).trim();
        if (!combined.isBlank()) {
            return combined;
        }
        if (user != null && !isBlank(user.getFullName())) {
            return user.getFullName().trim();
        }
        return employee.getId() == null ? "Employee" : "Employee #" + employee.getId();
    }

    private String managerDisplayName(User managerUser, Employee managerEmployee) {
        if (managerUser == null) {
            return null;
        }
        if (managerEmployee != null) {
            return employeeDisplayName(managerEmployee, managerUser);
        }
        if (!isBlank(managerUser.getFullName())) {
            return managerUser.getFullName().trim();
        }
        return managerUser.getEmail();
    }

    private Integer departmentId(Department department) {
        return department == null ? null : department.getId();
    }

    private String departmentName(Department department) {
        return department == null ? null : department.getDepartmentName();
    }

    private String normalizeSearch(String value) {
        return value == null ? null : value.trim().toLowerCase();
    }

    private String normalizeFilter(String value) {
        return value == null ? null : value.trim().toUpperCase();
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private String safeText(String primary, String fallback) {
        return isBlank(primary) ? fallback : primary.trim();
    }

    private String coalesceText(String first, String second) {
        return isBlank(first) ? second : first;
    }

    private <T> T coalesce(T first, T second) {
        return first != null ? first : second;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isBlank();
    }

    private static class TargetContext {
        private final Long employeeId;
        private final Integer userId;
        private final String employeeCode;
        private final String employeeName;
        private final String email;
        private final Integer parentDepartmentId;
        private final String parentDepartmentName;
        private final Integer currentDepartmentId;
        private final String currentDepartmentName;
        private final Integer positionId;
        private final String positionName;
        private final String levelCode;
        private final Integer managerUserId;
        private final Integer managerEmployeeId;
        private final String managerName;
        private final String employmentStatus;
        private final Set<Integer> activeTeamIds;
        private final List<String> activeTeamNames;
        private final List<String> blockReasons;
        private final List<String> warnings;
        private final List<String> notes;
        private int peerCandidateCount;
        private int subordinateCandidateCount;

        private TargetContext(
                Long employeeId,
                Integer userId,
                String employeeCode,
                String employeeName,
                String email,
                Integer parentDepartmentId,
                String parentDepartmentName,
                Integer currentDepartmentId,
                String currentDepartmentName,
                Integer positionId,
                String positionName,
                String levelCode,
                Integer managerUserId,
                Integer managerEmployeeId,
                String managerName,
                String employmentStatus,
                Set<Integer> activeTeamIds,
                List<String> activeTeamNames,
                List<String> blockReasons,
                List<String> warnings,
                List<String> notes
        ) {
            this.employeeId = employeeId;
            this.userId = userId;
            this.employeeCode = employeeCode;
            this.employeeName = employeeName;
            this.email = email;
            this.parentDepartmentId = parentDepartmentId;
            this.parentDepartmentName = parentDepartmentName;
            this.currentDepartmentId = currentDepartmentId;
            this.currentDepartmentName = currentDepartmentName;
            this.positionId = positionId;
            this.positionName = positionName;
            this.levelCode = levelCode;
            this.managerUserId = managerUserId;
            this.managerEmployeeId = managerEmployeeId;
            this.managerName = managerName;
            this.employmentStatus = employmentStatus;
            this.activeTeamIds = activeTeamIds;
            this.activeTeamNames = activeTeamNames;
            this.blockReasons = blockReasons;
            this.warnings = warnings;
            this.notes = notes;
        }
    }

    private Set<Long> normalizeTargetIds(List<Long> targetEmployeeIds) {
        if (targetEmployeeIds == null || targetEmployeeIds.isEmpty()) {
            throw new BusinessValidationException("At least one target employee is required.");
        }

        Set<Long> uniqueTargetIds = new LinkedHashSet<>();
        for (Long employeeId : targetEmployeeIds) {
            if (employeeId == null) {
                throw new BusinessValidationException("Target employee IDs cannot contain null values.");
            }
            uniqueTargetIds.add(employeeId);
        }
        return uniqueTargetIds;
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


    private void validateNoOverlappingOpenCampaign(CampaignWindow window) {
        List<FeedbackCampaign> overlappingCampaigns = feedbackCampaignRepository.findOverlappingCampaigns(
                window.startAt.toLocalDate(),
                window.endAt.toLocalDate(),
                OVERLAP_BLOCKING_STATUSES
        );

        if (!overlappingCampaigns.isEmpty()) {
            FeedbackCampaign existing = overlappingCampaigns.get(0);
            throw new BusinessValidationException(
                    "Another open 360 campaign overlaps this submission window: " + existing.getName()
                            + " (" + formatDeadline(existing.getStartAt()) + " - " + formatDeadline(existing.getEndAt()) + "). Close it or choose a non-overlapping window."
            );
        }
    }

    private void validateCampaignCanStillOpen(FeedbackCampaign campaign) {
        LocalDateTime now = LocalDateTime.now();
        if (campaign.getEndAt() != null && now.isAfter(campaign.getEndAt())) {
            throw new BusinessValidationException("This campaign's end date/time has already passed. Update the campaign policy or create a new campaign.");
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


    private String formatDeadline(LocalDateTime value) {
        return value == null ? "the campaign deadline" : value.toString().replace('T', ' ');
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
