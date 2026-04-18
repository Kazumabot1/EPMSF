package com.epms.controller;

import com.epms.dto.FeedbackSummaryResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.dto.PendingEvaluatorResponse;
import com.epms.repository.projection.FeedbackSummaryProjection;
import com.epms.repository.projection.PendingEvaluatorProjection;
import com.epms.service.FeedbackEvaluationService;
import com.epms.service.FeedbackRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDateTime;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/feedback/requests")
@RequiredArgsConstructor
public class FeedbackAnalyticsController {

    private final FeedbackRequestService feedbackRequestService;
    private final FeedbackEvaluationService feedbackEvaluationService;

    @GetMapping("/{requestId}/summary")
    public ResponseEntity<GenericApiResponse<FeedbackSummaryResponse>> getFeedbackSummary(@PathVariable Long requestId) {
        log.info("Extracting analytics summary for Request ID: {}", requestId);

        FeedbackSummaryProjection projection = feedbackRequestService.getFeedbackSummary(requestId);
        FeedbackSummaryResponse responseDto = new FeedbackSummaryResponse();
        
        if (projection != null) {
            responseDto.setRequestId(projection.getRequestId());
            responseDto.setAverageScore(projection.getAvgScore());
            responseDto.setTotalResponses(projection.getTotalResponses());
        }

        GenericApiResponse<FeedbackSummaryResponse> response = GenericApiResponse.<FeedbackSummaryResponse>builder()
                .success(true)
                .message("Feedback summary retrieved successfully")
                .data(responseDto)
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }

    @GetMapping("/{requestId}/pending")
    public ResponseEntity<GenericApiResponse<List<PendingEvaluatorResponse>>> getPendingEvaluators(@PathVariable Long requestId) {
        log.info("Extracting pending evaluators for Request ID: {}", requestId);

        List<PendingEvaluatorProjection> projections = feedbackEvaluationService.getPendingEvaluators(requestId);
        
        List<PendingEvaluatorResponse> responseDtos = projections.stream()
                .map(p -> new PendingEvaluatorResponse(p.getEvaluatorId(), p.getRequestId()))
                .collect(Collectors.toList());

        GenericApiResponse<List<PendingEvaluatorResponse>> response = GenericApiResponse.<List<PendingEvaluatorResponse>>builder()
                .success(true)
                .message("Pending evaluators retrieved successfully")
                .data(responseDtos)
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }
}
