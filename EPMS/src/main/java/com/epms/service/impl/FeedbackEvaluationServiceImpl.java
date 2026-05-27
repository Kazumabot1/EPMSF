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
import com.epms.service.FeedbackAssignmentManagementService;
import com.epms.service.ProjectPeerDirectory;
import com.epms.util.FeedbackEvaluatorConfigNormalizer;
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
    private final FeedbackAssignmentManagementService assignmentManagementService;

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
        config = FeedbackEvaluatorConfigNormalizer.normalize(config);
        FeedbackEvaluatorConfigNormalizer.validate(config);

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
                            FeedbackRelationshipType.MANAGER, EvaluatorSelectionMethod.AUTO_RELATIONSHIP)) {
                        managerAssignments++;
                        autoAssignmentsForTarget++;
                    }
                } else {
                    targetWarnings.add("No active manager or department head evaluator found. Manager feedback will be skipped for this target.");
                }
            }

            if (Boolean.TRUE.equals(config.getIncludeSelf())) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, request.getTargetEmployeeId(),
                        FeedbackRelationshipType.SELF, EvaluatorSelectionMethod.AUTO_RELATIONSHIP)) {
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
                        .sorted()
                        .limit(FeedbackEvaluatorConfigNormalizer.requestedSubordinateMaxCount(config))
                        .toList();

                if (subordinateEmployeeIds.isEmpty()) {
                    targetWarnings.add("No direct reports found. Subordinate feedback will be skipped for this target.");
                }
                if (selectedSubordinates.size() < FeedbackEvaluatorConfigNormalizer.requestedSubordinateMinCount(config)) {
                    targetWarnings.add("Only " + selectedSubordinates.size()
                            + " eligible subordinate evaluator(s) found; minimum rule is "
                            + FeedbackEvaluatorConfigNormalizer.requestedSubordinateMinCount(config) + ".");
                }

                for (Long subordinateEmployeeId : selectedSubordinates) {
                    if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, subordinateEmployeeId,
                            FeedbackRelationshipType.SUBORDINATE, EvaluatorSelectionMethod.AUTO_RELATIONSHIP)) {
                        subordinateAssignments++;
                        autoAssignmentsForTarget++;
                    }
                }
            }

            LinkedHashSet<Long> peerPool = new LinkedHashSet<>();
            if (FeedbackEvaluatorConfigNormalizer.isPeerSelectionEnabled(config)) {
                if (FeedbackEvaluatorConfigNormalizer.isTeamPeerSelectionEnabled(config)) {
                    if (targetTeamIds.isEmpty()) {
                        targetWarnings.add("No active team found. Team peer selection cannot be applied for this target.");
                    }
                    peerPool.addAll(findTeamPeerEmployeeIds(targetUser));
                }
                if (FeedbackEvaluatorConfigNormalizer.isDepartmentPeerSelectionEnabled(config)) {
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

            int requestedPeerMinCount = FeedbackEvaluatorConfigNormalizer.requestedPeerMinCount(config);
            int requestedPeerMaxCount = FeedbackEvaluatorConfigNormalizer.requestedPeerMaxCount(config);
            List<Long> selectedPeers = FeedbackEvaluatorConfigNormalizer.isPeerSelectionEnabled(config)
                    ? selectPeers(peerPool, requestedPeerMaxCount, campaignId, request.getTargetEmployeeId())
                    : List.of();
            if (FeedbackEvaluatorConfigNormalizer.isPeerSelectionEnabled(config) && selectedPeers.size() < requestedPeerMinCount) {
                targetWarnings.add("Only " + selectedPeers.size()
                        + " eligible peer evaluator(s) found; minimum rule is "
                        + requestedPeerMinCount + ".");
            }
            for (Long peerEmployeeId : selectedPeers) {
                if (addAssignment(assignmentsToSave, assignedEvaluatorEmployeeIds, request, peerEmployeeId,
                        FeedbackRelationshipType.PEER, EvaluatorSelectionMethod.AUTO_RANDOM)) {
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
            details = assignmentManagementService.buildAssignmentDetails(campaignId);
        } else {
            List<FeedbackEvaluatorAssignment> plannedDetails = new ArrayList<>(existingManualAssignments);
            plannedDetails.addAll(assignmentsToSave);
            details = assignmentManagementService.buildAssignmentDetails(plannedDetails);
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
        return assignmentManagementService.getAssignmentPreview(campaignId);
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse addManualAssignment(Long campaignId, FeedbackManualAssignmentRequest request, Long actorUserId) {
        return assignmentManagementService.addManualAssignment(campaignId, request, actorUserId);
    }

    @Override
    @Transactional
    public FeedbackAssignmentGenerationResponse removeAssignment(Long campaignId, Long assignmentId, Long actorUserId) {
        return assignmentManagementService.removeAssignment(campaignId, assignmentId, actorUserId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId) {
        return assignmentRepository.findPendingEvaluatorsByRequestId(requestId);
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
            EvaluatorSelectionMethod selectionMethod
    ) {
        if (evaluatorEmployeeId == null || !assignedEvaluatorEmployeeIds.add(evaluatorEmployeeId)) {
            return false;
        }
        assignmentsToSave.add(createAssignment(request, evaluatorEmployeeId, relationshipType, selectionMethod));
        return true;
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
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .filter(employeeId -> !Objects.equals(employeeId, targetUser.getEmployeeId()))
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
                    return hasAutoPeerLevel(candidate) && !hasManagerLikePositionTitle(candidate);
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
                        "CEO", "EXECUTIVE", "DEPARTMENT_HEAD", "DEPT_HEAD",
                        "HEAD_OF_DEPARTMENT", "MANAGER", "PROJECT_MANAGER", "TEAM_MANAGER"
                )).stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add);
        return employeeIds;
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
                .filter(candidate -> !Objects.equals(candidate.getId(), targetUser.getId()))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
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
