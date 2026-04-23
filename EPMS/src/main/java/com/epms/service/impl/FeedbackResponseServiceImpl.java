package com.epms.service.impl;

import com.epms.dto.FeedbackSubmissionStatusResponse;
import com.epms.dto.FeedbackReceivedItemResponse;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackQuestionRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.service.FeedbackResponseService;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackResponseServiceImpl implements FeedbackResponseService {

    private final FeedbackResponseRepository responseRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackQuestionRepository questionRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public FeedbackResponse saveDraft(Long evaluatorAssignmentId, Long submittingEmployeeId, String comments, List<FeedbackResponseItem> items) {
        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(evaluatorAssignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator Assignment not found."));

        if (!assignment.getEvaluatorEmployeeId().equals(submittingEmployeeId)) {
            throw new UnauthorizedActionException("You are not authorized to edit this feedback.");
        }

        LocalDateTime dueAt = assignment.getFeedbackRequest().getDueAt();
        if (dueAt != null && LocalDateTime.now().isAfter(dueAt)) {
            throw new BusinessValidationException("Feedback editing deadline has passed.");
        }

        if (items == null || items.isEmpty()) {
            throw new BusinessValidationException("At least one response item is required.");
        }

        Optional<FeedbackResponse> existing = responseRepository.findByEvaluatorAssignmentId(evaluatorAssignmentId);
        FeedbackResponse response = existing.orElseGet(FeedbackResponse::new);
        if (existing.isPresent() && ResponseStatus.SUBMITTED.equals(response.getFinalStatus())) {
            throw new BusinessValidationException("Submitted feedback cannot be edited.");
        }

        Double overallScore = calculateOverallScore(items);
        response.setEvaluatorAssignment(assignment);
        response.setOverallScore(overallScore);
        response.setComments(comments);
        response.setFinalStatus(ResponseStatus.DRAFT);
        response.setSubmittedAt(null);

        response.getItems().clear();
        items.forEach(item -> item.setResponse(response));
        response.getItems().addAll(items);

        FeedbackResponse saved = responseRepository.save(response);
        if (AssignmentStatus.PENDING.equals(assignment.getStatus())) {
            assignment.setStatus(AssignmentStatus.IN_PROGRESS);
            assignmentRepository.save(assignment);
        }
        auditLogService.log(
                submittingEmployeeId.intValue(),
                "SAVE_DRAFT",
                "FEEDBACK_RESPONSE",
                saved.getId().intValue(),
                null,
                "assignmentId=" + evaluatorAssignmentId + ",score=" + overallScore,
                "Feedback draft saved"
        );
        return saved;
    }

    @Override
    @Transactional
    public FeedbackResponse submitResponse(Long evaluatorAssignmentId, Long submittingEmployeeId, String comments, List<FeedbackResponseItem> items) {
        log.info("Submitting Feedback Response for Assignment ID: {}", evaluatorAssignmentId);

        FeedbackEvaluatorAssignment assignment = assignmentRepository.findById(evaluatorAssignmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Evaluator Assignment not found."));

        // Validate: Only assigned evaluator can submit
        if (!assignment.getEvaluatorEmployeeId().equals(submittingEmployeeId)) {
            log.error("Unauthorized submission attempt by Employee ID: {}", submittingEmployeeId);
            throw new UnauthorizedActionException("You are not authorized to submit this feedback.");
        }

        // Validate: Cannot submit after deadline
        LocalDateTime dueAt = assignment.getFeedbackRequest().getDueAt();
        if (dueAt != null && LocalDateTime.now().isAfter(dueAt)) {
            throw new BusinessValidationException("Feedback submission deadline has passed.");
        }

        // Validate: Submission payload must include rating items
        if (items == null || items.isEmpty()) {
            throw new BusinessValidationException("At least one response item is required.");
        }

        // Validate: One submission per evaluator/target/cycle
        if (responseRepository.existsSubmittedByEvaluatorAndTargetAndCycle(
                submittingEmployeeId,
                assignment.getFeedbackRequest().getTargetEmployeeId(),
                assignment.getFeedbackRequest().getCycleId())) {
            throw new BusinessValidationException("You have already submitted feedback for this employee in this cycle.");
        }

        Double overallScore = calculateOverallScore(items);
        Optional<FeedbackResponse> existing = responseRepository.findByEvaluatorAssignmentId(evaluatorAssignmentId);
        if (existing.isPresent() && ResponseStatus.SUBMITTED.equals(existing.get().getFinalStatus())) {
            throw new BusinessValidationException("A response has already been submitted for this assignment.");
        }

        FeedbackResponse response = existing.orElseGet(FeedbackResponse::new);
        response.setEvaluatorAssignment(assignment);
        response.setSubmittedAt(LocalDateTime.now());
        response.setOverallScore(overallScore);
        response.setComments(comments);
        response.setFinalStatus(ResponseStatus.SUBMITTED);

        response.getItems().clear();
        items.forEach(item -> item.setResponse(response));
        response.getItems().addAll(items);

        FeedbackResponse savedResponse = responseRepository.save(response);

        // Update Assignment Status Atomically
        assignment.setStatus(AssignmentStatus.SUBMITTED);
        assignmentRepository.save(assignment);
        auditLogService.log(
                submittingEmployeeId.intValue(),
                "SUBMIT",
                "FEEDBACK_RESPONSE",
                savedResponse.getId().intValue(),
                "status=" + response.getFinalStatus(),
                "status=SUBMITTED,score=" + overallScore,
                "Feedback submitted"
        );

        log.info("Successfully submitted feedback response with ID: {}", savedResponse.getId());
        return savedResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackResponse getResponse(Long responseId, Long requestingEmployeeId, List<String> requesterRoles) {
        FeedbackResponse response = responseRepository.findById(responseId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback response not found."));

        FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
        boolean isPrivileged = hasPrivilegedRole(requesterRoles);
        boolean isSubmitter = assignment.getEvaluatorEmployeeId().equals(requestingEmployeeId);
        boolean isTargetEmployee = assignment.getFeedbackRequest().getTargetEmployeeId().equals(requestingEmployeeId);
        boolean visibilityReached = hasVisibilityReached(assignment.getFeedbackRequest().getId(), assignment.getFeedbackRequest().getDueAt());

        if (!isSubmitter && !isTargetEmployee && !isPrivileged) {
            throw new UnauthorizedActionException("You are not authorized to view this feedback response.");
        }

        if (isTargetEmployee && !visibilityReached) {
            throw new BusinessValidationException("Feedback is visible only after deadline or cycle completion.");
        }

        // Hide identity for non-privileged viewers when anonymity is enabled.
        if (Boolean.TRUE.equals(assignment.getIsAnonymous()) && !isPrivileged && !isSubmitter) {
            FeedbackEvaluatorAssignment maskedAssignment = new FeedbackEvaluatorAssignment();
            maskedAssignment.setId(assignment.getId());
            maskedAssignment.setFeedbackRequest(assignment.getFeedbackRequest());
            maskedAssignment.setSourceType(assignment.getSourceType());
            maskedAssignment.setIsAnonymous(true);
            maskedAssignment.setStatus(assignment.getStatus());
            maskedAssignment.setEvaluatorEmployeeId(null); // HIDDEN identity
            response.setEvaluatorAssignment(maskedAssignment);
            log.debug("Masked evaluator identity for Response ID: {}", responseId);
        }

        return response;
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackSubmissionStatusResponse> getSubmissionStatuses(Long evaluatorEmployeeId) {
        return assignmentRepository.findByEvaluatorEmployeeId(evaluatorEmployeeId).stream()
                .sorted(Comparator.comparing((FeedbackEvaluatorAssignment a) -> a.getFeedbackRequest().getDueAt(),
                        Comparator.nullsLast(Comparator.naturalOrder())))
                .map(assignment -> FeedbackSubmissionStatusResponse.builder()
                        .evaluatorAssignmentId(assignment.getId())
                        .requestId(assignment.getFeedbackRequest().getId())
                        .cycleId(assignment.getFeedbackRequest().getCycleId())
                        .targetEmployeeId(assignment.getFeedbackRequest().getTargetEmployeeId())
                        .status(assignment.getStatus().name())
                        .dueAt(assignment.getFeedbackRequest().getDueAt())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackReceivedItemResponse> getReceivedFeedback(Long targetEmployeeId, Long requestingEmployeeId, List<String> requesterRoles) {
        boolean privileged = hasPrivilegedRole(requesterRoles);
        boolean isTargetEmployee = targetEmployeeId.equals(requestingEmployeeId);

        if (!privileged && !isTargetEmployee) {
            throw new UnauthorizedActionException("You are not authorized to view feedback for this employee.");
        }

        List<FeedbackResponse> submittedResponses = responseRepository.findByTargetEmployeeIdAndStatus(targetEmployeeId, ResponseStatus.SUBMITTED);

        return submittedResponses.stream()
                .filter(response -> privileged || hasVisibilityReached(
                        response.getEvaluatorAssignment().getFeedbackRequest().getId(),
                        response.getEvaluatorAssignment().getFeedbackRequest().getDueAt()))
                .map(response -> {
                    FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
                    boolean hideIdentity = Boolean.TRUE.equals(assignment.getIsAnonymous()) && !privileged;
                    return FeedbackReceivedItemResponse.builder()
                            .responseId(response.getId())
                            .requestId(assignment.getFeedbackRequest().getId())
                            .targetEmployeeId(assignment.getFeedbackRequest().getTargetEmployeeId())
                            .overallScore(response.getOverallScore())
                            .comments(response.getComments())
                            .submittedAt(response.getSubmittedAt())
                            .sourceType(assignment.getSourceType().name())
                            .anonymous(Boolean.TRUE.equals(assignment.getIsAnonymous()))
                            .evaluatorEmployeeId(hideIdentity ? null : assignment.getEvaluatorEmployeeId())
                            .build();
                })
                .toList();
    }

    private boolean hasVisibilityReached(Long requestId, LocalDateTime dueAt) {
        if (dueAt != null && LocalDateTime.now().isAfter(dueAt)) {
            return true;
        }
        long totalAssignments = assignmentRepository.countByFeedbackRequestId(requestId);
        long submittedAssignments = assignmentRepository.countByFeedbackRequestIdAndStatus(requestId, AssignmentStatus.SUBMITTED);
        return totalAssignments > 0 && totalAssignments == submittedAssignments;
    }

    private boolean hasPrivilegedRole(List<String> roles) {
        if (roles == null) {
            return false;
        }
        return roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("ADMIN") || role.equals("HR") || role.equals("ROLE_ADMIN") || role.equals("ROLE_HR"));
    }

    private Double calculateOverallScore(List<FeedbackResponseItem> items) {
        double weightedTotal = 0.0;
        double totalWeight = 0.0;
        for (FeedbackResponseItem item : items) {
            Long questionId = item.getQuestion() != null ? item.getQuestion().getId() : null;
            if (questionId == null) {
                throw new BusinessValidationException("Question ID is required for each response item.");
            }
            FeedbackQuestion question = questionRepository.findById(questionId)
                    .orElseThrow(() -> new ResourceNotFoundException("Feedback question not found: " + questionId));
            double weight = question.getWeight() != null && question.getWeight() > 0 ? question.getWeight() : 1.0;
            weightedTotal += item.getRatingValue() * weight;
            totalWeight += weight;
            item.setQuestion(question);
        }
        if (totalWeight == 0) {
            return 0.0;
        }
        return weightedTotal / totalWeight;
    }
}
