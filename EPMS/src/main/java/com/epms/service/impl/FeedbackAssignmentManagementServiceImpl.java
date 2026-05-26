package com.epms.service.impl;

import com.epms.dto.EvaluatorConfigDTO;
import com.epms.dto.FeedbackAssignmentDetailItemResponse;
import com.epms.dto.FeedbackAssignmentGenerationResponse;
import com.epms.dto.FeedbackAssignmentPreviewItemResponse;
import com.epms.dto.FeedbackManualAssignmentRequest;
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
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackAssignmentManagementService;
import com.epms.service.FeedbackCampaignQuestionReviewService;
import com.epms.service.FeedbackOperationalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.EnumMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackAssignmentManagementServiceImpl implements FeedbackAssignmentManagementService {

    private static final Set<String> AUTO_PEER_LEVEL_CODES = Set.of("L05", "L06", "L07");

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final UserRepository userRepository;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackCampaignQuestionReviewService questionReviewService;

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
    public FeedbackAssignmentGenerationResponse buildAssignmentResponse(
            Long campaignId,
            EvaluatorConfigDTO config,
            List<String> extraWarnings
    ) {
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByCampaignIdWithRequest(campaignId);
        Map<Long, List<FeedbackEvaluatorAssignment>> assignmentsByRequestId = assignments.stream()
                .filter(assignment -> assignment.getFeedbackRequest() != null)
                .collect(Collectors.groupingBy(assignment -> assignment.getFeedbackRequest().getId()));

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

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(Long campaignId) {
        return buildAssignmentDetails(assignmentRepository.findByCampaignIdWithRequest(campaignId));
    }

    @Override
    public List<FeedbackAssignmentDetailItemResponse> buildAssignmentDetails(List<FeedbackEvaluatorAssignment> assignments) {
        Set<Integer> employeeIds = assignments.stream()
                .filter(assignment -> assignment.getFeedbackRequest() != null)
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
                .filter(assignment -> assignment.getFeedbackRequest() != null)
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

    private void validateManualAssignment(FeedbackManualAssignmentRequest request, FeedbackRequest feedbackRequest) {
        if (request == null) {
            throw new BusinessValidationException("Manual evaluator request is required.");
        }
        if (request.getTargetEmployeeId() == null || request.getEvaluatorEmployeeId() == null) {
            throw new BusinessValidationException("Target employee and evaluator employee are required.");
        }

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
                throw new BusinessValidationException("This employee is not eligible as a peer for this recipient. Choose an eligible same-level individual contributor, or use Manager / Direct Report when that relationship is correct.");
            }
            if (Objects.equals(target.getManagerId(), evaluator.getId())) {
                throw new BusinessValidationException("The recipient's manager cannot be added as a peer evaluator.");
            }
            if (Objects.equals(evaluator.getManagerId(), target.getId())) {
                throw new BusinessValidationException("A direct report cannot be added as a peer evaluator.");
            }
        }
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

    private boolean hasAutoPeerLevel(User user) {
        if (user.getPosition() == null || user.getPosition().getLevel() == null) {
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
}
