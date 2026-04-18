package com.epms.controller;

import com.epms.dto.FeedbackResponseSubmitRequest;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.service.FeedbackResponseService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/feedback/responses")
@RequiredArgsConstructor
public class FeedbackResponseController {

    private final FeedbackResponseService feedbackResponseService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<Long>> submitResponse(@Valid @RequestBody FeedbackResponseSubmitRequest request) {
        log.info("Receiving response payload for Assignment ID: {}", request.getEvaluatorAssignmentId());

        Long submittingEmployeeId = 1L; // Fetched from Spring Security

        List<FeedbackResponseItem> mappedItems = request.getResponses().stream().map(itemDTO -> {
            FeedbackResponseItem item = new FeedbackResponseItem();
            com.epms.entity.FeedbackQuestion question = new com.epms.entity.FeedbackQuestion();
            question.setId(itemDTO.getQuestionId());
            item.setQuestion(question);
            item.setRatingValue(itemDTO.getRatingValue());
            item.setComment(itemDTO.getComment());
            return item;
        }).collect(Collectors.toList());

        Double avgLocal = mappedItems.stream().mapToDouble(FeedbackResponseItem::getRatingValue).average().orElse(0.0);

        FeedbackResponse response = feedbackResponseService.submitResponse(
                request.getEvaluatorAssignmentId(),
                submittingEmployeeId,
                avgLocal,
                request.getComments(),
                mappedItems
        );

        GenericApiResponse<Long> apiResponse = GenericApiResponse.<Long>builder()
                .success(true)
                .message("Feedback has been submitted successfully.")
                .data(response.getId())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(apiResponse);
    }
}
