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
        log.info("Fetching feedback summary for Request ID: {}", requestId);

        FeedbackSummaryProjection projection = feedbackRequestService.getFeedbackSummary(requestId);
        
        if (projection == null) {
            // Safe fallback if aggregation returns null
            return ResponseEntity.ok(GenericApiResponse.success("No summary data found", new FeedbackSummaryResponse(requestId, 0.0, 0L)));
        }

        FeedbackSummaryResponse response = FeedbackSummaryResponse.builder()
                .requestId(projection.getRequestId())
                .averageScore(projection.getAvgScore() != null ? projection.getAvgScore() : 0.0)
                .totalResponses(projection.getTotalResponses() != null ? projection.getTotalResponses() : 0L)
                .build();

        return ResponseEntity.ok(GenericApiResponse.success("Summary retrieved successfully", response));
    }

    @GetMapping("/{requestId}/pending")
    public ResponseEntity<GenericApiResponse<List<PendingEvaluatorResponse>>> getPendingEvaluators(@PathVariable Long requestId) {
        log.info("Fetching pending evaluators for Request ID: {}", requestId);

        List<PendingEvaluatorProjection> projections = feedbackEvaluationService.getPendingEvaluators(requestId);

        List<PendingEvaluatorResponse> responseList = projections.stream()
                .map(p -> PendingEvaluatorResponse.builder()
                        .evaluatorEmployeeId(p.getEvaluatorId())
                        .requestId(p.getRequestId())
                        .build())
                .collect(Collectors.toList());

        return ResponseEntity.ok(GenericApiResponse.success("Pending evaluators retrieved successfully", responseList));
    }
}
