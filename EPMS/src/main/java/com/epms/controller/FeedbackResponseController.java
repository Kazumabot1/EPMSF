package com.epms.controller;

import com.epms.dto.FeedbackResponseItemRequest;
import com.epms.dto.FeedbackResponseSubmitRequest;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.service.FeedbackResponseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
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

    @PostMapping
    public ResponseEntity<GenericApiResponse<Long>> submitFeedbackResponse(@Valid @RequestBody FeedbackResponseSubmitRequest request) {
        log.info("Received request to submit feedback response for assignment ID: {}", request.getEvaluatorAssignmentId());

        Long submittingEmployeeId = 1L; // Context injected via Spring Security Principal later

        List<FeedbackResponseItem> items = new ArrayList<>();
        double totalScore = 0.0;
        
        for (FeedbackResponseItemRequest itemReq : request.getResponses()) {
            FeedbackResponseItem item = new FeedbackResponseItem();
            FeedbackQuestion question = new FeedbackQuestion();
            question.setId(itemReq.getQuestionId());
            item.setQuestion(question);
            item.setRatingValue(itemReq.getRatingValue());
            item.setComment(itemReq.getComment());
            items.add(item);
            
            totalScore += itemReq.getRatingValue();
        }

        Double overallScore = items.isEmpty() ? 0.0 : totalScore / items.size();

        FeedbackResponse savedResponse = feedbackResponseService.submitResponse(
                request.getEvaluatorAssignmentId(),
                submittingEmployeeId,
                overallScore,
                request.getComments(),
                items
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Feedback submitted successfully", savedResponse.getId()));
    }
}
