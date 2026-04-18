package com.epms.controller;

import com.epms.dto.FeedbackRequestCreateDTO;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackRequest;
import com.epms.service.FeedbackRequestService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/feedback/requests")
@RequiredArgsConstructor
public class FeedbackRequestController {

    private final FeedbackRequestService feedbackRequestService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<Long>> createRequest(@Valid @RequestBody FeedbackRequestCreateDTO requestDTO) {
        log.info("Received payload to create feedback request for target employee: {}", requestDTO.getTargetEmployeeId());
        
        FeedbackRequest createdRequest = feedbackRequestService.createFeedbackRequest(
                requestDTO.getFormId(),
                requestDTO.getTargetEmployeeId(),
                1L, // Requested By User ID mock from security context
                requestDTO.getCycleId(),
                requestDTO.getDueAt(),
                true // mocked anonymous inheritance
        );

        GenericApiResponse<Long> response = GenericApiResponse.<Long>builder()
                .success(true)
                .message("Feedback Request dispatched successfully")
                .data(createdRequest.getId())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<GenericApiResponse<Page<Long>>> getRequestsForEmployee(@PathVariable Long employeeId, Pageable pageable) {
        log.info("Fetching requests for employee ID: {}", employeeId);
        
        List<FeedbackRequest> requests = feedbackRequestService.getRequestsForEmployee(employeeId);
        Page<Long> pagedIds = new PageImpl<>(requests.stream().map(FeedbackRequest::getId).toList(), pageable, requests.size());
        
        GenericApiResponse<Page<Long>> response = GenericApiResponse.<Page<Long>>builder()
                .success(true)
                .message("Fetched employee requests successfully")
                .data(pagedIds)
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.ok(response);
    }
}
