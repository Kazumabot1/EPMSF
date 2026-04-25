package com.epms.service.impl;

import com.epms.dto.ConsolidatedFeedbackItemResponse;
import com.epms.dto.ConsolidatedFeedbackReportResponse;
import com.epms.dto.FeedbackCompletionDashboardResponse;
import com.epms.dto.FeedbackCompletionItemResponse;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.Notification;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSourceType;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.NotificationRepository;
import com.epms.repository.FeedbackCampaignRepository;
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
import java.time.LocalTime;
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
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackFormService feedbackFormService;
    private final FeedbackEvaluationService feedbackEvaluationService;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackResponseRepository responseRepository;
    private final UserRepository userRepository;
    private final NotificationRepository notificationRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public FeedbackRequest createFeedbackRequest(Long formId, Long campaignId, Long targetEmployeeId, Long requestedByUserId,
                                                 LocalDateTime dueAt, boolean isAnonymousEnabled,
                                                 List<EvaluatorSourceType> evaluatorTypes) {
        log.info("Creating Feedback Request for Target Employee: {}", targetEmployeeId);

        if (dueAt != null && dueAt.isBefore(LocalDateTime.now())) {
            throw new BusinessValidationException("Deadline due date must be in the future.");
        }

        if (evaluatorTypes == null || evaluatorTypes.isEmpty()) {
            throw new BusinessValidationException("At least one evaluator type is required.");
        }

        FeedbackForm form = feedbackFormService.getFormById(formId);
        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));

        if (campaign.getStatus() == FeedbackCampaignStatus.CANCELLED || campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Cannot create requests for a closed or cancelled feedback campaign.");
        }

        LocalDateTime campaignDeadline = campaign.getEndDate().atTime(LocalTime.MAX);
        if (LocalDateTime.now().isAfter(campaignDeadline)) {
            throw new BusinessValidationException("Cannot create requests after the campaign end date.");
        }
        if (dueAt != null && dueAt.isAfter(campaignDeadline)) {
            throw new BusinessValidationException("Request due date cannot be later than the campaign end date.");
        }
        if (Boolean.TRUE.equals(isAnonymousEnabled) && !Boolean.TRUE.equals(form.getAnonymousAllowed())) {
            throw new BusinessValidationException("Selected feedback form does not allow anonymous feedback.");
        }

        FeedbackRequest request = new FeedbackRequest();
        request.setForm(form);
        request.setCampaign(campaign);
        request.setTargetEmployeeId(targetEmployeeId);
        request.setRequestedByUserId(requestedByUserId);
        request.setDueAt(dueAt);
        request.setIsAnonymousEnabled(isAnonymousEnabled);
        request.setStatus(FeedbackRequestStatus.IN_PROGRESS);

        FeedbackRequest savedRequest = feedbackRequestRepository.save(request);

        log.info("Feedback Request ID {} saved. Triggering auto-selection.", savedRequest.getId());
        
        // Execute auto assignment within the same boundary for atomic integrity
        feedbackEvaluationService.autoAssignEvaluators(savedRequest.getId(), targetEmployeeId, isAnonymousEnabled, evaluatorTypes);
        createRequestNotifications(savedRequest.getId(), resolveEffectiveDeadline(savedRequest));
        auditLogService.log(
                requestedByUserId.intValue(),
                "CREATE_REQUEST",
                "FEEDBACK_REQUEST",
                savedRequest.getId().intValue(),
                null,
                "campaign=" + campaignId + ",target=" + targetEmployeeId + ",dueAt=" + dueAt + ",types=" + evaluatorTypes,
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
        LocalDateTime campaignDeadline = request.getCampaign().getEndDate().atTime(LocalTime.MAX);
        if (dueAt.isAfter(campaignDeadline)) {
            throw new BusinessValidationException("Deadline cannot be later than the campaign end date.");
        }
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
        LocalDateTime effectiveDeadline = resolveEffectiveDeadline(request);
        if (effectiveDeadline != null && LocalDateTime.now().isAfter(effectiveDeadline)) {
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
                        request.getTargetEmployeeId() + " before " + effectiveDeadline);
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
    public FeedbackCompletionDashboardResponse getCompletionDashboard(Long campaignId) {
        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignId(campaignId);

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
                .campaignId(campaignId)
                .campaignName(campaign.getName())
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
    public ConsolidatedFeedbackReportResponse getConsolidatedReport(Long campaignId) {
        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
        List<FeedbackResponse> responses = responseRepository.findByCampaignIdAndStatus(campaignId, ResponseStatus.SUBMITTED);

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

        double campaignAverageScore = responses.stream()
                .map(FeedbackResponse::getOverallScore)
                .filter(java.util.Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        return ConsolidatedFeedbackReportResponse.builder()
                .campaignId(campaignId)
                .campaignName(campaign.getName())
                .campaignAverageScore(campaignAverageScore)
                .totalResponses((long) responses.size())
                .items(items)
                .build();
    }

    private LocalDateTime resolveEffectiveDeadline(FeedbackRequest request) {
        LocalDateTime campaignDeadline = request.getCampaign().getEndDate() != null
                ? request.getCampaign().getEndDate().atTime(LocalTime.MAX)
                : null;
        if (request.getDueAt() == null) {
            return campaignDeadline;
        }
        if (campaignDeadline == null) {
            return request.getDueAt();
        }
        return request.getDueAt().isBefore(campaignDeadline) ? request.getDueAt() : campaignDeadline;
    }
}
