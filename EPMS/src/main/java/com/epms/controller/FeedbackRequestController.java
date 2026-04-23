package com.epms.controller;

import com.epms.dto.FeedbackDeadlineUpdateRequest;
import com.epms.dto.FeedbackRequestCreateDTO;
import com.epms.dto.FeedbackRequestListResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackRequest;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
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

import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/feedback/requests")
@RequiredArgsConstructor
public class FeedbackRequestController {

    private final FeedbackRequestService feedbackRequestService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<Long>> createFeedbackRequest(@Valid @RequestBody FeedbackRequestCreateDTO requestDTO) {
        log.info("Received request to create feedback request for target employee ID: {}", requestDTO.getTargetEmployeeId());
        ensureHrOrAdmin();

        Long requesterUserId = SecurityUtils.currentUserId().longValue();

        FeedbackRequest createdRequest = feedbackRequestService.createFeedbackRequest(
                requestDTO.getFormId(),
                requestDTO.getTargetEmployeeId(),
                requesterUserId,
                requestDTO.getCycleId(),
                requestDTO.getDueAt(),
                true // isAnonymous defaults based on business rules or form
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Feedback request and evaluators created successfully", createdRequest.getId()));
    }

    @PatchMapping("/{requestId}/deadline")
    public ResponseEntity<GenericApiResponse<Long>> updateFeedbackDeadline(
            @PathVariable Long requestId,
            @Valid @RequestBody FeedbackDeadlineUpdateRequest request) {
        ensureHrOrAdmin();
        FeedbackRequest updated = feedbackRequestService.updateDeadline(requestId, request.getDueAt());
        return ResponseEntity.ok(GenericApiResponse.success("Feedback deadline updated successfully", updated.getId()));
    }

    @PostMapping("/{requestId}/reminders")
    public ResponseEntity<GenericApiResponse<Integer>> sendFeedbackReminders(@PathVariable Long requestId) {
        ensureHrOrAdmin();
        int sent = feedbackRequestService.sendReminderNotifications(requestId);
        return ResponseEntity.ok(GenericApiResponse.success("Feedback reminders sent successfully", sent));
    }

    @GetMapping("/{employeeId}")
    public ResponseEntity<GenericApiResponse<Page<FeedbackRequestListResponse>>> getRequestsForEmployee(
            @PathVariable Long employeeId, Pageable pageable) {
        log.info("Fetching feedback requests for employee ID: {}", employeeId);
        
        List<FeedbackRequest> requests = feedbackRequestService.getRequestsForEmployee(employeeId);
        
        List<FeedbackRequestListResponse> dtoList = requests.stream()
                .map(req -> FeedbackRequestListResponse.builder()
                        .id(req.getId())
                        .formId(req.getForm().getId())
                        .cycleId(req.getCycleId())
                        .targetEmployeeId(req.getTargetEmployeeId())
                        .dueAt(req.getDueAt())
                        .status(req.getStatus().name())
                        .build())
                .collect(java.util.stream.Collectors.toList());

        int start = (int) pageable.getOffset();
        int end = Math.min((start + pageable.getPageSize()), dtoList.size());
        Page<FeedbackRequestListResponse> page = new PageImpl<>(dtoList.subList(start, Math.max(start, end)), pageable, dtoList.size());

        return ResponseEntity.ok(GenericApiResponse.success("Feedback requests fetched successfully", page));
    }

    private void ensureHrOrAdmin() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("HR") || role.equals("ADMIN") || role.equals("ROLE_HR") || role.equals("ROLE_ADMIN"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR/Admin can perform this action.");
        }
    }
}
