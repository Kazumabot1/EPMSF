package com.epms.service.impl;

import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.service.FeedbackResponseService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackResponseServiceImpl implements FeedbackResponseService {

    private final FeedbackResponseRepository responseRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;

    @Override
    @Transactional
    public FeedbackResponse submitResponse(Long evaluatorAssignmentId, Long submittingEmployeeId, Double overallScore, String comments, List<FeedbackResponseItem> items) {
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

        // Validate: Only one submission per evaluator
        if (responseRepository.existsByEvaluatorAssignmentId(evaluatorAssignmentId)) {
            throw new BusinessValidationException("A response has already been submitted for this assignment.");
        }

        FeedbackResponse response = new FeedbackResponse();
        response.setEvaluatorAssignment(assignment);
        response.setSubmittedAt(LocalDateTime.now());
        response.setOverallScore(overallScore);
        response.setComments(comments);
        response.setFinalStatus(ResponseStatus.SUBMITTED);

        if (items != null && !items.isEmpty()) {
            items.forEach(item -> item.setResponse(response));
            response.setItems(items);
        }

        FeedbackResponse savedResponse = responseRepository.save(response);

        // Update Assignment Status Atomically
        assignment.setStatus(AssignmentStatus.SUBMITTED);
        assignmentRepository.save(assignment);

        log.info("Successfully submitted feedback response with ID: {}", savedResponse.getId());
        return savedResponse;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackResponse getResponse(Long responseId, Long requestingEmployeeId) {
        FeedbackResponse response = responseRepository.findById(responseId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback response not found."));

        // Ensure anonymous integrity logic on extraction
        // DO NOT expose evaluator identity if isAnonymous = true and the requester isn't the submitter.
        FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
        if (Boolean.TRUE.equals(assignment.getIsAnonymous()) && !assignment.getEvaluatorEmployeeId().equals(requestingEmployeeId)) {
            // Mask the identity
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
}
