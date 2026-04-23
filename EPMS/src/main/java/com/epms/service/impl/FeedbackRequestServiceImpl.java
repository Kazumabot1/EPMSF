package com.epms.service.impl;

import com.epms.dto.ConsolidatedFeedbackItemResponse;
import com.epms.dto.ConsolidatedFeedbackReportResponse;
import com.epms.dto.FeedbackCompletionDashboardResponse;
import com.epms.dto.FeedbackCompletionItemResponse;
import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.Notification;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.NotificationRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.projection.FeedbackSummaryProjection;
import com.epms.service.FeedbackEvaluationService;
import com.epms.service.FeedbackFormService;
import com.epms.service.FeedbackRequestService;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackRequestServiceImpl implements FeedbackRequestService {

    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackFormService feedbackFormService;
    private final FeedbackEvaluationService feedbackEvaluationService;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackResponseRepository responseRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogService auditLogService;

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
        createRequestNotifications(savedRequest.getId(), savedRequest.getDueAt());
        auditLogService.log(
                requestedByUserId.intValue(),
                "CREATE_REQUEST",
                "FEEDBACK_REQUEST",
                savedRequest.getId().intValue(),
                null,
                "cycle=" + cycleId + ",target=" + targetEmployeeId + ",dueAt=" + dueAt,
                "Feedback request created"
        );

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

    @Override
    @Transactional
    public FeedbackRequest updateDeadline(Long requestId, LocalDateTime dueAt) {
        if (dueAt == null || dueAt.isBefore(LocalDateTime.now())) {
            throw new BusinessValidationException("Deadline due date must be in the future.");
        }

        FeedbackRequest request = feedbackRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback request not found."));
        String oldDueAt = String.valueOf(request.getDueAt());
        request.setDueAt(dueAt);
        FeedbackRequest updated = feedbackRequestRepository.save(request);
        auditLogService.log(
                null,
                "UPDATE_DEADLINE",
                "FEEDBACK_REQUEST",
                requestId.intValue(),
                oldDueAt,
                String.valueOf(dueAt),
                "Feedback deadline updated"
        );
        return updated;
    }

    @Override
    @Transactional
    public int sendReminderNotifications(Long requestId) {
        FeedbackRequest request = feedbackRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback request not found."));
        if (request.getDueAt() != null && LocalDateTime.now().isAfter(request.getDueAt())) {
            throw new BusinessValidationException("Cannot send reminders after deadline.");
        }

        List<FeedbackEvaluatorAssignment> pendingAssignments = assignmentRepository.findByFeedbackRequestIdAndStatusIn(
                requestId, List.of(AssignmentStatus.PENDING, AssignmentStatus.IN_PROGRESS)
        );
        List<Notification> reminders = new ArrayList<>();
        for (FeedbackEvaluatorAssignment assignment : pendingAssignments) {
            userRepository.findById(assignment.getEvaluatorEmployeeId().intValue()).ifPresent(user -> {
                Notification notification = new Notification();
                notification.setUser(user);
                notification.setType("FEEDBACK");
                notification.setTitle("Feedback Reminder");
                notification.setMessage("Reminder: please submit feedback for employee #" +
                        request.getTargetEmployeeId() + " before " + request.getDueAt());
                reminders.add(notification);
            });
        }

        if (!reminders.isEmpty()) {
            notificationRepository.saveAll(reminders);
        }
        auditLogService.log(
                null,
                "SEND_REMINDER",
                "FEEDBACK_REQUEST",
                requestId.intValue(),
                null,
                "count=" + reminders.size(),
                "Feedback reminders dispatched"
        );
        return reminders.size();
    }

    private void createRequestNotifications(Long requestId, LocalDateTime dueAt) {
        List<FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByFeedbackRequestId(requestId);
        List<Notification> notifications = new ArrayList<>();
        for (FeedbackEvaluatorAssignment assignment : assignments) {
            userRepository.findById(assignment.getEvaluatorEmployeeId().intValue()).ifPresent(user -> {
                Notification notification = new Notification();
                notification.setUser(user);
                notification.setType("FEEDBACK");
                notification.setTitle("Feedback Requested");
                notification.setMessage("You have been requested to submit feedback. Deadline: " + dueAt);
                notifications.add(notification);
            });
        }
        if (!notifications.isEmpty()) {
            notificationRepository.saveAll(notifications);
        }
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCompletionDashboardResponse getCompletionDashboard(Long cycleId) {
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCycleId(cycleId);

        List<FeedbackCompletionItemResponse> items = requests.stream()
                .map(request -> {
                    long total = assignmentRepository.countByFeedbackRequestId(request.getId());
                    long submitted = assignmentRepository.countByFeedbackRequestIdAndStatus(request.getId(), AssignmentStatus.SUBMITTED);
                    long pending = Math.max(0L, total - submitted);
                    double percent = total == 0 ? 0.0 : (submitted * 100.0) / total;
                    return FeedbackCompletionItemResponse.builder()
                            .requestId(request.getId())
                            .targetEmployeeId(request.getTargetEmployeeId())
                            .totalEvaluators(total)
                            .submittedEvaluators(submitted)
                            .pendingEvaluators(pending)
                            .completionPercent(percent)
                            .build();
                })
                .sorted(Comparator.comparing(FeedbackCompletionItemResponse::getRequestId))
                .toList();

        long totalAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getTotalEvaluators).sum();
        long submittedAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getSubmittedEvaluators).sum();
        long pendingUsers = Math.max(0L, totalAssignments - submittedAssignments);
        double completionPercent = totalAssignments == 0 ? 0.0 : (submittedAssignments * 100.0) / totalAssignments;

        return FeedbackCompletionDashboardResponse.builder()
                .cycleId(cycleId)
                .totalRequests((long) requests.size())
                .totalAssignments(totalAssignments)
                .submittedAssignments(submittedAssignments)
                .completionPercent(completionPercent)
                .pendingUsers(pendingUsers)
                .requests(items)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public ConsolidatedFeedbackReportResponse getConsolidatedReport(Long cycleId) {
        List<FeedbackResponse> responses = responseRepository.findByCycleIdAndStatus(cycleId, ResponseStatus.SUBMITTED);

        Map<Long, List<FeedbackResponse>> byTarget = responses.stream()
                .collect(Collectors.groupingBy(r -> r.getEvaluatorAssignment().getFeedbackRequest().getTargetEmployeeId()));

        List<ConsolidatedFeedbackItemResponse> items = byTarget.entrySet().stream()
                .map(entry -> {
                    Long targetEmployeeId = entry.getKey();
                    List<FeedbackResponse> targetResponses = entry.getValue();
                    double averageScore = targetResponses.stream()
                            .map(FeedbackResponse::getOverallScore)
                            .filter(java.util.Objects::nonNull)
                            .mapToDouble(Double::doubleValue)
                            .average()
                            .orElse(0.0);
                    long managerResponses = targetResponses.stream()
                            .filter(r -> r.getEvaluatorAssignment().getSourceType().name().equals("MANAGER"))
                            .count();
                    long peerResponses = targetResponses.stream()
                            .filter(r -> r.getEvaluatorAssignment().getSourceType().name().equals("PEER"))
                            .count();
                    long subordinateResponses = targetResponses.stream()
                            .filter(r -> r.getEvaluatorAssignment().getSourceType().name().equals("SUBORDINATE"))
                            .count();
                    return ConsolidatedFeedbackItemResponse.builder()
                            .targetEmployeeId(targetEmployeeId)
                            .averageScore(averageScore)
                            .totalResponses((long) targetResponses.size())
                            .managerResponses(managerResponses)
                            .peerResponses(peerResponses)
                            .subordinateResponses(subordinateResponses)
                            .build();
                })
                .sorted(Comparator.comparing(ConsolidatedFeedbackItemResponse::getTargetEmployeeId))
                .toList();

        double cycleAverageScore = responses.stream()
                .map(FeedbackResponse::getOverallScore)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        return ConsolidatedFeedbackReportResponse.builder()
                .cycleId(cycleId)
                .cycleAverageScore(cycleAverageScore)
                .totalResponses((long) responses.size())
                .items(items)
                .build();
    }
}
