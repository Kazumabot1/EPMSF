package com.epms.service.impl;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentDetailItemResponse;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackAssignmentPreviewItemResponse;
import com.epms.dto.FeedbackManualAssignmentRequest;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSelectionMethod;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.projection.PendingEvaluatorProjection;
import com.epms.service.FeedbackEvaluationService;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.ProjectPeerDirectory;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Random;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackEvaluationServiceImpl implements FeedbackEvaluationService {

    private static final Set<String> AUTO_PEER_LEVEL_CODES = Set.of("L05", "L06", "L07");

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final ProjectPeerDirectory projectPeerDirectory;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackCampaignQuestionReviewService questionReviewService;

    /**
     * Backward-compatible overload for existing tests/older callers.
     * New code should pass actorUserId so audit fields can record who generated assignments.
     */
    @Transactional
    public FeedbackAssignmentGenerationResponse generateAssignments(Long campaignId, EvaluatorConfigDTO config) {
        return generateAssignments(campaignId, config, null);
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse generateAssignments(Long campaignId, EvaluatorConfigDTO config, Long actorUserId) {
        return buildEvaluatorRuleResult(campaignId, config, actorUserId, true);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackAssignmentGenerationResponse previewAssignments(Long campaignId, EvaluatorConfigDTO config) {
        return buildEvaluatorRuleResult(campaignId, config, null, false);
    }

    private FeedbackAssignmentGenerationResponse buildEvaluatorRuleResult(
            Long campaignId,
            EvaluatorConfigDTO config,
            Long actorUserId,
            boolean persist
    ) {
        validateConfig(config);

        FeedbackCampaign campaign = getCampaignOrThrow(campaignId);
        ensureDraftCampaign(campaign, persist
                ? "Evaluator assignments can be generated only while the campaign is DRAFT."
                : "Evaluator rules can be previewed only while the campaign is DRAFT.");

        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (requests.isEmpty()) {
            throw new BusinessValidationException("Select target employees before configuring evaluator rules.");
        }

        if (persist) {
            questionReviewService.clearCampaignQuestionSelection(campaignId);
        }

        List<FeedbackEvaluatorAssignment> existingAssignments = requests.stream()
                .flatMap(request -> assignmentRepository.findByFeedbackRequestId(request.getId()).stream())
                .toList();
        List<FeedbackEvaluatorAssignment> existingManualAssignments = existingAssignments.stream()
                .filter(assignment -> assignment.getSelectionMethod() == EvaluatorSelectionMethod.MANUAL)
                .toList();
        List<FeedbackEvaluatorAssignment> existingAutoAssignments = existingAssignments.stream()
                .filter(assignment -> assignment.getSelectionMethod() != EvaluatorSelectionMethod.MANUAL)
                .toList();
        Map<Long, List<FeedbackEvaluatorAssignment>> manualAssignmentsByRequestId = existingManualAssignments.stream()
                .filter(assignment -> assignment.getFeedbackRequest() != null)
                .collect(Collectors.groupingBy(assignment -> assignment.getFeedbackRequest().getId()));

        if (persist && !existingAutoAssignments.isEmpty()) {
            assignmentRepository.deleteAll(existingAutoAssignments);
            assignmentRepository.flush();
        }

        List<String> warnings = new ArrayList<>();
        List<FeedbackEvaluatorAssignment> assignmentsToSave = new ArrayList<>();
        List<FeedbackAssignmentPreviewItemResponse> previewItems = new ArrayList<>();
        int plannedAssignments = 0;

        for (FeedbackRequest request : requests) {
            List<String> targetWarnings = new ArrayList<>();
            User targetUser = userRepository.findByEmployeeId(request.getTargetEmployeeId().intValue())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "No user account is linked to target employee " + request.getTargetEmployeeId() + "."
                    ));

            Set<Integer> targetTeamIds = findActiveTeamIds(targetUser);
            Set<Long> assignedEvaluatorEmployeeIds = new LinkedHashSet<>();
            Set<Long> subordinateEmployeeIds = findDirectSubordinateEmployeeIds(targetUser);
            Integer workingDepartmentId = resolveWorkingDepartmentId(request, targetUser);
            List<FeedbackEvaluatorAssignment> preservedManualAssignments = manualAssignmentsByRequestId
                    .getOrDefault(request.getId(), List.of());
            preservedManualAssignments.stream()
                    .map(FeedbackEvaluatorAssignment::getEvaluatorEmployeeId)
                    .filter(Objects::nonNull)
                    .forEach(assignedEvaluatorEmployeeIds::add);
            Map<FeedbackRelationshipType, Long> manualCountsByType = preservedManualAssignments.stream()
                    .collect(Collectors.groupingBy(
                            FeedbackEvaluatorAssignment::getRelationshipType,
                            () -> new EnumMap<>(FeedbackRelationshipType.class),
                            Collectors.counting()
                    ));

            Long managerEmployeeId = null;
            int managerAssignments = manualCountsByType.getOrDefault(FeedbackRelationshipType.MANAGER, 0L).intValue();
            int selfAssignments = manualCountsByType.getOrDefault(FeedbackRelationshipType.SELF, 0L).intValue();
            int subordinateAssignments = manualCountsByType.getOrDefault(FeedbackRelationshipType.SUBORDINATE, 0L).intValue();
            int peerAssignments = manualCountsByType.getOrDefault(FeedbackRelationshipType.PEER, 0L).intValue();
            int autoAssignmentsForTarget = 0;
            int manualAssignmentsForTarget = preservedManualAssignments.size();

            if (Boolean.TRUE.equals(config.getIncludeManager())) {
                managerEmployeeId = resolveManagerEmployeeId(targetUser, workingDepartmentId);
                if (managerEmployeeId != null && !Objects.equals(managerEmployeeId, request.getTargetEmployeeId())) {
                    if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, managerEmployeeId,
                            FeedbackRelationshipType.MANAGER, EvaluatorSelectionMethod.AUTO_RELATIONSHIP, persist)) {
                        managerAssignments++;
                        autoAssignmentsForTarget++;
                    }
                } else {
                    targetWarnings.add("No active manager or department head evaluator found. Manager feedback will be skipped for this target.");
                }
            }

            if (Boolean.TRUE.equals(config.getIncludeSelf())) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, request.getTargetEmployeeId(),
                        FeedbackRelationshipType.SELF, EvaluatorSelectionMethod.AUTO_RELATIONSHIP, persist)) {
                    selfAssignments++;
                    autoAssignmentsForTarget++;
                }
            }

            if (Boolean.TRUE.equals(config.getIncludeSubordinates())) {
                Long excludedManagerEmployeeId = managerEmployeeId;
                List<Long> selectedSubordinates = subordinateEmployeeIds.stream()
                        .filter(employeeId -> !Objects.equals(employeeId, request.getTargetEmployeeId()))
                        .filter(employeeId -> !Objects.equals(employeeId, excludedManagerEmployeeId))
                        .filter(employeeId -> !assignedEvaluatorEmployeeIds.contains(employeeId))
                        .filter(this::hasActiveUserForEmployeeId)
                        .sorted()
                        .limit(requestedSubordinateMaxCount(config))
                        .toList();

                if (subordinateEmployeeIds.isEmpty()) {
                    targetWarnings.add("No direct reports found. Subordinate feedback will be skipped for this target.");
                }
                if (selectedSubordinates.size() < requestedSubordinateMinCount(config)) {
                    targetWarnings.add("Only " + selectedSubordinates.size()
                            + " eligible subordinate evaluator(s) found; minimum rule is "
                            + requestedSubordinateMinCount(config) + ".");
                }

                for (Long subordinateEmployeeId : selectedSubordinates) {
                    if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, subordinateEmployeeId,
                            FeedbackRelationshipType.SUBORDINATE, EvaluatorSelectionMethod.AUTO_RELATIONSHIP, persist)) {
                        subordinateAssignments++;
                        autoAssignmentsForTarget++;
                    }
                }
            }

            LinkedHashSet<Long> peerPool = new LinkedHashSet<>();
            if (isPeerSelectionEnabled(config)) {
                if (isTeamPeerSelectionEnabled(config)) {
                    if (targetTeamIds.isEmpty()) {
                        targetWarnings.add("No active team found. Team peer selection cannot be applied for this target.");
                    }
                    peerPool.addAll(findTeamPeerEmployeeIds(targetUser));
                }
                if (isDepartmentPeerSelectionEnabled(config)) {
                    if (workingDepartmentId == null) {
                        targetWarnings.add("No current department found. Department peer fallback cannot be applied.");
                    } else {
                        peerPool.addAll(findDepartmentPeerEmployeeIds(targetUser, workingDepartmentId));
                    }
                }

                if (Boolean.TRUE.equals(config.getIncludeProjectPeers())) {
                    peerPool.addAll(projectPeerDirectory.findProjectPeerEmployeeIds(targetUser));
                    if (!projectPeerDirectory.isConfigured()) {
                        targetWarnings.add("Project peer source is enabled by a legacy caller, but no project membership directory is configured.");
                    }
                }
                if (Boolean.TRUE.equals(config.getIncludeCrossTeamPeers())) {
                    peerPool.addAll(findCrossTeamPeerEmployeeIds(targetUser, targetTeamIds));
                }
            }

            peerPool = filterEligiblePeerPool(
                    peerPool,
                    request.getTargetEmployeeId(),
                    managerEmployeeId,
                    subordinateEmployeeIds,
                    assignedEvaluatorEmployeeIds,
                    workingDepartmentId,
                    targetWarnings
            );

            int requestedPeerMinCount = requestedPeerMinCount(config);
            int requestedPeerMaxCount = requestedPeerMaxCount(config);
            List<Long> selectedPeers = isPeerSelectionEnabled(config)
                    ? selectPeers(peerPool, requestedPeerMaxCount, campaignId, request.getTargetEmployeeId())
                    : List.of();
            if (isPeerSelectionEnabled(config) && selectedPeers.size() < requestedPeerMinCount) {
                targetWarnings.add("Only " + selectedPeers.size()
                        + " eligible peer evaluator(s) found; minimum rule is "
                        + requestedPeerMinCount + ".");
            }
            for (Long peerEmployeeId : selectedPeers) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, peerEmployeeId,
                        FeedbackRelationshipType.PEER, EvaluatorSelectionMethod.AUTO_RANDOM, persist)) {
                    peerAssignments++;
                    autoAssignmentsForTarget++;
                }
            }

            int totalForTarget = managerAssignments + selfAssignments + subordinateAssignments + peerAssignments;
            plannedAssignments += totalForTarget;
            warnings.addAll(targetWarnings);
            previewItems.add(FeedbackAssignmentPreviewItemResponse.builder()
                    .requestId(request.getId())
                    .targetEmployeeId(request.getTargetEmployeeId())
                    .targetEmployeeName(resolveEmployeeNameForId(request.getTargetEmployeeId()))
                    .managerAssignments(managerAssignments)
                    .selfAssignments(selfAssignments)
                    .subordinateAssignments(subordinateAssignments)
                    .peerAssignments(peerAssignments)
                    .totalAssignments(totalForTarget)
                    .autoAssignments(autoAssignmentsForTarget)
                    .manualAssignments(manualAssignmentsForTarget)
                    .warnings(targetWarnings)
                    .build());
        }

        if (plannedAssignments == 0) {
            throw new BusinessValidationException("No evaluator assignments could be resolved from the selected evaluator rules.");
        }

        if (!Boolean.TRUE.equals(config.getFlexibleMode())) {
            List<String> blockingWarnings = warnings.stream()
                    .filter(warning -> warning.contains("minimum rule") || warning.contains("No active direct manager"))
                    .distinct()
                    .toList();
            if (!blockingWarnings.isEmpty()) {
                throw new BusinessValidationException("Evaluator rules are in strict mode and some targets do not satisfy the configured requirements: " + blockingWarnings);
            }
        }

        List<FeedbackAssignmentDetailItemResponse> details;
        if (persist) {
            assignmentRepository.saveAll(assignmentsToSave);
            feedbackOperationalService.audit(
                    actorUserId,
                    FeedbackOperationalService.ASSIGNMENTS_GENERATED,
                    FeedbackOperationalService.ENTITY_CAMPAIGN,
                    campaignId,
                    "replacedAutoAssignments=" + existingAutoAssignments.size()
                            + ",preservedManualAssignments=" + existingManualAssignments.size(),
                    "generatedAutoAssignments=" + assignmentsToSave.size() + ", targets=" + requests.size(),
                    "360 feedback evaluator assignments generated"
            );
            if (!existingManualAssignments.isEmpty()) {
                warnings.add(existingManualAssignments.size() + " manual evaluator override(s) were preserved during regeneration.");
            }
            details = buildAssignmentDetails(campaignId);
        } else {
            List<FeedbackEvaluatorAssignment> plannedDetails = new ArrayList<>(existingManualAssignments);
            plannedDetails.addAll(assignmentsToSave);
            details = buildAssignmentDetails(plannedDetails);
        }

        return FeedbackAssignmentGenerationResponse.builder()
                .campaignId(campaignId)
                .totalTargets(requests.size())
                .totalEvaluatorsGenerated(persist ? assignmentsToSave.size() + existingManualAssignments.size() : plannedAssignments)
                .evaluatorConfig(config)
                .requests(previewItems)
                .assignmentDetails(details)
                .warnings(warnings.stream().distinct().toList())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackAssignmentGenerationResponse getAssignmentPreview(Long campaignId) {
        getCampaignOrThrow(campaignId);
        return buildAssignmentResponse(campaignId, null, List.of());
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse addManualAssignment(Long campaignId, FeedbackManualAssignmentRequest request, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignOrThrow(campaignId);
        ensureDraftCampaign(campaign, "Manual evaluator changes are allowed only while the campaign is DRAFT.");

        FeedbackRequest feedbackRequest = feedbackRequestRepository
                .findByCampaignIdAndTargetEmployeeId(campaignId, request.getTargetEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Target employee is not part of this campaign."));

        validateManualAssignment(request, feedbackRequest);
        if (request.getReason() == null || request.getReason().trim().length() < 5) {
            throw new BusinessValidationException("Manual evaluator changes require a reason of at least 5 characters.");
        }

        if (assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(
                feedbackRequest.getId(), request.getEvaluatorEmployeeId())) {
            throw new BusinessValidationException("This evaluator is already assigned to the selected target employee.");
        }

        FeedbackEvaluatorAssignment assignment = createAssignment(
                feedbackRequest,
                request.getEvaluatorEmployeeId(),
                request.getRelationshipType(),
                EvaluatorSelectionMethod.MANUAL
        );
        if (request.getAnonymous() != null) {
            assignment.setIsAnonymous(request.getAnonymous());
        }
        assignment.setManualReason(normalizeManualReason(request.getReason()));
        questionReviewService.clearCampaignQuestionSelection(campaignId);
        FeedbackEvaluatorAssignment savedAssignment = assignmentRepository.save(assignment);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.ASSIGNMENT_MANUAL_ADDED,
                FeedbackOperationalService.ENTITY_ASSIGNMENT,
                savedAssignment.getId(),
                null,
                "campaignId=" + campaignId + ",targetEmployeeId=" + request.getTargetEmployeeId()
                        + ",evaluatorEmployeeId=" + request.getEvaluatorEmployeeId()
                        + ",relationshipType=" + request.getRelationshipType()
                        + ",reason=" + normalizeManualReason(request.getReason()),
                "Manual 360 feedback evaluator assignment added"
        );

        return buildAssignmentResponse(campaignId, null, List.of(
                "Manual evaluator #" + request.getEvaluatorEmployeeId()
                        + " added for target employee #" + request.getTargetEmployeeId() + "."
        ));
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse removeAssignment(Long campaignId, Long assignmentId, Long actorUserId) {
        FeedbackCampaign campaign = getCampaignOrThrow(campaignId);
        ensureDraftCampaign(campaign, "Evaluator assignments can be removed only while the campaign is DRAFT.");

        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(assignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator assignment not found."));
        if (assignment.getFeedbackRequest() == null
                || assignment.getFeedbackRequest().getCampaign() == null
                || !Objects.equals(assignment.getFeedbackRequest().getCampaign().getId(), campaignId)) {
            throw new BusinessValidationException("Evaluator assignment does not belong to this campaign.");
        }
        if (assignment.getStatus() == AssignmentStatus.SUBMITTED || assignment.getResponse() != null) {
            throw new BusinessValidationException("Submitted evaluator assignments cannot be removed.");
        }

        Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
        Long evaluatorEmployeeId = assignment.getEvaluatorEmployeeId();
        questionReviewService.clearCampaignQuestionSelection(campaignId);
        assignmentRepository.delete(assignment);
        feedbackOperationalService.audit(
                actorUserId,
                FeedbackOperationalService.ASSIGNMENT_REMOVED,
                FeedbackOperationalService.ENTITY_ASSIGNMENT,
                assignmentId,
                "campaignId=" + campaignId + ",targetEmployeeId=" + targetEmployeeId + ",evaluatorEmployeeId=" + evaluatorEmployeeId,
                null,
                "360 feedback evaluator assignment removed"
        );

        return buildAssignmentResponse(campaignId, null, List.of(
                "Evaluator #" + evaluatorEmployeeId + " removed from target employee #" + targetEmployeeId + "."
        ));
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId) {
        return assignmentRepository.findPendingEvaluatorsByRequestId(requestId);
    }

    private void validateConfig(EvaluatorConfigDTO config) {
        if (config == null) {
            throw new BusinessValidationException("Evaluator configuration is required.");
        }
        boolean anyEvaluatorSourceSelected = Boolean.TRUE.equals(config.getIncludeManager())
                || Boolean.TRUE.equals(config.getIncludeSelf())
                || Boolean.TRUE.equals(config.getIncludeSubordinates())
                || isPeerSelectionEnabled(config);
        if (!anyEvaluatorSourceSelected) {
            throw new BusinessValidationException("Choose at least one evaluator role.");
        }
        if (isPeerSelectionEnabled(config)) {
            int peerMin = requestedPeerMinCount(config);
            int peerMax = requestedPeerMaxCount(config);
            if (peerMax <= 0) {
                throw new BusinessValidationException("Maximum peer count must be greater than zero when peer evaluators are enabled.");
            }
            if (peerMin > peerMax) {
                throw new BusinessValidationException("Minimum peer count cannot be greater than maximum peer count.");
            }
        }
        if (Boolean.TRUE.equals(config.getIncludeSubordinates())) {
            int subordinateMin = requestedSubordinateMinCount(config);
            int subordinateMax = requestedSubordinateMaxCount(config);
            if (subordinateMin > subordinateMax) {
                throw new BusinessValidationException("Minimum subordinate count cannot be greater than maximum subordinate count.");
            }
        }
    }

    private void validateManualAssignment(FeedbackManualAssignmentRequest request, FeedbackRequest feedbackRequest) {
        User target = userRepository.findByEmployeeId(request.getTargetEmployeeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Target employee has no active user account."));
        User evaluator = userRepository.findByEmployeeId(request.getEvaluatorEmployeeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator employee has no active user account."));
        if (Boolean.FALSE.equals(target.getActive())) {
            throw new BusinessValidationException("Target employee must be active.");
        }
        if (Boolean.FALSE.equals(evaluator.getActive())) {
            throw new BusinessValidationException("Evaluator employee must be active.");
        }

        if (feedbackRequest.getCampaign() == null || feedbackRequest.getCampaign().getId() == null) {
            throw new BusinessValidationException("Invalid feedback request for manual assignment.");
        }

        FeedbackRelationshipType relationshipType = request.getRelationshipType();
        if (relationshipType == null) {
            throw new BusinessValidationException("Relationship type is required.");
        }

        if (relationshipType == FeedbackRelationshipType.SELF) {
            if (!Objects.equals(request.getTargetEmployeeId(), request.getEvaluatorEmployeeId())) {
                throw new BusinessValidationException("SELF assignments must use the same target and evaluator employee.");
            }
            return;
        }

        if (Objects.equals(request.getTargetEmployeeId(), request.getEvaluatorEmployeeId())) {
            throw new BusinessValidationException("Only SELF assignments can use the target employee as evaluator.");
        }

        // Manual MANAGER and SUBORDINATE overrides are intentionally allowed with a required HR reason.
        // This keeps the workflow usable when reporting hierarchy data is incomplete or temporarily wrong.
        if (relationshipType == FeedbackRelationshipType.PEER) {
            if (!hasAutoPeerLevel(evaluator) || hasManagerLikePositionTitle(evaluator)) {
                throw new BusinessValidationException("This evaluator cannot be added as a peer for this recipient.");
            }
            if (Objects.equals(target.getManagerId(), evaluator.getId())) {
                throw new BusinessValidationException("The recipient's manager cannot be added as a peer evaluator.");
            }
            if (Objects.equals(evaluator.getManagerId(), target.getId())) {
                throw new BusinessValidationException("A direct report cannot be added as a peer evaluator.");
            }
        }
    }

    private FeedbackAssignmentGenerationResponse buildAssignmentResponse(
            Long campaignId,
            EvaluatorConfigDTO config,
            List<String> extraWarnings
    ) {
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaignId);
        Map<Long, List<FeedbackEvaluatorAssignment>> assignmentsByRequestId = assignments.stream()
                .collect(Collectors.groupingBy(a -> a.getFeedbackRequest().getId()));

        List<String> warnings = new ArrayList<>(extraWarnings == null ? List.of() : extraWarnings);
        List<FeedbackAssignmentPreviewItemResponse> previewItems = requests.stream()
                .map(request -> buildPreviewItem(request, assignmentsByRequestId.getOrDefault(request.getId(), List.of()), warnings))
                .toList();

        return FeedbackAssignmentGenerationResponse.builder()
                .campaignId(campaignId)
                .totalTargets(requests.size())
                .totalEvaluatorsGenerated(assignments.size())
                .evaluatorConfig(config)
                .requests(previewItems)
                .assignmentDetails(buildAssignmentDetails(assignments))
                .warnings(warnings.stream().distinct().toList())
                .build();
    }

    private FeedbackAssignmentPreviewItemResponse buildPreviewItem(
            FeedbackRequest request,
            List<FeedbackEvaluatorAssignment> assignments,
            List<String> campaignWarnings
    ) {
        Map<FeedbackRelationshipType, Long> countsByType = assignments.stream()
                .collect(Collectors.groupingBy(
                        FeedbackEvaluatorAssignment::getRelationshipType,
                        () -> new EnumMap<>(FeedbackRelationshipType.class),
                        Collectors.counting()
                ));
        long autoCount = assignments.stream()
                .filter(assignment -> assignment.getSelectionMethod() != EvaluatorSelectionMethod.MANUAL)
                .count();
        long manualCount = assignments.stream()
                .filter(assignment -> assignment.getSelectionMethod() == EvaluatorSelectionMethod.MANUAL)
                .count();

        List<String> targetWarnings = new ArrayList<>();
        if (assignments.isEmpty()) {
            targetWarnings.add("Target employee " + request.getTargetEmployeeId() + " has no evaluator assignments yet.");
        }
        campaignWarnings.addAll(targetWarnings);

        return FeedbackAssignmentPreviewItemResponse.builder()
                .requestId(request.getId())
                .targetEmployeeId(request.getTargetEmployeeId())
                .targetEmployeeName(resolveEmployeeNameForId(request.getTargetEmployeeId()))
                .managerAssignments(countsByType.getOrDefault(FeedbackRelationshipType.MANAGER, 0L).intValue())
                .selfAssignments(countsByType.getOrDefault(FeedbackRelationshipType.SELF, 0L).intValue())
                .subordinateAssignments(countsByType.getOrDefault(FeedbackRelationshipType.SUBORDINATE, 0L).intValue())
                .peerAssignments(countsByType.getOrDefault(FeedbackRelationshipType.PEER, 0L).intValue())
                .totalAssignments(assignments.size())
                .autoAssignments((int) autoCount)
                .manualAssignments((int) manualCount)
                .warnings(targetWarnings)
                .build();
    }

    private List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(Long campaignId) {
        return buildAssignmentDetails(assignmentRepository.findByCampaignIdWithRequest(campaignId));
    }

    private List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(List<FeedbackEvaluatorAssignment> assignments) {
        Set<Integer> employeeIds = assignments.stream()
                .flatMap(assignment -> List.of(
                        assignment.getFeedbackRequest().getTargetEmployeeId(),
                        assignment.getEvaluatorEmployeeId()
                ).stream())
                .filter(Objects::nonNull)
                .map(Long::intValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<Integer, User> usersByEmployeeId = employeeIds.stream()
                .map(userRepository::findByEmployeeId)
                .flatMap(optional -> optional.stream())
                .collect(Collectors.toMap(User::getEmployeeId, Function.identity(), (left, right) -> left));

        return assignments.stream()
                .map(assignment -> {
                    Long targetEmployeeId = assignment.getFeedbackRequest().getTargetEmployeeId();
                    Long evaluatorEmployeeId = assignment.getEvaluatorEmployeeId();
                    return FeedbackAssignmentDetailItemResponse.builder()
                            .assignmentId(assignment.getId())
                            .requestId(assignment.getFeedbackRequest().getId())
                            .targetEmployeeId(targetEmployeeId)
                            .targetEmployeeName(resolveEmployeeName(usersByEmployeeId, targetEmployeeId))
                            .evaluatorEmployeeId(evaluatorEmployeeId)
                            .evaluatorEmployeeName(assignment.getEvaluatorEmployeeName() != null ? assignment.getEvaluatorEmployeeName() : resolveEmployeeName(usersByEmployeeId, evaluatorEmployeeId))
                            .evaluatorEmployeeCode(assignment.getEvaluatorEmployeeCode())
                            .evaluatorEmployeeEmail(assignment.getEvaluatorEmployeeEmail())
                            .evaluatorDepartmentId(assignment.getEvaluatorDepartmentId())
                            .evaluatorPositionId(assignment.getEvaluatorPositionId())
                            .evaluatorPositionName(assignment.getEvaluatorPositionName())
                            .manualReason(assignment.getManualReason())
                            .selectionReason(resolveSelectionReason(assignment))
                            .confidence(resolveAssignmentConfidence(assignment))
                            .warnings(resolveAssignmentDetailWarnings(assignment, usersByEmployeeId))
                            .relationshipType(assignment.getRelationshipType())
                            .selectionMethod(assignment.getSelectionMethod())
                            .status(assignment.getStatus())
                            .anonymous(assignment.getIsAnonymous())
                            .build();
                })
                .toList();
    }

    private String resolveSelectionReason(FeedbackEvaluatorAssignment assignment) {
        if (assignment == null || assignment.getSelectionMethod() == null) {
            return null;
        }
        if (assignment.getSelectionMethod() == EvaluatorSelectionMethod.MANUAL) {
            return assignment.getManualReason() == null || assignment.getManualReason().isBlank()
                    ? "HR manually added this evaluator."
                    : "HR manual override: " + assignment.getManualReason();
        }
        if (assignment.getRelationshipType() == FeedbackRelationshipType.PEER) {
            return "Randomly selected from the validated eligible peer pool after excluding self, manager, direct reports, department heads, manager-like roles, HR/admin users, inactive users, and existing manual assignments.";
        }
        return "Automatically resolved from available organization relationship data.";
    }

    private String resolveAssignmentConfidence(FeedbackEvaluatorAssignment assignment) {
        if (assignment == null || assignment.getSelectionMethod() == null) {
            return "UNKNOWN";
        }
        if (assignment.getSelectionMethod() == EvaluatorSelectionMethod.MANUAL) {
            return "HR_CONFIRMED";
        }
        if (assignment.getRelationshipType() == FeedbackRelationshipType.PEER) {
            return "MEDIUM";
        }
        return "HIGH";
    }

    private List<String> resolveAssignmentDetailWarnings(
            FeedbackEvaluatorAssignment assignment,
            Map<Integer, User> usersByEmployeeId
    ) {
        if (assignment == null) {
            return List.of();
        }
        List<String> detailWarnings = new ArrayList<>();
        if (assignment.getId() == null) {
            detailWarnings.add("Preview only; not saved yet.");
        }
        if (assignment.getSelectionMethod() == EvaluatorSelectionMethod.MANUAL) {
            detailWarnings.add("Manual override. Keep the reason for audit review.");
        }
        if (assignment.getRelationshipType() == FeedbackRelationshipType.PEER
                && assignment.getSelectionMethod() == EvaluatorSelectionMethod.AUTO_RANDOM) {
            detailWarnings.add("Auto-random peer selected from eligible pool only.");
        }
        Long evaluatorEmployeeId = assignment.getEvaluatorEmployeeId();
        if (evaluatorEmployeeId != null) {
            User evaluator = usersByEmployeeId.get(evaluatorEmployeeId.intValue());
            if (hasManagerLikePositionTitle(evaluator)) {
                detailWarnings.add("Evaluator has a manager-like position title; HR should review this assignment.");
            }
        }
        return detailWarnings;
    }

    private String resolveEmployeeName(Map<Integer, User> usersByEmployeeId, Long employeeId) {
        if (employeeId == null) {
            return null;
        }
        User user = usersByEmployeeId.get(employeeId.intValue());
        if (user == null || user.getFullName() == null || user.getFullName().isBlank()) {
            return "Employee #" + employeeId;
        }
        return user.getFullName();
    }

    private String resolveEmployeeNameForId(Long employeeId) {
        if (employeeId == null) {
            return null;
        }
        return userRepository.findByEmployeeId(employeeId.intValue())
                .map(user -> user.getFullName() == null || user.getFullName().isBlank()
                        ? "Employee #" + employeeId
                        : user.getFullName())
                .orElse("Employee #" + employeeId);
    }

    private FeedbackCampaign getCampaignOrThrow(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    private void ensureDraftCampaign(FeedbackCampaign campaign, String message) {
        if (campaign.getStatus() != FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException(message);
        }
    }

    private boolean hasPeerSource(EvaluatorConfigDTO config) {
        return isPeerSelectionEnabled(config);
    }

    private boolean isPeerSelectionEnabled(EvaluatorConfigDTO config) {
        if (config == null) {
            return false;
        }
        if (config.getIncludePeers() != null) {
            return Boolean.TRUE.equals(config.getIncludePeers())
                    && (isTeamPeerSelectionEnabled(config)
                    || isDepartmentPeerSelectionEnabled(config)
                    || Boolean.TRUE.equals(config.getIncludeProjectPeers())
                    || Boolean.TRUE.equals(config.getIncludeCrossTeamPeers()));
        }
        return Boolean.TRUE.equals(config.getIncludeTeamPeers())
                || Boolean.TRUE.equals(config.getIncludeDepartmentPeers())
                || Boolean.TRUE.equals(config.getIncludeProjectPeers())
                || Boolean.TRUE.equals(config.getIncludeCrossTeamPeers());
    }

    private boolean isTeamPeerSelectionEnabled(EvaluatorConfigDTO config) {
        return config != null
                && !Boolean.FALSE.equals(config.getIncludePeers())
                && !Boolean.FALSE.equals(config.getIncludeTeamPeers());
    }

    private boolean isDepartmentPeerSelectionEnabled(EvaluatorConfigDTO config) {
        return config != null
                && !Boolean.FALSE.equals(config.getIncludePeers())
                && !Boolean.FALSE.equals(config.getIncludeDepartmentPeers());
    }

    private int requestedPeerMinCount(EvaluatorConfigDTO config) {
        if (config.getPeerMinCount() != null) {
            return Math.max(0, config.getPeerMinCount());
        }
        return config.getPeerCount() == null ? 2 : Math.max(0, config.getPeerCount());
    }

    private int requestedPeerMaxCount(EvaluatorConfigDTO config) {
        if (config.getPeerMaxCount() != null) {
            return Math.max(1, config.getPeerMaxCount());
        }
        return config.getPeerCount() == null ? 5 : Math.max(1, config.getPeerCount());
    }

    private int requestedSubordinateMinCount(EvaluatorConfigDTO config) {
        return config.getSubordinateMinCount() == null ? 0 : Math.max(0, config.getSubordinateMinCount());
    }

    private int requestedSubordinateMaxCount(EvaluatorConfigDTO config) {
        return config.getSubordinateMaxCount() == null ? 5 : Math.max(0, config.getSubordinateMaxCount());
    }

    private Integer resolveWorkingDepartmentId(FeedbackRequest request, User targetUser) {
        if (request != null && request.getTargetCurrentDepartmentId() != null) {
            return request.getTargetCurrentDepartmentId();
        }
        return targetUser == null ? null : targetUser.getDepartmentId();
    }

    private boolean addAssignment(
            List<FeedbackEvaluatorAssignment> assignmentsToSave,
            Set<Long> assignedEvaluatorEmployeeIds,
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod,
            boolean persist
    ) {
        if (evaluatorEmployeeId == null || !assignedEvaluatorEmployeeIds.add(evaluatorEmployeeId)) {
            return false;
        }
        assignmentsToSave.add(createAssignment(request, evaluatorEmployeeId, relationshipType, selectionMethod));
        return true;
    }

    private boolean addAssignment(
            List<FeedbackEvaluatorAssignment> assignmentsToSave,
            Set<Long> assignedEvaluatorEmployeeIds,
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod
    ) {
        return addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, evaluatorEmployeeId, relationshipType, selectionMethod, true);
    }

    private FeedbackEvaluatorAssignment createAssignment(
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod
    ) {
        FeedbackEvaluatorAssignment assignment = new FeedbackEvaluatorAssignment();
        assignment.setFeedbackRequest(request);
        assignment.setEvaluatorEmployeeId(evaluatorEmployeeId);
        assignment.setRelationshipType(relationshipType);
        assignment.setSelectionMethod(selectionMethod);
        assignment.setIsAnonymous(isAnonymous(request == null ? null : request.getCampaign(), relationshipType));
        assignment.setStatus(AssignmentStatus.PENDING);
        snapshotEvaluator(assignment, evaluatorEmployeeId);
        return assignment;
    }

    private void snapshotEvaluator(FeedbackEvaluatorAssignment assignment, Long evaluatorEmployeeId) {
        if (assignment == null || evaluatorEmployeeId == null) {
            return;
        }
        userRepository.findByEmployeeId(evaluatorEmployeeId.intValue()).ifPresent(user -> {
            assignment.setEvaluatorUserId(user.getId());
            assignment.setEvaluatorEmployeeCode(user.getEmployeeCode());
            assignment.setEvaluatorEmployeeName(user.getFullName() == null || user.getFullName().isBlank()
                    ? "Employee #" + evaluatorEmployeeId
                    : user.getFullName().trim());
            assignment.setEvaluatorEmployeeEmail(user.getEmail());
            assignment.setEvaluatorDepartmentId(user.getDepartmentId());
            if (user.getPosition() != null) {
                assignment.setEvaluatorPositionId(user.getPosition().getId());
                assignment.setEvaluatorPositionName(user.getPosition().getPositionTitle());
            }
        });
    }

    private boolean isAnonymous(FeedbackCampaign campaign, FeedbackRelationshipType relationshipType) {
        if (relationshipType == null) {
            return false;
        }
        if (campaign != null) {
            return switch (relationshipType) {
                case MANAGER -> Boolean.TRUE.equals(campaign.getManagerFeedbackAnonymous());
                case PEER -> !Boolean.FALSE.equals(campaign.getPeerFeedbackAnonymous());
                case SUBORDINATE -> !Boolean.FALSE.equals(campaign.getSubordinateFeedbackAnonymous());
                case SELF -> Boolean.TRUE.equals(campaign.getSelfFeedbackAnonymous());
            };
        }
        return relationshipType == FeedbackRelationshipType.PEER
                || relationshipType == FeedbackRelationshipType.SUBORDINATE;
    }

    private String normalizeManualReason(String reason) {
        if (reason == null) {
            return null;
        }
        String trimmed = reason.trim();
        return trimmed.length() > 1000 ? trimmed.substring(0, 1000) : trimmed;
    }

    private Long resolveManagerEmployeeId(User targetUser, Integer workingDepartmentId) {
        Long directManagerEmployeeId = null;
        if (targetUser.getManagerId() != null) {
            directManagerEmployeeId = userRepository.findById(targetUser.getManagerId())
                    .filter(manager -> !Boolean.FALSE.equals(manager.getActive()))
                    .map(User::getEmployeeId)
                    .filter(Objects::nonNull)
                    .map(Integer::longValue)
                    .orElse(null);
        }
        if (directManagerEmployeeId != null) {
            return directManagerEmployeeId;
        }

        Integer departmentId = workingDepartmentId != null ? workingDepartmentId : targetUser.getDepartmentId();
        if (departmentId == null) {
            return null;
        }
        return userRepository.findActiveDepartmentHeadsByDepartmentId(departmentId).stream()
                .filter(head -> head.getEmployeeId() != null)
                .filter(head -> !Objects.equals(head.getEmployeeId(), targetUser.getEmployeeId()))
                .map(User::getEmployeeId)
                .map(Integer::longValue)
                .findFirst()
                .orElse(null);
    }

    private Set<Long> findDirectSubordinateEmployeeIds(User targetUser) {
        return userRepository.findByManagerIdAndActiveTrue(targetUser.getId()).stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private LinkedHashSet<Long> filterEligiblePeerPool(
            Set<Long> rawPeerPool,
            Long targetEmployeeId,
            Long managerEmployeeId,
            Set<Long> subordinateEmployeeIds,
            Set<Long> alreadyAssignedEmployeeIds,
            Integer workingDepartmentId,
            List<String> targetWarnings
    ) {
        LinkedHashSet<Long> filtered = new LinkedHashSet<>(rawPeerPool == null ? Set.of() : rawPeerPool);
        filtered.remove(null);
        filtered.remove(targetEmployeeId);
        if (managerEmployeeId != null) {
            filtered.remove(managerEmployeeId);
        }
        if (subordinateEmployeeIds != null) {
            subordinateEmployeeIds.forEach(filtered::remove);
        }
        if (alreadyAssignedEmployeeIds != null) {
            alreadyAssignedEmployeeIds.forEach(filtered::remove);
        }

        int beforeGovernance = filtered.size();
        Set<Long> governanceExcludedEmployeeIds = findAutoPeerGovernanceExclusionEmployeeIds(workingDepartmentId);
        filtered.removeAll(governanceExcludedEmployeeIds);

        LinkedHashSet<Long> eligible = filtered.stream()
                .filter(employeeId -> {
                    User candidate = findActiveUserForEmployeeId(employeeId);
                    return candidate != null && hasAutoPeerLevel(candidate) && !hasManagerLikePositionTitle(candidate);
                })
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (targetWarnings != null && beforeGovernance > eligible.size()) {
            targetWarnings.add("Some peer candidates were excluded because they are department heads, managers, HR/admin users, inactive users, or manager-like positions.");
        }
        return eligible;
    }

    private Set<Long> findAutoPeerGovernanceExclusionEmployeeIds(Integer workingDepartmentId) {
        LinkedHashSet<Long> employeeIds = new LinkedHashSet<>();
        if (workingDepartmentId != null) {
            userRepository.findActiveDepartmentHeadsByDepartmentId(workingDepartmentId).stream()
                    .map(User::getEmployeeId)
                    .filter(Objects::nonNull)
                    .map(Integer::longValue)
                    .forEach(employeeIds::add);
            userRepository.findActiveManagersByDepartmentId(workingDepartmentId).stream()
                    .map(User::getEmployeeId)
                    .filter(Objects::nonNull)
                    .map(Integer::longValue)
                    .forEach(employeeIds::add);
        }
        userRepository.findActiveUsersByNormalizedRoleNames(List.of(
                        "ADMIN", "HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES", "HR_MANAGER", "HR_ADMIN",
                        "CEO", "EXECUTIVE", "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD",
                        "HEAD_OF_DEPARTMENT", "MANAGER", "PROJECT_MANAGER", "TEAM_MANAGER"
                )).stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add);
        return employeeIds;
    }

    private boolean hasActiveUserForEmployeeId(Long employeeId) {
        return findActiveUserForEmployeeId(employeeId) != null;
    }

    private User findActiveUserForEmployeeId(Long employeeId) {
        if (employeeId == null) {
            return null;
        }
        return userRepository.findByEmployeeId(employeeId.intValue())
                .filter(user -> !Boolean.FALSE.equals(user.getActive()))
                .orElse(null);
    }

    private boolean hasAutoPeerLevel(User user) {
        if (user == null || user.getPosition() == null || user.getPosition().getLevel() == null) {
            return false;
        }
        String levelCode = user.getPosition().getLevel().getLevelCode();
        if (levelCode == null || levelCode.isBlank()) {
            return false;
        }
        return AUTO_PEER_LEVEL_CODES.contains(levelCode.trim().toUpperCase(Locale.ROOT).replace(" ", ""));
    }

    private boolean hasManagerLikePositionTitle(User user) {
        if (user == null || user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
            return false;
        }
        String normalized = normalizeLabel(user.getPosition().getPositionTitle());
        return normalized.contains("MANAGER")
                || normalized.contains("DEPARTMENT_HEAD")
                || normalized.contains("HEAD")
                || normalized.contains("DIRECTOR")
                || normalized.contains("CHIEF")
                || normalized.contains("EXECUTIVE")
                || normalized.contains("CEO")
                || normalized.contains("CTO")
                || normalized.contains("CFO")
                || normalized.contains("COO")
                || normalized.contains("SUPERVISOR")
                || normalized.contains("LEAD")
                || normalized.contains("HR")
                || normalized.contains("ADMIN");
    }

    private String normalizeLabel(String value) {
        return value == null ? "" : value.trim().toUpperCase().replaceAll("[^A-Z0-9]+", "_");
    }

    private List<Long> selectPeers(Set<Long> peerPool, int peerCount, Long campaignId, Long targetEmployeeId) {
        if (peerPool.isEmpty() || peerCount <= 0) {
            return List.of();
        }
        List<Long> candidates = new ArrayList<>(peerPool);
        long seed = Objects.hash(campaignId, targetEmployeeId, "PEER_AUTO_RANDOM");
        Collections.shuffle(candidates, new Random(seed));
        return candidates.stream().limit(peerCount).toList();
    }

    private Set<Long> findDepartmentPeerEmployeeIds(User targetUser, Integer workingDepartmentId) {
        if (workingDepartmentId == null) {
            return Set.of();
        }
        return userRepository.findByDepartmentIdAndActiveTrue(workingDepartmentId).stream()
                .filter(candidate -> candidate.getEmployeeId() != null)
                .filter(candidate -> !Objects.equals(candidate.getId(), targetUser.getId()))
                .map(candidate -> candidate.getEmployeeId().longValue())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private Set<Long> findTeamPeerEmployeeIds(User targetUser) {
        Set<Long> employeeIds = new LinkedHashSet<>();
        for (Team team : findActiveTeams(targetUser)) {
            if (team.getTeamLeader() != null
                    && team.getTeamLeader().getEmployeeId() != null
                    && !Boolean.FALSE.equals(team.getTeamLeader().getActive())) {
                employeeIds.add(team.getTeamLeader().getEmployeeId().longValue());
            }
            List<TeamMember> members = team.getTeamMembers() != null
                    ? team.getTeamMembers()
                    : teamMemberRepository.findByTeamId(team.getId());
            for (TeamMember member : members) {
                if (member.getEndedDate() == null
                        && member.getMemberUser() != null
                        && member.getMemberUser().getEmployeeId() != null
                        && !Boolean.FALSE.equals(member.getMemberUser().getActive())) {
                    employeeIds.add(member.getMemberUser().getEmployeeId().longValue());
                }
            }
        }
        return employeeIds;
    }

    private Set<Long> findCrossTeamPeerEmployeeIds(User targetUser, Set<Integer> targetTeamIds) {
        Set<Long> candidateEmployeeIds = new LinkedHashSet<>();

        for (User candidate : findActiveUsers()) {
            if (candidate.getEmployeeId() == null || Objects.equals(candidate.getId(), targetUser.getId())) {
                continue;
            }
            if (targetUser.getDepartmentId() != null
                    && !Objects.equals(candidate.getDepartmentId(), targetUser.getDepartmentId())) {
                continue;
            }
            Set<Integer> candidateTeamIds = findActiveTeamIds(candidate);
            if (!targetTeamIds.isEmpty()) {
                if (candidateTeamIds.isEmpty() || !Collections.disjoint(candidateTeamIds, targetTeamIds)) {
                    continue;
                }
            } else if (candidateTeamIds.isEmpty()) {
                continue;
            }
            candidateEmployeeIds.add(candidate.getEmployeeId().longValue());
        }

        return candidateEmployeeIds;
    }

    private List<User> findActiveUsers() {
        return userRepository.findAll().stream()
                .filter(candidate -> !Boolean.FALSE.equals(candidate.getActive()))
                .sorted(Comparator.comparing(User::getId))
                .toList();
    }

    private List<Team> findActiveTeams(User user) {
        Map<Integer, Team> teams = teamMemberRepository.findByMemberUserId(user.getId()).stream()
                .filter(member -> member.getEndedDate() == null)
                .map(TeamMember::getTeam)
                .filter(Objects::nonNull)
                .filter(team -> "Active".equalsIgnoreCase(team.getStatus()))
                .collect(Collectors.toMap(Team::getId, team -> team, (left, right) -> left));

        for (Team ledTeam : teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(user.getId(), "Active")) {
            teams.put(ledTeam.getId(), ledTeam);
        }

        return teams.values().stream()
                .sorted(Comparator.comparing(Team::getId))
                .toList();
    }

    private Set<Integer> findActiveTeamIds(User user) {
        return findActiveTeams(user).stream()
                .map(Team::getId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }
}
