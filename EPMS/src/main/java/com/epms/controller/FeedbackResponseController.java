
package com.epms.controller;

import com.epms.dto.FeedbackResponseItemRequest;
import com.epms.dto.FeedbackReceivedItemResponse;
import com.epms.dto.FeedbackSubmissionStatusResponse;
import com.epms.dto.FeedbackResponseSubmitRequest;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackResponseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/feedback/responses")
@RequiredArgsConstructor
public class FeedbackResponseController {

    private final FeedbackResponseService feedbackResponseService;

    @PatchMapping("/draft")
    public ResponseEntity<GenericApiResponse<Long>> saveDraftFeedbackResponse(@Valid @RequestBody FeedbackResponseSubmitRequest request) {
        Long submittingEmployeeId = SecurityUtils.currentUserId().longValue();

        List<FeedbackResponseItem> items = new ArrayList<>();
        for (FeedbackResponseItemRequest itemReq : request.getResponses()) {
            FeedbackResponseItem item = new FeedbackResponseItem();
            FeedbackQuestion question = new FeedbackQuestion();
            question.setId(itemReq.getQuestionId());
            item.setQuestion(question);
            item.setRatingValue(itemReq.getRatingValue());
            item.setComment(itemReq.getComment());
            items.add(item);
        }

        FeedbackResponse savedDraft = feedbackResponseService.saveDraft(
                request.getEvaluatorAssignmentId(),
                submittingEmployeeId,
                request.getComments(),
                items
        );

        return ResponseEntity.ok(
                GenericApiResponse.success("Feedback draft saved successfully", savedDraft.getId())
        );
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<Long>> submitFeedbackResponse(@Valid @RequestBody FeedbackResponseSubmitRequest request) {
        log.info("Received request to submit feedback response for assignment ID: {}", request.getEvaluatorAssignmentId());

        Long submittingEmployeeId = SecurityUtils.currentUserId().longValue();

        List<FeedbackResponseItem> items = new ArrayList<>();

        for (FeedbackResponseItemRequest itemReq : request.getResponses()) {
            FeedbackResponseItem item = new FeedbackResponseItem();
            FeedbackQuestion question = new FeedbackQuestion();
            question.setId(itemReq.getQuestionId());
            item.setQuestion(question);
            item.setRatingValue(itemReq.getRatingValue());
            item.setComment(itemReq.getComment());
            items.add(item);
        }

        FeedbackResponse savedResponse = feedbackResponseService.submitResponse(
                request.getEvaluatorAssignmentId(),
                submittingEmployeeId,
                request.getComments(),
                items
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Feedback submitted successfully", savedResponse.getId()));
    }

    @GetMapping("/my-status")
    public ResponseEntity<GenericApiResponse<List<FeedbackSubmissionStatusResponse>>> getMyFeedbackSubmissionStatus() {
        Long evaluatorEmployeeId = SecurityUtils.currentUserId().longValue();
        List<FeedbackSubmissionStatusResponse> statuses = feedbackResponseService.getSubmissionStatuses(evaluatorEmployeeId);
        return ResponseEntity.ok(GenericApiResponse.success("Feedback submission status retrieved successfully", statuses));
    }

    @GetMapping("/received/{targetEmployeeId}")
    public ResponseEntity<GenericApiResponse<List<FeedbackReceivedItemResponse>>> getReceivedFeedback(
            @PathVariable Long targetEmployeeId) {
        Long requestingEmployeeId = SecurityUtils.currentUserId().longValue();
        List<String> requesterRoles = SecurityUtils.currentUser().getRoles();
        List<FeedbackReceivedItemResponse> feedback = feedbackResponseService.getReceivedFeedback(
                targetEmployeeId,
                requestingEmployeeId,
                requesterRoles
        );
        return ResponseEntity.ok(GenericApiResponse.success("Received feedback retrieved successfully", feedback));
    }
}
