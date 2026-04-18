package com.epms.service.impl;

import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.projection.FeedbackSummaryProjection;
import com.epms.service.FeedbackEvaluationService;
import com.epms.service.FeedbackFormService;
import com.epms.service.FeedbackRequestService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackRequestServiceImpl implements FeedbackRequestService {

    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackFormService feedbackFormService;
    private final FeedbackEvaluationService feedbackEvaluationService;

    @Override
    @Transactional
    public FeedbackRequest createFeedbackRequest(Long formId, Long targetEmployeeId, Long requestedByUserId, Long cycleId, LocalDateTime dueAt, boolean isAnonymousEnabled) {
        log.info("Creating Feedback Request for Target Employee: {}", targetEmployeeId);

        if (dueAt != null && dueAt.isBefore(LocalDateTime.now())) {
            throw new BusinessValidationException("Deadline due date must be in the future.");
        }

        FeedbackForm form = feedbackFormService.getFormById(formId);

        FeedbackRequest request = new FeedbackRequest();
        request.setForm(form);
        request.setTargetEmployeeId(targetEmployeeId);
        request.setRequestedByUserId(requestedByUserId);
        request.setCycleId(cycleId);
        request.setDueAt(dueAt);
        request.setIsAnonymousEnabled(isAnonymousEnabled);
        request.setStatus(FeedbackRequestStatus.IN_PROGRESS);

        FeedbackRequest savedRequest = feedbackRequestRepository.save(request);

        log.info("Feedback Request ID {} saved. Triggering auto-selection.", savedRequest.getId());
        
        // Execute auto assignment within the same boundary for atomic integrity
        feedbackEvaluationService.autoAssignEvaluators(savedRequest.getId(), targetEmployeeId, isAnonymousEnabled);

        return savedRequest;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackSummaryProjection getFeedbackSummary(Long requestId) {
        return feedbackRequestRepository.getFeedbackSummaryByRequestId(requestId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackRequest> getRequestsForEmployee(Long employeeId) {
        return feedbackRequestRepository.findByTargetEmployeeId(employeeId);
    }
}
