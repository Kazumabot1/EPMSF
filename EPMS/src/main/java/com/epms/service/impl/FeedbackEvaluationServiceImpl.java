package com.epms.service.impl;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentDetailItemResponse;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackAssignmentPreviewItemResponse;
import com.epms.dto.FeedbackManualAssignmentRequest;
import com.epms.dto.FeedbackRelationshipCandidateResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSelectionMethod;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.projection.PendingEvaluatorProjection;
import com.epms.service.FeedbackEvaluationService;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.FeedbackWorkRelationshipResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.EnumMap;
import java.util.HashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackEvaluationServiceImpl implements FeedbackEvaluationService {

    private static final Set<String> EXECUTIVE_ROLE_NAMES = Set.of("CEO", "EXECUTIVE");

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackCampaignQuestionReviewService questionReviewService;
    private final FeedbackWorkRelationshipResolver workRelationshipResolver;

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

        List<FeedbackEvaluatorAssignment> existingAssignments = assignmentRepository.findByCampaignIdWithRequest(campaignId);
        Map<Integer, User> usersByEmployeeId = loadUsersByEmployeeId();
        Map<Integer, Set<Integer>> activeTeamIdsByEmployeeId = buildActiveTeamIdsByEmployeeId(usersByEmployeeId);
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
        Map<Long, Integer> evaluatorLoadByEmployeeId = existingManualAssignments.stream()
                .map(FeedbackEvaluatorAssignment::getEvaluatorEmployeeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Function.identity(), employeeId -> 1, Integer::sum));

        for (FeedbackRequest request : requests) {
            List<String> targetWarnings = new ArrayList<>();
            User targetUser = usersByEmployeeId.get(request.getTargetEmployeeId().intValue());
            if (targetUser == null) {
                throw new ResourceNotFoundException("No user account is linked to target employee " + request.getTargetEmployeeId() + ".");
            }

            Set<Integer> targetTeamIds = activeTeamIdsByEmployeeId.getOrDefault(request.getTargetEmployeeId().intValue(), Set.of());
            Set<Long> assignedEvaluatorEmployeeIds = new LinkedHashSet<>();
            Set<Long> managerEmployeeIds = workRelationshipResolver.resolveManagerEmployeeIds(targetUser);
            Set<Long> subordinateEmployeeIds = workRelationshipResolver.resolveSubordinateEmployeeIds(targetUser);
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

            int managerAssignments = manualCountsByType.getOrDefault(FeedbackRelationshipType.MANAGER, 0L).intValue();
            int selfAssignments = manualCountsByType.getOrDefault(FeedbackRelationshipType.SELF, 0L).intValue();
            int subordinateAssignments = manualCountsByType.getOrDefault(FeedbackRelationshipType.SUBORDINATE, 0L).intValue();
            int peerAssignments = manualCountsByType.getOrDefault(FeedbackRelationshipType.PEER, 0L).intValue();
            int autoAssignmentsForTarget = 0;
            int manualAssignmentsForTarget = preservedManualAssignments.size();

            if (Boolean.TRUE.equals(config.getIncludeManager())) {
                if (managerEmployeeIds.isEmpty()) {
                    targetWarnings.add("No eligible manager reviewer found. Manager feedback will be skipped for this recipient.");
                }
                for (Long managerEmployeeId : managerEmployeeIds) {
                    if (managerEmployeeId != null && !Objects.equals(managerEmployeeId, request.getTargetEmployeeId())) {
                        if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, managerEmployeeId,
                                FeedbackRelationshipType.MANAGER, EvaluatorSelectionMethod.AUTO_RELATIONSHIP, usersByEmployeeId)) {
                            managerAssignments++;
                            autoAssignmentsForTarget++;
                            incrementEvaluatorLoad(evaluatorLoadByEmployeeId, managerEmployeeId);
                        }
                    }
                }
            }

            if (Boolean.TRUE.equals(config.getIncludeSelf())) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, request.getTargetEmployeeId(),
                        FeedbackRelationshipType.SELF, EvaluatorSelectionMethod.AUTO_RELATIONSHIP, usersByEmployeeId)) {
                    selfAssignments++;
                    autoAssignmentsForTarget++;
                    incrementEvaluatorLoad(evaluatorLoadByEmployeeId, request.getTargetEmployeeId());
                }
            }

            if (Boolean.TRUE.equals(config.getIncludeSubordinates())) {
                List<Long> selectedSubordinates = subordinateEmployeeIds.stream()
                        .filter(employeeId -> !Objects.equals(employeeId, request.getTargetEmployeeId()))
                        .filter(employeeId -> !managerEmployeeIds.contains(employeeId))
                        .filter(employeeId -> !assignedEvaluatorEmployeeIds.contains(employeeId))
                        .filter(employeeId -> hasActiveUserForEmployeeId(employeeId, usersByEmployeeId))
                        .sorted()
                        .limit(requestedSubordinateMaxCount(config))
                        .toList();

                if (subordinateEmployeeIds.isEmpty()) {
                    targetWarnings.add("No eligible subordinate reviewers found. Subordinate feedback will be skipped for this recipient.");
                }
                if (selectedSubordinates.size() < requestedSubordinateMinCount(config)) {
                    targetWarnings.add("Only " + selectedSubordinates.size()
                            + " eligible subordinate evaluator(s) found; minimum rule is "
                            + requestedSubordinateMinCount(config) + ".");
                }

                for (Long subordinateEmployeeId : selectedSubordinates) {
                    if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, subordinateEmployeeId,
                            FeedbackRelationshipType.SUBORDINATE, EvaluatorSelectionMethod.AUTO_RELATIONSHIP, usersByEmployeeId)) {
                        subordinateAssignments++;
                        autoAssignmentsForTarget++;
                        incrementEvaluatorLoad(evaluatorLoadByEmployeeId, subordinateEmployeeId);
                    }
                }
            }

            LinkedHashSet<Long> peerPool = new LinkedHashSet<>();
            if (isPeerSelectionEnabled(config)) {
                peerPool.addAll(workRelationshipResolver.resolvePeerEmployeeIds(targetUser));
                peerPool.remove(null);
                peerPool.remove(request.getTargetEmployeeId());
                peerPool.removeAll(managerEmployeeIds);
                peerPool.removeAll(subordinateEmployeeIds);
                peerPool.removeAll(assignedEvaluatorEmployeeIds);

                if (peerPool.isEmpty()) {
                    targetWarnings.add("No eligible peer reviewers found. Peer feedback will be skipped for this recipient.");
                }
            }

            int requestedPeerMinCount = requestedPeerMinCount(config);
            int requestedPeerMaxCount = requestedPeerMaxCount(config);
            List<Long> selectedPeers = isPeerSelectionEnabled(config)
                    ? selectPeers(peerPool, requestedPeerMaxCount, targetUser, targetTeamIds, evaluatorLoadByEmployeeId, usersByEmployeeId, activeTeamIdsByEmployeeId)
                    : List.of();
            if (isPeerSelectionEnabled(config) && selectedPeers.size() < requestedPeerMinCount) {
                targetWarnings.add("Only " + selectedPeers.size()
                        + " eligible peer evaluator(s) found; minimum rule is "
                        + requestedPeerMinCount + ".");
            }
            for (Long peerEmployeeId : selectedPeers) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, peerEmployeeId,
                        FeedbackRelationshipType.PEER, EvaluatorSelectionMethod.AUTO_RANKED, usersByEmployeeId)) {
                    peerAssignments++;
                    autoAssignmentsForTarget++;
                    incrementEvaluatorLoad(evaluatorLoadByEmployeeId, peerEmployeeId);
                }
            }

            int totalForTarget = managerAssignments + selfAssignments + subordinateAssignments + peerAssignments;
            plannedAssignments += totalForTarget;
            warnings.addAll(targetWarnings);
            previewItems.add(FeedbackAssignmentPreviewItemResponse.builder()
                    .requestId(request.getId())
                    .targetEmployeeId(request.getTargetEmployeeId())
                    .targetEmployeeName(resolveEmployeeName(usersByEmployeeId, request.getTargetEmployeeId()))
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
                    .filter(warning -> warning.contains("minimum rule") || warning.contains("No eligible manager reviewer"))
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
        return buildAssignmentResponse(campaignId, List.of());
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

        return buildAssignmentResponse(campaignId, List.of(
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

        return buildAssignmentResponse(campaignId, List.of(
                "Evaluator #" + evaluatorEmployeeId + " removed from target employee #" + targetEmployeeId + "."
        ));
    }


    @Override
    @Transactional(readOnly = true)
    public List<FeedbackRelationshipCandidateResponse> getRelationshipCandidates(
            Long campaignId,
            Long targetEmployeeId,
            FeedbackRelationshipType relationshipType
    ) {
        getCampaignOrThrow(campaignId);
        if (targetEmployeeId == null) {
            throw new BusinessValidationException("Target employee is required.");
        }
        if (relationshipType == null) {
            throw new BusinessValidationException("Relationship type is required.");
        }

        FeedbackRequest feedbackRequest = feedbackRequestRepository
                .findByCampaignIdAndTargetEmployeeId(campaignId, targetEmployeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Target employee is not part of this campaign."));

        User targetUser = userRepository.findByEmployeeId(feedbackRequest.getTargetEmployeeId().intValue())
                .orElseThrow(() -> new ResourceNotFoundException("Target employee has no active user account."));
        if (Boolean.FALSE.equals(targetUser.getActive())) {
            throw new BusinessValidationException("Target employee must be active.");
        }

        LinkedHashSet<Long> candidateEmployeeIds = switch (relationshipType) {
            case SELF -> new LinkedHashSet<>(List.of(feedbackRequest.getTargetEmployeeId()));
            case MANAGER -> workRelationshipResolver.resolveManagerEmployeeIds(targetUser);
            case SUBORDINATE -> workRelationshipResolver.resolveSubordinateEmployeeIds(targetUser);
            case PEER -> workRelationshipResolver.resolvePeerEmployeeIds(targetUser);
        };

        Map<Integer, String> departmentNamesById = new HashMap<>();
        return candidateEmployeeIds.stream()
                .filter(Objects::nonNull)
                .map(employeeId -> userRepository.findByEmployeeId(employeeId.intValue()))
                .flatMap(optional -> optional.stream())
                .filter(candidate -> !Boolean.FALSE.equals(candidate.getActive()))
                .filter(candidate -> isRelationshipCandidateAllowed(targetUser, candidate, relationshipType))
                .sorted(Comparator
                        .comparing((User user) -> safeLower(user.getFullName()))
                        .thenComparing((User user) -> safeLower(user.getEmail()))
                        .thenComparing(User::getId, Comparator.nullsLast(Integer::compareTo)))
                .map(candidate -> toRelationshipCandidateResponse(targetUser, candidate, relationshipType, departmentNamesById))
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId) {
        return assignmentRepository.findPendingEvaluatorsByRequestId(requestId);
    }


    private boolean isRelationshipCandidateAllowed(
            User targetUser,
            User candidateUser,
            FeedbackRelationshipType relationshipType
    ) {
        if (targetUser == null || candidateUser == null || relationshipType == null) {
            return false;
        }
        return switch (relationshipType) {
            case SELF -> Objects.equals(targetUser.getEmployeeId(), candidateUser.getEmployeeId());
            case MANAGER, SUBORDINATE, PEER -> workRelationshipResolver.isValidRelationship(
                    targetUser, candidateUser, relationshipType
            );
        };
    }

    private FeedbackRelationshipCandidateResponse toRelationshipCandidateResponse(
            User targetUser,
            User candidateUser,
            FeedbackRelationshipType relationshipType,
            Map<Integer, String> departmentNamesById
    ) {
        return FeedbackRelationshipCandidateResponse.builder()
                .employeeId(candidateUser.getEmployeeId() == null ? null : candidateUser.getEmployeeId().longValue())
                .userId(candidateUser.getId())
                .employeeCode(candidateUser.getEmployeeCode())
                .employeeName(candidateUser.getFullName())
                .email(candidateUser.getEmail())
                .currentDepartmentId(candidateUser.getDepartmentId())
                .currentDepartmentName(resolveDepartmentName(candidateUser.getDepartmentId(), departmentNamesById))
                .positionId(candidateUser.getPosition() == null ? null : candidateUser.getPosition().getId())
                .positionName(candidateUser.getPosition() == null ? null : candidateUser.getPosition().getPositionTitle())
                .levelCode(candidateUser.getPosition() == null || candidateUser.getPosition().getLevel() == null
                        ? null
                        : candidateUser.getPosition().getLevel().getLevelCode())
                .relationshipType(relationshipType)
                .sourceLabel(resolveCandidateSourceLabel(targetUser, candidateUser, relationshipType))
                .build();
    }

    private String resolveDepartmentName(Integer departmentId, Map<Integer, String> departmentNamesById) {
        if (departmentId == null) {
            return null;
        }
        if (departmentNamesById.containsKey(departmentId)) {
            return departmentNamesById.get(departmentId);
        }
        String departmentName = departmentRepository.findById(departmentId)
                .map(department -> department.getDepartmentName())
                .orElse(null);
        departmentNamesById.put(departmentId, departmentName);
        return departmentName;
    }

    private String resolveCandidateSourceLabel(
            User targetUser,
            User candidateUser,
            FeedbackRelationshipType relationshipType
    ) {
        if (relationshipType == null) {
            return "Eligible reviewer";
        }
        return switch (relationshipType) {
            case SELF -> "Self reviewer";
            case MANAGER -> workRelationshipResolver.sharesActiveTeam(targetUser, candidateUser)
                    ? "Active team leader"
                    : "Department manager/head";
            case SUBORDINATE -> workRelationshipResolver.sharesActiveTeam(targetUser, candidateUser)
                    ? "Active team member"
                    : "Department subordinate";
            case PEER -> workRelationshipResolver.sharesActiveTeam(targetUser, candidateUser)
                    ? "Same active team peer"
                    : "Same department peer";
        };
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

        if (relationshipType == FeedbackRelationshipType.MANAGER) {
            if (!workRelationshipResolver.isWorkContextManager(target, evaluator)) {
                throw new BusinessValidationException("Manager review must use an eligible manager reviewer for the selected recipient.");
            }
            return;
        }

        if (relationshipType == FeedbackRelationshipType.SUBORDINATE) {
            if (!workRelationshipResolver.isWorkContextSubordinate(target, evaluator)) {
                throw new BusinessValidationException("Subordinate review must use an eligible subordinate reviewer for the selected recipient.");
            }
            return;
        }

        if (relationshipType == FeedbackRelationshipType.PEER
                && !workRelationshipResolver.isWorkContextPeer(target, evaluator)) {
            throw new BusinessValidationException("Peer review must use an eligible peer reviewer for the selected recipient.");
        }
    }

    private FeedbackAssignmentGenerationResponse buildAssignmentResponse(
            Long campaignId,
            List<String> extraWarnings
    ) {
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaignId);
        Map<Long, List<FeedbackEvaluatorAssignment>> assignmentsByRequestId = assignments.stream()
                .collect(Collectors.groupingBy(a -> a.getFeedbackRequest().getId()));
        Map<Integer, User> usersByEmployeeId = loadUsersByEmployeeId(requests, assignments);

        List<String> warnings = new ArrayList<>(extraWarnings == null ? List.of() : extraWarnings);
        List<FeedbackAssignmentPreviewItemResponse> previewItems = requests.stream()
                .map(request -> buildPreviewItem(request, assignmentsByRequestId.getOrDefault(request.getId(), List.of()), warnings, usersByEmployeeId))
                .toList();

        return FeedbackAssignmentGenerationResponse.builder()
                .campaignId(campaignId)
                .totalTargets(requests.size())
                .totalEvaluatorsGenerated(assignments.size())
                .evaluatorConfig(null)
                .requests(previewItems)
                .assignmentDetails(buildAssignmentDetails(assignments))
                .warnings(warnings.stream().distinct().toList())
                .build();
    }

    private FeedbackAssignmentPreviewItemResponse buildPreviewItem(
            FeedbackRequest request,
            List<FeedbackEvaluatorAssignment> assignments,
            List<String> campaignWarnings,
            Map<Integer, User> usersByEmployeeId
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
                .targetEmployeeName(resolveEmployeeName(usersByEmployeeId, request.getTargetEmployeeId()))
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
                .flatMap(assignment -> java.util.stream.Stream.of(
                        assignment.getFeedbackRequest().getTargetEmployeeId(),
                        assignment.getEvaluatorEmployeeId()
                ))
                .filter(Objects::nonNull)
                .map(Long::intValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        Map<Integer, User> usersByEmployeeId = employeeIds.isEmpty()
                ? Map.of()
                : userRepository.findByEmployeeIdIn(employeeIds).stream()
                  .filter(user -> user.getEmployeeId() != null)
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
                            .selectionReason(resolveSelectionReason(assignment, usersByEmployeeId))
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

    private String resolveSelectionReason(
            FeedbackEvaluatorAssignment assignment,
            Map<Integer, User> usersByEmployeeId
    ) {
        if (assignment == null || assignment.getSelectionMethod() == null) {
            return null;
        }
        if (assignment.getSelectionMethod() == EvaluatorSelectionMethod.MANUAL) {
            return assignment.getManualReason() == null || assignment.getManualReason().isBlank()
                    ? "HR manually added this evaluator."
                    : "HR manual override: " + assignment.getManualReason();
        }
        if (assignment.getRelationshipType() == FeedbackRelationshipType.PEER) {
            User target = usersByEmployeeId.get(assignment.getFeedbackRequest().getTargetEmployeeId().intValue());
            User evaluator = usersByEmployeeId.get(assignment.getEvaluatorEmployeeId().intValue());
            return buildPeerSelectionReason(target, evaluator);
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
            return assignment.getSelectionMethod() == EvaluatorSelectionMethod.AUTO_RANKED ? "HIGH" : "MEDIUM";
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
                && assignment.getSelectionMethod() == EvaluatorSelectionMethod.AUTO_RANKED) {
            detailWarnings.add("Suggested peer selected by reviewer eligibility ranking.");
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


    private boolean isPeerSelectionEnabled(EvaluatorConfigDTO config) {
        if (config == null) {
            return false;
        }
        if (config.getIncludePeers() != null) {
            return config.getIncludePeers()
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

    private boolean addAssignment(
            List<FeedbackEvaluatorAssignment> assignmentsToSave,
            Set<Long> assignedEvaluatorEmployeeIds,
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod
    ) {
        return addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, evaluatorEmployeeId, relationshipType, selectionMethod, null);
    }

    private boolean addAssignment(
            List<FeedbackEvaluatorAssignment> assignmentsToSave,
            Set<Long> assignedEvaluatorEmployeeIds,
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod,
            Map<Integer, User> usersByEmployeeId
    ) {
        if (evaluatorEmployeeId == null || !assignedEvaluatorEmployeeIds.add(evaluatorEmployeeId)) {
            return false;
        }
        assignmentsToSave.add(createAssignment(request, evaluatorEmployeeId, relationshipType, selectionMethod, usersByEmployeeId));
        return true;
    }

    private FeedbackEvaluatorAssignment createAssignment(
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod
    ) {
        return createAssignment(request, evaluatorEmployeeId, relationshipType, selectionMethod, null);
    }

    private FeedbackEvaluatorAssignment createAssignment(
            FeedbackRequest request,
            Long evaluatorEmployeeId,
            FeedbackRelationshipType relationshipType,
            EvaluatorSelectionMethod selectionMethod,
            Map<Integer, User> usersByEmployeeId
    ) {
        FeedbackEvaluatorAssignment assignment = new FeedbackEvaluatorAssignment();
        assignment.setFeedbackRequest(request);
        assignment.setEvaluatorEmployeeId(evaluatorEmployeeId);
        assignment.setRelationshipType(relationshipType);
        assignment.setSelectionMethod(selectionMethod);
        assignment.setIsAnonymous(isAnonymous(request == null ? null : request.getCampaign(), relationshipType));
        assignment.setStatus(AssignmentStatus.PENDING);
        snapshotEvaluator(assignment, evaluatorEmployeeId, usersByEmployeeId);
        return assignment;
    }

    private void snapshotEvaluator(FeedbackEvaluatorAssignment assignment, Long evaluatorEmployeeId) {
        snapshotEvaluator(assignment, evaluatorEmployeeId, null);
    }

    private void snapshotEvaluator(FeedbackEvaluatorAssignment assignment, Long evaluatorEmployeeId, Map<Integer, User> usersByEmployeeId) {
        if (assignment == null || evaluatorEmployeeId == null) {
            return;
        }
        User user = usersByEmployeeId == null ? null : usersByEmployeeId.get(evaluatorEmployeeId.intValue());
        if (user == null) {
            user = userRepository.findByEmployeeId(evaluatorEmployeeId.intValue()).orElse(null);
        }
        if (user == null) {
            return;
        }
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

    private boolean hasActiveUserForEmployeeId(Long employeeId) {
        return findActiveUserForEmployeeId(employeeId) != null;
    }

    private boolean hasActiveUserForEmployeeId(Long employeeId, Map<Integer, User> usersByEmployeeId) {
        return findActiveUserForEmployeeId(employeeId, usersByEmployeeId) != null;
    }

    private User findActiveUserForEmployeeId(Long employeeId) {
        return findActiveUserForEmployeeId(employeeId, null);
    }

    private User findActiveUserForEmployeeId(Long employeeId, Map<Integer, User> usersByEmployeeId) {
        if (employeeId == null) {
            return null;
        }
        User cached = usersByEmployeeId == null ? null : usersByEmployeeId.get(employeeId.intValue());
        if (cached != null) {
            return Boolean.FALSE.equals(cached.getActive()) ? null : cached;
        }
        return userRepository.findByEmployeeId(employeeId.intValue())
                .filter(user -> !Boolean.FALSE.equals(user.getActive()))
                .orElse(null);
    }

    private Map<Integer, User> loadUsersByEmployeeId() {
        return userRepository.findAll().stream()
                .filter(user -> user.getEmployeeId() != null)
                .collect(Collectors.toMap(User::getEmployeeId, Function.identity(), (left, right) -> left));
    }

    private Map<Integer, User> loadUsersByEmployeeId(
            List<FeedbackRequest> requests,
            List<FeedbackEvaluatorAssignment> assignments
    ) {
        Set<Integer> employeeIds = new LinkedHashSet<>();
        (requests == null ? List.<FeedbackRequest>of() : requests).stream()
                .map(FeedbackRequest::getTargetEmployeeId)
                .filter(Objects::nonNull)
                .map(Long::intValue)
                .forEach(employeeIds::add);
        (assignments == null ? List.<FeedbackEvaluatorAssignment>of() : assignments).forEach(assignment -> {
            if (assignment.getFeedbackRequest() != null && assignment.getFeedbackRequest().getTargetEmployeeId() != null) {
                employeeIds.add(assignment.getFeedbackRequest().getTargetEmployeeId().intValue());
            }
            if (assignment.getEvaluatorEmployeeId() != null) {
                employeeIds.add(assignment.getEvaluatorEmployeeId().intValue());
            }
        });
        return employeeIds.isEmpty()
                ? Map.of()
                : userRepository.findByEmployeeIdIn(employeeIds).stream()
                  .filter(user -> user.getEmployeeId() != null)
                  .collect(Collectors.toMap(User::getEmployeeId, Function.identity(), (left, right) -> left));
    }

    private Map<Integer, Set<Integer>> buildActiveTeamIdsByEmployeeId(Map<Integer, User> usersByEmployeeId) {
        if (usersByEmployeeId == null || usersByEmployeeId.isEmpty()) {
            return Map.of();
        }
        return usersByEmployeeId.values().stream()
                .filter(user -> user.getEmployeeId() != null)
                .collect(Collectors.toMap(
                        User::getEmployeeId,
                        workRelationshipResolver::resolveActiveTeamIds,
                        (left, right) -> left
                ));
    }

    private enum PeerLayer {
        INDIVIDUAL_CONTRIBUTOR,
        LEAD_OR_SUPERVISOR,
        MANAGER,
        DEPARTMENT_HEAD,
        EXECUTIVE
    }

    private PeerLayer resolvePeerLayer(User user) {
        if (user == null) {
            return PeerLayer.INDIVIDUAL_CONTRIBUTOR;
        }
        Set<String> roles = normalizedRoleNames(user);
        String title = user.getPosition() == null ? "" : normalizeLabel(user.getPosition().getPositionTitle());
        if (!Collections.disjoint(roles, EXECUTIVE_ROLE_NAMES) || containsAny(title, "CEO", "CHIEF", "EXECUTIVE", "DIRECTOR")) {
            return PeerLayer.EXECUTIVE;
        }
        if (roles.stream().anyMatch(role -> role.contains("DEPARTMENT_HEAD") || role.contains("DEPT_HEAD") || role.contains("HEAD_OF_DEPARTMENT"))
                || containsAny(title, "DEPARTMENT_HEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT", "HEAD")) {
            return PeerLayer.DEPARTMENT_HEAD;
        }
        if (roles.stream().anyMatch(role -> role.contains("MANAGER")) || containsAny(title, "MANAGER")) {
            return PeerLayer.MANAGER;
        }
        if (containsAny(title, "LEAD", "SUPERVISOR")) {
            return PeerLayer.LEAD_OR_SUPERVISOR;
        }
        return PeerLayer.INDIVIDUAL_CONTRIBUTOR;
    }

    private Set<String> normalizedRoleNames(User user) {
        if (user == null || user.getId() == null) {
            return Set.of();
        }
        return userRepository.findNormalizedRoleNamesByUserId(user.getId()).stream()
                .map(this::normalizeLabel)
                .collect(Collectors.toSet());
    }

    private boolean hasManagerLikePositionTitle(User user) {
        if (user == null || user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
            return false;
        }
        PeerLayer layer = resolvePeerLayer(user);
        return layer == PeerLayer.LEAD_OR_SUPERVISOR
                || layer == PeerLayer.MANAGER
                || layer == PeerLayer.DEPARTMENT_HEAD
                || layer == PeerLayer.EXECUTIVE;
    }

    private int levelRank(User user) {
        if (user == null || user.getPosition() == null || user.getPosition().getLevel() == null) {
            return 0;
        }
        String code = normalizeLabel(user.getPosition().getLevel().getLevelCode());
        String digits = code.replaceAll("\\D+", "");
        if (digits.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private int levelDistance(User target, User candidate) {
        int targetRank = levelRank(target);
        int candidateRank = levelRank(candidate);
        if (targetRank == 0 || candidateRank == 0) {
            return 99;
        }
        return Math.abs(targetRank - candidateRank);
    }

    private boolean sharesActiveTeam(User target, User candidate, Set<Integer> targetTeamIds) {
        return sharesActiveTeam(target, candidate, targetTeamIds, null);
    }

    private boolean sharesActiveTeam(
            User target,
            User candidate,
            Set<Integer> targetTeamIds,
            Map<Integer, Set<Integer>> activeTeamIdsByEmployeeId
    ) {
        if (target == null || candidate == null || targetTeamIds == null || targetTeamIds.isEmpty()) {
            return false;
        }
        Set<Integer> candidateTeamIds = activeTeamIdsByEmployeeId == null || candidate.getEmployeeId() == null
                ? workRelationshipResolver.resolveActiveTeamIds(candidate)
                : activeTeamIdsByEmployeeId.getOrDefault(candidate.getEmployeeId(), Set.of());
        return !Collections.disjoint(targetTeamIds, candidateTeamIds);
    }

    private int peerScore(User target, User candidate, Set<Integer> targetTeamIds, Map<Long, Integer> evaluatorLoadByEmployeeId, Map<Integer, Set<Integer>> activeTeamIdsByEmployeeId) {
        int score = 0;
        if (sharesActiveTeam(target, candidate, targetTeamIds, activeTeamIdsByEmployeeId)) score += 45;
        if (target.getDepartmentId() != null && Objects.equals(target.getDepartmentId(), candidate.getDepartmentId())) score += 35;
        int distance = levelDistance(target, candidate);
        if (distance == 0) score += 20;
        else if (distance == 1) score += 12;
        else if (distance == 2) score += 5;
        if (resolvePeerLayer(target) == resolvePeerLayer(candidate)) score += 15;
        if (samePositionFamily(target, candidate)) score += 8;
        Long candidateEmployeeId = candidate.getEmployeeId() == null ? null : candidate.getEmployeeId().longValue();
        score -= Math.min(24, (evaluatorLoadByEmployeeId == null ? 0 : evaluatorLoadByEmployeeId.getOrDefault(candidateEmployeeId, 0)) * 6);
        return score;
    }

    private boolean samePositionFamily(User target, User candidate) {
        String targetFamily = positionFamily(target);
        String candidateFamily = positionFamily(candidate);
        return !targetFamily.isBlank() && targetFamily.equals(candidateFamily);
    }

    private String positionFamily(User user) {
        if (user == null || user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
            return "";
        }
        String normalized = normalizeLabel(user.getPosition().getPositionTitle());
        return normalized
                .replace("SENIOR_", "")
                .replace("JUNIOR_", "")
                .replace("ASSOCIATE_", "")
                .replace("_MANAGER", "")
                .replace("MANAGER", "")
                .replace("_LEAD", "")
                .replace("LEAD", "")
                .replace("_SUPERVISOR", "")
                .replace("SUPERVISOR", "");
    }

    private List<Long> selectPeers(
            Set<Long> peerPool,
            int peerCount,
            User targetUser,
            Set<Integer> targetTeamIds,
            Map<Long, Integer> evaluatorLoadByEmployeeId,
            Map<Integer, User> usersByEmployeeId,
            Map<Integer, Set<Integer>> activeTeamIdsByEmployeeId
    ) {
        if (peerPool.isEmpty() || peerCount <= 0) {
            return List.of();
        }
        return peerPool.stream()
                .map(employeeId -> findActiveUserForEmployeeId(employeeId, usersByEmployeeId))
                .filter(Objects::nonNull)
                .sorted(Comparator
                        .comparingInt((User candidate) -> peerScore(targetUser, candidate, targetTeamIds, evaluatorLoadByEmployeeId, activeTeamIdsByEmployeeId)).reversed()
                        .thenComparingInt(candidate -> evaluatorLoadByEmployeeId.getOrDefault(candidate.getEmployeeId() == null ? null : candidate.getEmployeeId().longValue(), 0))
                        .thenComparing(candidate -> candidate.getFullName() == null ? "" : candidate.getFullName(), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(User::getId))
                .limit(peerCount)
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .toList();
    }

    private void incrementEvaluatorLoad(Map<Long, Integer> evaluatorLoadByEmployeeId, Long evaluatorEmployeeId) {
        if (evaluatorLoadByEmployeeId != null && evaluatorEmployeeId != null) {
            evaluatorLoadByEmployeeId.merge(evaluatorEmployeeId, 1, Integer::sum);
        }
    }

    private String buildPeerSelectionReason(User target, User evaluator) {
        if (target == null || evaluator == null) {
            return "Suggested peer based on the best available eligible reviewer match.";
        }
        List<String> reasons = new ArrayList<>();
        if (target.getDepartmentId() != null && Objects.equals(target.getDepartmentId(), evaluator.getDepartmentId())) {
            reasons.add("same department");
        }
        Set<Integer> targetTeamIds = workRelationshipResolver.resolveActiveTeamIds(target);
        if (sharesActiveTeam(target, evaluator, targetTeamIds)) {
            reasons.add("same active team");
        }
        int distance = levelDistance(target, evaluator);
        if (distance == 0) {
            reasons.add("same level");
        } else if (distance == 1) {
            reasons.add("nearby level");
        }
        if (resolvePeerLayer(target) == resolvePeerLayer(evaluator)) {
            reasons.add("similar organization layer");
        }
        if (samePositionFamily(target, evaluator)) {
            reasons.add("similar position family");
        }
        if (reasons.isEmpty()) {
            return "Suggested peer based on the closest available eligible reviewer match.";
        }
        return "Suggested peer based on " + String.join(", ", reasons) + ".";
    }

    private boolean containsAny(String value, String... tokens) {
        if (value == null || value.isBlank()) {
            return false;
        }
        for (String token : tokens) {
            if (value.contains(token)) {
                return true;
            }
        }
        return false;
    }

    private String normalizeLabel(String value) {
        return value == null ? "" : value.trim().toUpperCase(Locale.ROOT).replaceAll("[^A-Z0-9]+", "_");
    }

    private String safeLower(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }


}
