package com.epms.service.impl;

import com.epms.dto.FeedbackReceivedItemResponse;
import com.epms.dto.FeedbackSubmissionStatusResponse;
import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.entity.FeedbackCampaignCompetencyWeight;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.FeedbackCampaignCompetencyWeightRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.FeedbackSummaryRepository;
import com.epms.repository.RatingScaleRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackOperationalService;
import com.epms.util.FeedbackPrivacyUtil;
import com.epms.util.FeedbackScoreUtil;
import com.epms.service.FeedbackAssignmentQuestionSnapshotService;
import com.epms.service.FeedbackResponseService;
import com.epms.service.FeedbackSummaryService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackResponseServiceImpl implements FeedbackResponseService {

    private static final String RESPONSE_RATING_WITH_COMMENT = "RATING_WITH_COMMENT";
    private static final String RESPONSE_RATING = "RATING";
    private static final String SCORING_SCORED = "SCORED";
    private static final int MIN_REQUIRED_COMMENT_LENGTH = 10;
    private static final int MAX_REQUIRED_COMMENT_LENGTH = 1000;

    private final FeedbackResponseRepository responseRepository;
    private final FeedbackSummaryRepository feedbackSummaryRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final RatingScaleRepository ratingScaleRepository;
    private final UserRepository userRepository;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackSummaryService feedbackSummaryService;
    private final FeedbackAssignmentQuestionSnapshotService assignmentQuestionSnapshotService;
    private final FeedbackCampaignCompetencyWeightRepository competencyWeightRepository;

    @Override
    @Transactional
    public FeedbackResponse saveDraft(Long evaluatorAssignmentId, Long submittingUserId, String comments, String assessmentDateText, String effectiveDateText, List<FeedbackResponseItem> items) {
        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(evaluatorAssignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator Assignment not found."));

        Long submittingEmployeeId = resolveEmployeeIdForUser(submittingUserId);
        if (!assignment.getEvaluatorEmployeeId().equals(submittingEmployeeId)) {
            throw new UnauthorizedActionException("You are not authorized to edit this feedback.");
        }

        if (assignment.getStatus() == AssignmentStatus.SUBMITTED) {
            throw new BusinessValidationException("Submitted feedback cannot be edited.");
        }

        ensureCampaignAcceptsFeedback(assignment, "saved as draft");

        LocalDateTime dueAt = resolveEffectiveDeadline(assignment);
        if (dueAt != null && LocalDateTime.now().isAfter(dueAt)) {
            throw new BusinessValidationException("Feedback editing deadline has passed.");
        }

        if (items == null || items.isEmpty()) {
            throw new BusinessValidationException("At least one response item is required.");
        }
        Map<Long, FeedbackAssignmentQuestion> assignmentQuestions = loadAssignmentQuestions(assignment);
        validateDraftItems(items, assignmentQuestions);

        Optional<FeedbackResponse> existing = responseRepository.findByEvaluatorAssignmentId(evaluatorAssignmentId);
        FeedbackResponse response = existing.orElseGet(FeedbackResponse::new);
        if (existing.isPresent() && ResponseStatus.SUBMITTED.equals(response.getFinalStatus())) {
            throw new BusinessValidationException("Submitted feedback cannot be edited.");
        }

        Double overallScore = calculateOverallScore(items, assignmentQuestions);
        response.setEvaluatorAssignment(assignment);
        response.setOverallScore(overallScore);
        response.setComments(comments);
        response.setAssessmentDateText(normalizeResponseHeaderText(assessmentDateText));
        response.setEffectiveDateText(normalizeResponseHeaderText(effectiveDateText));
        response.setFinalStatus(ResponseStatus.DRAFT);
        response.setSubmittedAt(null);

        syncResponseItems(response, items, assignmentQuestions);

        FeedbackResponse saved = responseRepository.save(response);
        if (AssignmentStatus.PENDING.equals(assignment.getStatus())) {
            assignment.setStatus(AssignmentStatus.IN_PROGRESS);
            assignmentRepository.save(assignment);
        }
        markRequestInProgress(assignment);
        feedbackOperationalService.audit(
                submittingUserId,
                FeedbackOperationalService.DRAFT_SAVED,
                FeedbackOperationalService.ENTITY_RESPONSE,
                saved.getId(),
                null,
                "assignmentId=" + evaluatorAssignmentId + ",score=" + overallScore,
                "Feedback draft saved"
        );
        return saved;
    }

    @Override
    @Transactional
    public FeedbackResponse submitResponse(Long evaluatorAssignmentId, Long submittingUserId, String comments, String assessmentDateText, String effectiveDateText, List<FeedbackResponseItem> items) {
        log.info("Submitting Feedback Response for Assignment ID: {}", evaluatorAssignmentId);

        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(evaluatorAssignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator Assignment not found."));

        Long submittingEmployeeId = resolveEmployeeIdForUser(submittingUserId);
        if (!assignment.getEvaluatorEmployeeId().equals(submittingEmployeeId)) {
            log.error("Unauthorized submission attempt by User ID: {}", submittingUserId);
            throw new UnauthorizedActionException("You are not authorized to submit this feedback.");
        }

        if (assignment.getStatus() == AssignmentStatus.SUBMITTED) {
            throw new BusinessValidationException("A response has already been submitted for this assignment.");
        }

        ensureCampaignAcceptsFeedback(assignment, "submitted");

        LocalDateTime dueAt = resolveEffectiveDeadline(assignment);
        if (dueAt != null && LocalDateTime.now().isAfter(dueAt)) {
            throw new BusinessValidationException("Feedback submission deadline has passed.");
        }

        if (items == null || items.isEmpty()) {
            throw new BusinessValidationException("At least one response item is required.");
        }
        Map<Long, FeedbackAssignmentQuestion> assignmentQuestions = loadAssignmentQuestions(assignment);
        validateSubmittedItems(items, assignmentQuestions);

        Double overallScore = calculateOverallScore(items, assignmentQuestions);
        Optional<FeedbackResponse> existing = responseRepository.findByEvaluatorAssignmentId(evaluatorAssignmentId);
        if (existing.isPresent() && ResponseStatus.SUBMITTED.equals(existing.get().getFinalStatus())) {
            throw new BusinessValidationException("A response has already been submitted for this assignment.");
        }

        FeedbackResponse response = existing.orElseGet(FeedbackResponse::new);
        response.setEvaluatorAssignment(assignment);
        response.setSubmittedAt(LocalDateTime.now());
        response.setOverallScore(overallScore);
        response.setComments(comments);
        response.setAssessmentDateText(normalizeResponseHeaderText(assessmentDateText));
        response.setEffectiveDateText(normalizeResponseHeaderText(effectiveDateText));
        response.setFinalStatus(ResponseStatus.SUBMITTED);

        syncResponseItems(response, items, assignmentQuestions);

        FeedbackResponse savedResponse = responseRepository.save(response);
        assignment.setStatus(AssignmentStatus.SUBMITTED);
        assignmentRepository.save(assignment);
        refreshRequestStatus(assignment);
        feedbackSummaryService.recalculateCampaignSummary(assignment.getFeedbackRequest().getCampaign().getId());
        feedbackOperationalService.audit(
                submittingUserId,
                FeedbackOperationalService.SUBMITTED,
                FeedbackOperationalService.ENTITY_RESPONSE,
                savedResponse.getId(),
                "status=" + response.getFinalStatus(),
                "status=SUBMITTED,score=" + overallScore,
                "Feedback submitted"
        );

        log.info("Successfully submitted feedback response with ID: {}", savedResponse.getId());
        return savedResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackResponse getResponse(Long responseId, Long requestingUserId, List<String> requesterRoles) {
        FeedbackResponse response = responseRepository.findById(responseId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback response not found."));

        FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
        boolean isPrivileged = hasPrivilegedRole(requesterRoles);
        Long requestingEmployeeId = resolveEmployeeIdOrNull(requestingUserId);
        boolean isSubmitter = requestingEmployeeId != null && assignment.getEvaluatorEmployeeId().equals(requestingEmployeeId);
        boolean isTargetEmployee = requestingEmployeeId != null
                && assignment.getFeedbackRequest().getTargetEmployeeId().equals(requestingEmployeeId);
        boolean isManager = requestingEmployeeId != null
                && isManagerOfTarget(assignment.getFeedbackRequest().getTargetEmployeeId(), requestingEmployeeId);
        boolean visibilityReached = isTargetResultPublished(assignment.getFeedbackRequest());

        if (!isSubmitter && !isTargetEmployee && !isManager && !isPrivileged) {
            throw new UnauthorizedActionException("You are not authorized to view this feedback response.");
        }

        boolean privilegedInternalView = isPrivileged && !isTargetEmployee;
        if (!isSubmitter && (isTargetEmployee || isManager) && !visibilityReached && !privilegedInternalView) {
            throw new BusinessValidationException("Feedback is visible only after the campaign is CLOSED and HR publishes the summary.");
        }

        if (shouldHideEvaluatorIdentity(assignment, requestingEmployeeId)) {
            return maskedAnonymousResponse(response);
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackSubmissionStatusResponse> getSubmissionStatuses(Long evaluatorUserId) {
        Long evaluatorEmployeeId = resolveEmployeeIdForUser(evaluatorUserId);
        return assignmentRepository.findByEvaluatorEmployeeId(evaluatorEmployeeId).stream()
                .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
                .filter(assignment -> assignment.getFeedbackRequest().getCampaign().getStatus() == FeedbackCampaignStatus.ACTIVE
                        || assignment.getStatus() == AssignmentStatus.SUBMITTED)
                .sorted(Comparator.comparing(this::resolveEffectiveDeadline, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(assignment -> FeedbackSubmissionStatusResponse.builder()
                        .evaluatorAssignmentId(assignment.getId())
                        .requestId(assignment.getFeedbackRequest().getId())
                        .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                        .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                        .campaignStatus(assignment.getFeedbackRequest().getCampaign().getStatus().name())
                        .targetEmployeeId(assignment.getFeedbackRequest().getTargetEmployeeId())
                        .targetEmployeeName(resolveEmployeeName(assignment.getFeedbackRequest().getTargetEmployeeId()))
                        .relationshipType(assignment.getRelationshipType().name())
                        .status(assignment.getStatus().name())
                        .canSubmit(assignment.getFeedbackRequest().getCampaign().getStatus() == FeedbackCampaignStatus.ACTIVE
                                && assignment.getStatus() != AssignmentStatus.SUBMITTED
                                && assignment.getStatus() != AssignmentStatus.CANCELLED)
                        .lifecycleMessage(assignment.getStatus() == AssignmentStatus.SUBMITTED
                                ? "Submitted feedback is locked and can only be viewed."
                                : "Open for draft saving and final submission.")
                        .dueAt(resolveEffectiveDeadline(assignment))
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackReceivedItemResponse> getReceivedFeedback(Long targetEmployeeId, Long requestingUserId, List<String> requesterRoles) {
        boolean privileged = hasPrivilegedRole(requesterRoles);
        Long requestingEmployeeId = resolveEmployeeIdOrNull(requestingUserId);
        boolean isTargetEmployee = Objects.equals(targetEmployeeId, requestingEmployeeId);
        boolean isManager = requestingEmployeeId != null && isManagerOfTarget(targetEmployeeId, requestingEmployeeId);

        if (!privileged && !isTargetEmployee && !isManager) {
            throw new UnauthorizedActionException("You are not authorized to view feedback for this employee.");
        }

        List<FeedbackResponse> submittedResponses = responseRepository.findByTargetEmployeeIdAndStatus(targetEmployeeId, ResponseStatus.SUBMITTED);

        return submittedResponses.stream()
                .filter(response -> (privileged && !isTargetEmployee) || isTargetResultPublished(response.getEvaluatorAssignment().getFeedbackRequest()))
                .map(response -> {
                    FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
                    boolean identityVisible = FeedbackPrivacyUtil.canViewerSeeEvaluatorIdentity(assignment, requestingEmployeeId);
                    return FeedbackReceivedItemResponse.builder()
                            .responseId(response.getId())
                            .requestId(assignment.getFeedbackRequest().getId())
                            .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                            .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                            .campaignStatus(assignment.getFeedbackRequest().getCampaign().getStatus().name())
                            .targetEmployeeId(assignment.getFeedbackRequest().getTargetEmployeeId())
                            .targetEmployeeName(resolveEmployeeName(assignment.getFeedbackRequest().getTargetEmployeeId()))
                            .overallScore(response.getOverallScore())
                            .scoreCategory(FeedbackScoreUtil.category(response.getOverallScore()))
                            .comments(response.getComments())
                            .submittedAt(response.getSubmittedAt())
                            .relationshipType(assignment.getRelationshipType().name())
                            .anonymous(FeedbackPrivacyUtil.isIdentityProtected(assignment))
                            .evaluatorEmployeeId(identityVisible ? assignment.getEvaluatorEmployeeId() : null)
                            .evaluatorDisplayName(identityVisible
                                    ? resolveEmployeeName(assignment.getEvaluatorEmployeeId())
                                    : FeedbackPrivacyUtil.maskedEvaluatorLabel(assignment.getRelationshipType()))
                            .evaluatorIdentityVisible(identityVisible)
                            .evaluatorSourceLabel(FeedbackPrivacyUtil.relationshipLabel(assignment.getRelationshipType()))
                            .identityProtectionReason(FeedbackPrivacyUtil.identityProtectionReason(assignment))
                            .visibilityReason(visibilityReason(assignment.getFeedbackRequest()))
                            .build();
                })
                .toList();
    }


    private String resolveEmployeeName(Long employeeId) {
        if (employeeId == null) {
            return "Unknown employee";
        }
        return userRepository.findActiveByEmployeeId(employeeId.intValue())
                .map(this::displayUser)
                .orElse("Employee #" + employeeId);
    }

    private String displayUser(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }
        return "Employee #" + user.getEmployeeId();
    }

    private String anonymousEvaluatorLabel(String relationshipType) {
        String label = relationshipType == null ? "Evaluator" : relationshipType.replace('_', ' ').toLowerCase();
        return "Anonymous " + label.substring(0, 1).toUpperCase() + label.substring(1);
    }

    private String visibilityReason(com.epms.entity.FeedbackRequest request) {
        return isTargetResultPublished(request)
                ? "HR published the 360 feedback summary"
                : "Visible by HR/Admin role permission";
    }

    private boolean shouldHideEvaluatorIdentity(FeedbackEvaluatorAssignment assignment, Long requestingEmployeeId) {
        return !FeedbackPrivacyUtil.canViewerSeeEvaluatorIdentity(assignment, requestingEmployeeId);
    }

    private FeedbackResponse maskedAnonymousResponse(FeedbackResponse original) {
        FeedbackEvaluatorAssignment assignment = original.getEvaluatorAssignment();
        FeedbackEvaluatorAssignment maskedAssignment = new FeedbackEvaluatorAssignment();
        maskedAssignment.setId(assignment.getId());
        maskedAssignment.setFeedbackRequest(assignment.getFeedbackRequest());
        maskedAssignment.setRelationshipType(assignment.getRelationshipType());
        maskedAssignment.setSelectionMethod(assignment.getSelectionMethod());
        maskedAssignment.setIsAnonymous(true);
        maskedAssignment.setStatus(assignment.getStatus());
        maskedAssignment.setEvaluatorEmployeeId(null);

        FeedbackResponse maskedResponse = new FeedbackResponse();
        maskedResponse.setId(original.getId());
        maskedResponse.setEvaluatorAssignment(maskedAssignment);
        maskedResponse.setSubmittedAt(original.getSubmittedAt());
        maskedResponse.setOverallScore(original.getOverallScore());
        maskedResponse.setComments(original.getComments());
        maskedResponse.setFinalStatus(original.getFinalStatus());
        maskedResponse.setCreatedAt(original.getCreatedAt());
        maskedResponse.setUpdatedAt(original.getUpdatedAt());
        maskedResponse.getItems().addAll(original.getItems());
        return maskedResponse;
    }

    private void ensureCampaignAcceptsFeedback(FeedbackEvaluatorAssignment assignment, String action) {
        com.epms.entity.FeedbackRequest request = assignment.getFeedbackRequest();
        FeedbackCampaignStatus campaignStatus = request.getCampaign().getStatus();
        if (campaignStatus != FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Feedback can be " + action + " only while the campaign is ACTIVE.");
        }
        if (request.getStatus() == FeedbackRequestStatus.CANCELLED) {
            throw new BusinessValidationException("This feedback request has been cancelled.");
        }
        if (assignment.getStatus() == AssignmentStatus.CANCELLED) {
            throw new BusinessValidationException("This evaluator assignment has been cancelled.");
        }
        LocalDateTime now = LocalDateTime.now();
        if (request.getCampaign().getStartAt() != null && now.isBefore(request.getCampaign().getStartAt())) {
            throw new BusinessValidationException("Feedback campaign has not started yet.");
        }
        if (request.getCampaign().getEndAt() != null && now.isAfter(request.getCampaign().getEndAt())) {
            throw new BusinessValidationException("Feedback campaign deadline has passed.");
        }
    }

    private boolean isTargetResultPublished(com.epms.entity.FeedbackRequest request) {
        FeedbackCampaignStatus status = request.getCampaign().getStatus();
        boolean publishableStatus = status == FeedbackCampaignStatus.CLOSED || status == FeedbackCampaignStatus.PUBLISHED;
        return publishableStatus
                && feedbackSummaryRepository.existsByCampaign_IdAndTargetEmployeeIdAndVisibilityStatus(
                request.getCampaign().getId(),
                request.getTargetEmployeeId(),
                FeedbackSummaryVisibilityStatus.PUBLISHED
        );
    }

    private boolean hasPrivilegedRole(List<String> roles) {
        if (roles == null) {
            return false;
        }
        return roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("ADMIN") || role.equals("HR") || role.equals("ROLE_ADMIN") || role.equals("ROLE_HR"));
    }

    private boolean isManagerOfTarget(Long targetEmployeeId, Long requestingEmployeeId) {
        return userRepository.findByEmployeeId(targetEmployeeId.intValue())
                .map(user -> Objects.equals(user.getManagerId(), userRepository.findByEmployeeId(requestingEmployeeId.intValue()).map(User::getId).orElse(null)))
                .orElse(false);
    }

    private LocalDateTime resolveEffectiveDeadline(FeedbackEvaluatorAssignment assignment) {
        return resolveEffectiveDeadline(assignment.getFeedbackRequest());
    }

    private LocalDateTime resolveEffectiveDeadline(com.epms.entity.FeedbackRequest request) {
        return request.getCampaign().getEndAt();
    }

    private Map<Long, FeedbackAssignmentQuestion> loadAssignmentQuestions(FeedbackEvaluatorAssignment assignment) {
        return assignmentQuestionSnapshotService.findOrCreateAssignmentQuestions(assignment).stream()
                .collect(Collectors.toMap(FeedbackAssignmentQuestion::getId, Function.identity(), (first, duplicate) -> first));
    }

    private void validateDraftItems(List<FeedbackResponseItem> items, Map<Long, FeedbackAssignmentQuestion> assignmentQuestions) {
        validateQuestionMembershipAndRatings(items, assignmentQuestions, false);
    }

    private void validateSubmittedItems(List<FeedbackResponseItem> items, Map<Long, FeedbackAssignmentQuestion> assignmentQuestions) {
        validateQuestionMembershipAndRatings(items, assignmentQuestions, true);

        Set<Long> answeredAssignmentQuestionIds = items.stream()
                .filter(item -> isAnswered(item, item.getAssignmentQuestion()))
                .map(item -> item.getAssignmentQuestion() == null ? null : item.getAssignmentQuestion().getId())
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        List<FeedbackAssignmentQuestion> missingRequiredQuestions = assignmentQuestions.values().stream()
                .filter(question -> Boolean.TRUE.equals(question.getRequired()))
                .filter(question -> !answeredAssignmentQuestionIds.contains(question.getId()))
                .sorted(Comparator.comparing(FeedbackAssignmentQuestion::getSectionOrder, Comparator.nullsLast(Comparator.naturalOrder()))
                        .thenComparing(FeedbackAssignmentQuestion::getDisplayOrder, Comparator.nullsLast(Comparator.naturalOrder())))
                .toList();

        if (!missingRequiredQuestions.isEmpty()) {
            String missingLabels = missingRequiredQuestions.stream()
                    .limit(5)
                    .map(question -> question.getDisplayOrder() != null
                            ? "Q" + question.getDisplayOrder()
                            : question.getQuestionCode())
                    .collect(Collectors.joining(", "));
            throw new BusinessValidationException(
                    "Please answer all required feedback questions before final submission. Missing: " + missingLabels + "."
            );
        }
    }

    private void validateQuestionMembershipAndRatings(
            List<FeedbackResponseItem> items,
            Map<Long, FeedbackAssignmentQuestion> assignmentQuestions,
            boolean requireAnswersForRequiredQuestions
    ) {
        Set<Long> seenAssignmentQuestionIds = new HashSet<>();
        Map<Long, FeedbackAssignmentQuestion> byLegacyQuestionId = assignmentQuestions.values().stream()
                .filter(question -> question.getSourceQuestion() != null && question.getSourceQuestion().getId() != null)
                .collect(Collectors.toMap(question -> question.getSourceQuestion().getId(), Function.identity(), (first, duplicate) -> first));

        for (FeedbackResponseItem item : items) {
            FeedbackAssignmentQuestion assignmentQuestion = resolveIncomingAssignmentQuestion(item, assignmentQuestions, byLegacyQuestionId);
            Long assignmentQuestionId = assignmentQuestion.getId();

            if (!seenAssignmentQuestionIds.add(assignmentQuestionId)) {
                throw new BusinessValidationException("Duplicate responses for the same assignment question are not allowed.");
            }

            item.setAssignmentQuestion(assignmentQuestion);
            item.setQuestion(assignmentQuestion.getSourceQuestion());

            Double ratingValue = item.getRatingValue();
            String label = questionLabel(assignmentQuestion);

            if (ratingValue == null) {
                if (requireAnswersForRequiredQuestions) {
                    throw new BusinessValidationException(label + ": Rating is required.");
                }
            } else {
                double maxRating = resolveMaxRating(assignmentQuestion);
                if (ratingValue < 1.0 || ratingValue > maxRating) {
                    throw new BusinessValidationException(
                            label + ": Rating must be between 1 and " + formatScore(maxRating) + "."
                    );
                }
            }

            int commentLength = normalizedCommentLength(item.getComment());
            if (requireAnswersForRequiredQuestions && commentLength < MIN_REQUIRED_COMMENT_LENGTH) {
                throw new BusinessValidationException(
                        label + ": Comment needs at least " + MIN_REQUIRED_COMMENT_LENGTH + " characters."
                );
            }
            if (commentLength > MAX_REQUIRED_COMMENT_LENGTH) {
                throw new BusinessValidationException(
                        label + ": Comment must be " + MAX_REQUIRED_COMMENT_LENGTH + " characters or fewer."
                );
            }
        }
    }

    private boolean isAnswered(FeedbackResponseItem item, FeedbackAssignmentQuestion question) {
        if (question == null || item == null) {
            return false;
        }
        int commentLength = normalizedCommentLength(item.getComment());
        return item.getRatingValue() != null
                && commentLength >= MIN_REQUIRED_COMMENT_LENGTH
                && commentLength <= MAX_REQUIRED_COMMENT_LENGTH;
    }

    private FeedbackAssignmentQuestion resolveIncomingAssignmentQuestion(
            FeedbackResponseItem item,
            Map<Long, FeedbackAssignmentQuestion> assignmentQuestions,
            Map<Long, FeedbackAssignmentQuestion> byLegacyQuestionId
    ) {
        Long assignmentQuestionId = item.getAssignmentQuestion() != null ? item.getAssignmentQuestion().getId() : null;
        if (assignmentQuestionId != null) {
            FeedbackAssignmentQuestion assignmentQuestion = assignmentQuestions.get(assignmentQuestionId);
            if (assignmentQuestion == null) {
                throw new BusinessValidationException("Assignment question " + assignmentQuestionId + " does not belong to this evaluator assignment.");
            }
            return assignmentQuestion;
        }

        Long legacyQuestionId = item.getQuestion() != null ? item.getQuestion().getId() : null;
        if (legacyQuestionId == null) {
            throw new BusinessValidationException("Assignment Question ID is required for each response item.");
        }
        FeedbackAssignmentQuestion assignmentQuestion = byLegacyQuestionId.get(legacyQuestionId);
        if (assignmentQuestion == null) {
            throw new BusinessValidationException("Question " + legacyQuestionId + " does not belong to the assigned feedback form.");
        }
        return assignmentQuestion;
    }

    /**
     * Synchronizes response items by assignment-question snapshot ID. This preserves idempotent
     * draft -> final submission while allowing HR to reuse the same master question across many
     * campaigns and evaluator relationship contexts.
     */
    private void syncResponseItems(
            FeedbackResponse response,
            List<FeedbackResponseItem> incomingItems,
            Map<Long, FeedbackAssignmentQuestion> assignmentQuestions
    ) {
        Map<Long, FeedbackResponseItem> existingByAssignmentQuestionId = response.getItems().stream()
                .filter(item -> item.getAssignmentQuestion() != null && item.getAssignmentQuestion().getId() != null)
                .collect(Collectors.toMap(
                        item -> item.getAssignmentQuestion().getId(),
                        Function.identity(),
                        (first, duplicate) -> first
                ));

        Map<Long, FeedbackResponseItem> existingByLegacyQuestionId = response.getItems().stream()
                .filter(item -> item.getQuestion() != null && item.getQuestion().getId() != null)
                .collect(Collectors.toMap(
                        item -> item.getQuestion().getId(),
                        Function.identity(),
                        (first, duplicate) -> first
                ));

        Set<Long> incomingAssignmentQuestionIds = new HashSet<>();

        for (FeedbackResponseItem incomingItem : incomingItems) {
            FeedbackAssignmentQuestion assignmentQuestion = incomingItem.getAssignmentQuestion();
            Long assignmentQuestionId = assignmentQuestion != null ? assignmentQuestion.getId() : null;
            if (assignmentQuestionId == null && incomingItem.getQuestion() != null) {
                Long legacyQuestionId = incomingItem.getQuestion().getId();
                assignmentQuestion = assignmentQuestions.values().stream()
                        .filter(candidate -> candidate.getSourceQuestion() != null
                                && Objects.equals(candidate.getSourceQuestion().getId(), legacyQuestionId))
                        .findFirst()
                        .orElse(null);
                assignmentQuestionId = assignmentQuestion == null ? null : assignmentQuestion.getId();
            }
            if (assignmentQuestionId == null) {
                throw new BusinessValidationException("Assignment Question ID is required for each response item.");
            }

            assignmentQuestion = assignmentQuestions.get(assignmentQuestionId);
            if (assignmentQuestion == null) {
                throw new BusinessValidationException("Assignment question " + assignmentQuestionId + " does not belong to this evaluator assignment.");
            }

            incomingAssignmentQuestionIds.add(assignmentQuestionId);
            FeedbackResponseItem targetItem = existingByAssignmentQuestionId.get(assignmentQuestionId);
            if (targetItem == null && assignmentQuestion.getSourceQuestion() != null) {
                targetItem = existingByLegacyQuestionId.get(assignmentQuestion.getSourceQuestion().getId());
            }
            if (targetItem == null) {
                targetItem = new FeedbackResponseItem();
                targetItem.setResponse(response);
                response.getItems().add(targetItem);
            }

            targetItem.setAssignmentQuestion(assignmentQuestion);
            targetItem.setQuestion(assignmentQuestion.getSourceQuestion());
            targetItem.setRatingValue(incomingItem.getRatingValue());
            targetItem.setComment(incomingItem.getComment());
        }

        response.getItems().removeIf(existingItem -> {
            Long assignmentQuestionId = existingItem.getAssignmentQuestion() != null
                    ? existingItem.getAssignmentQuestion().getId()
                    : null;
            return assignmentQuestionId == null || !incomingAssignmentQuestionIds.contains(assignmentQuestionId);
        });
    }

    private Double calculateOverallScore(List<FeedbackResponseItem> items, Map<Long, FeedbackAssignmentQuestion> assignmentQuestions) {
        Map<String, List<Double>> scoresByCompetency = new java.util.LinkedHashMap<>();

        for (FeedbackResponseItem item : items) {
            if (item.getRatingValue() == null || item.getAssignmentQuestion() == null) {
                continue;
            }

            Long assignmentQuestionId = item.getAssignmentQuestion().getId();
            FeedbackAssignmentQuestion question = assignmentQuestions.get(assignmentQuestionId);
            if (question == null) {
                throw new ResourceNotFoundException("Feedback assignment question not found: " + assignmentQuestionId);
            }

            item.setAssignmentQuestion(question);
            item.setQuestion(question.getSourceQuestion());
            if (!isScoredQuestion(question)) {
                continue;
            }

            double maxRating = resolveMaxRating(question);
            double questionScore = (item.getRatingValue() / maxRating) * 100.0;
            String competencyCode = normalizeCompetencyCode(question.getCompetencyCode());
            scoresByCompetency.computeIfAbsent(competencyCode, ignored -> new ArrayList<>()).add(questionScore);
        }

        if (scoresByCompetency.isEmpty()) {
            return 0.0;
        }

        Map<String, Double> campaignWeights = loadCampaignCompetencyWeights(assignmentQuestions);
        if (!campaignWeights.isEmpty()) {
            double weightedScoreSum = 0.0;
            double availableWeightSum = 0.0;
            for (Map.Entry<String, List<Double>> entry : scoresByCompetency.entrySet()) {
                double weight = campaignWeights.getOrDefault(normalizeCompetencyCode(entry.getKey()), 0.0);
                if (weight <= 0) {
                    continue;
                }
                double competencyScore = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
                weightedScoreSum += competencyScore * weight;
                availableWeightSum += weight;
            }
            if (availableWeightSum > 0) {
                return roundToTwoDecimals(weightedScoreSum / availableWeightSum);
            }
        }

        double competencyScoreSum = 0.0;
        int applicableCompetencyCount = 0;
        for (Map.Entry<String, List<Double>> entry : scoresByCompetency.entrySet()) {
            double competencyScore = entry.getValue().stream().mapToDouble(Double::doubleValue).average().orElse(0.0);
            competencyScoreSum += competencyScore;
            applicableCompetencyCount++;
        }

        if (applicableCompetencyCount == 0) {
            return 0.0;
        }
        return roundToTwoDecimals(competencyScoreSum / applicableCompetencyCount);
    }

    private Map<String, Double> loadCampaignCompetencyWeights(Map<Long, FeedbackAssignmentQuestion> assignmentQuestions) {
        Long campaignId = assignmentQuestions.values().stream()
                .filter(Objects::nonNull)
                .map(FeedbackAssignmentQuestion::getAssignment)
                .filter(Objects::nonNull)
                .map(assignment -> assignment.getFeedbackRequest() == null ? null : assignment.getFeedbackRequest().getCampaign())
                .filter(Objects::nonNull)
                .map(campaign -> campaign.getId())
                .filter(Objects::nonNull)
                .findFirst()
                .orElse(null);
        if (campaignId == null) {
            return Map.of();
        }
        return competencyWeightRepository.findByCampaignIdOrderByCompetencyNameSnapshotAsc(campaignId).stream()
                .filter(weight -> weight.getCompetencyCodeSnapshot() != null)
                .collect(Collectors.toMap(
                        weight -> normalizeCompetencyCode(weight.getCompetencyCodeSnapshot()),
                        weight -> toDouble(weight.getWeightPercent()),
                        (first, duplicate) -> duplicate
                ));
    }

    private double toDouble(BigDecimal value) {
        return value == null ? 0.0 : value.doubleValue();
    }

    private boolean isScoredQuestion(FeedbackAssignmentQuestion question) {
        return question != null;
    }

    private boolean isRatingResponseType(String responseType) {
        String normalized = normalizeResponseType(responseType);
        return RESPONSE_RATING_WITH_COMMENT.equals(normalized) || RESPONSE_RATING.equals(normalized);
    }

    private String normalizeResponseType(String responseType) {
        if (responseType == null || responseType.isBlank()) {
            return RESPONSE_RATING_WITH_COMMENT;
        }
        String value = responseType.trim().toUpperCase().replace('-', '_').replace(' ', '_');
        if (value.equals("RATING_ONLY")) {
            value = RESPONSE_RATING;
        }
        return RESPONSE_RATING_WITH_COMMENT;
    }

    private String normalizeScoringBehavior(String scoringBehavior) {
        if (scoringBehavior == null || scoringBehavior.isBlank()) {
            return SCORING_SCORED;
        }
        return scoringBehavior.trim().toUpperCase().replace('-', '_').replace(' ', '_');
    }

    private String normalizeCompetencyCode(String competencyCode) {
        if (competencyCode == null || competencyCode.isBlank()) {
            return "UNMAPPED";
        }
        return competencyCode.trim().toUpperCase().replace('-', '_').replace(' ', '_');
    }

    private String normalizeResponseHeaderText(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > 120 ? trimmed.substring(0, 120) : trimmed;
    }

    private int normalizedCommentLength(String value) {
        return value == null ? 0 : value.trim().length();
    }

    private String questionLabel(FeedbackAssignmentQuestion question) {
        if (question == null) {
            return "Question";
        }
        if (question.getDisplayOrder() != null) {
            return "Question " + question.getDisplayOrder();
        }
        if (question.getQuestionCode() != null && !question.getQuestionCode().isBlank()) {
            return "Question " + question.getQuestionCode();
        }
        return "Question";
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private double resolveMaxRating(FeedbackAssignmentQuestion question) {
        Integer ratingScaleId = question.getRatingScaleId();
        if (ratingScaleId == null) {
            return 5.0;
        }
        return ratingScaleRepository.findById(ratingScaleId)
                .map(scale -> scale.getScales() != null && scale.getScales() > 0 ? scale.getScales().doubleValue() : 5.0)
                .orElseThrow(() -> new BusinessValidationException("Rating scale not found for question " + question.getQuestionCode() + "."));
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String formatScore(double value) {
        if (value == Math.rint(value)) {
            return String.valueOf((long) value);
        }
        return String.valueOf(value);
    }

    private void markRequestInProgress(FeedbackEvaluatorAssignment assignment) {
        if (assignment.getFeedbackRequest().getStatus() == FeedbackRequestStatus.PENDING) {
            assignment.getFeedbackRequest().setStatus(FeedbackRequestStatus.IN_PROGRESS);
            feedbackRequestRepository.save(assignment.getFeedbackRequest());
        }
    }

    private void refreshRequestStatus(FeedbackEvaluatorAssignment assignment) {
        long totalAssignments = assignmentRepository.countByFeedbackRequestId(assignment.getFeedbackRequest().getId());
        long submittedAssignments = assignmentRepository.countByFeedbackRequestIdAndStatus(
                assignment.getFeedbackRequest().getId(),
                AssignmentStatus.SUBMITTED
        );
        assignment.getFeedbackRequest().setStatus(
                totalAssignments > 0 && totalAssignments == submittedAssignments
                        ? FeedbackRequestStatus.COMPLETED
                        : FeedbackRequestStatus.IN_PROGRESS
        );
        feedbackRequestRepository.save(assignment.getFeedbackRequest());
    }

    private Long resolveEmployeeIdForUser(Long userId) {
        User user = userRepository.findById(userId.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
        if (user.getEmployeeId() == null) {
            throw new BusinessValidationException("This user is not linked to an employee record.");
        }
        return user.getEmployeeId().longValue();
    }

    private Long resolveEmployeeIdOrNull(Long userId) {
        return userRepository.findById(userId.intValue())
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .orElse(null);
    }
}
