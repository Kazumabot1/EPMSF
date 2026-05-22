package com.epms.service.impl;

import com.epms.dto.ConsolidatedFeedbackItemResponse;
import com.epms.dto.ConsolidatedFeedbackReportResponse;
import com.epms.dto.FeedbackCompletionDashboardResponse;
import com.epms.dto.FeedbackCompletionItemResponse;
import com.epms.dto.FeedbackSourceBreakdownResponse;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.projection.FeedbackSummaryProjection;
import com.epms.service.FeedbackRequestService;
import com.epms.util.FeedbackScoreUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.Objects;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import java.util.stream.Stream;

@Service
@RequiredArgsConstructor
public class FeedbackRequestServiceImpl implements FeedbackRequestService {

    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackResponseRepository responseRepository;
    private final EmployeeRepository employeeRepository;

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
    @Transactional(readOnly = true)
    public FeedbackCompletionDashboardResponse getCompletionDashboard(Long campaignId) {
        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        Map<Long, String> employeeNames = loadEmployeeNames(requests.stream()
                .map(FeedbackRequest::getTargetEmployeeId)
                .filter(Objects::nonNull)
                .distinct()
                .toList());

        List<FeedbackCompletionItemResponse> items = requests.stream()
                .map(request -> buildCompletionItem(campaign, request, employeeNames))
                .toList();

        long totalAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getTotalEvaluators).sum();
        long submittedAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getSubmittedEvaluators).sum();
        long inProgressAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getInProgressEvaluators).sum();
        long notStartedAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getNotStartedEvaluators).sum();
        long overdueAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getOverdueEvaluators).sum();
        long declinedAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getDeclinedEvaluators).sum();
        long cancelledAssignments = items.stream().mapToLong(FeedbackCompletionItemResponse::getCancelledEvaluators).sum();
        long pendingAssignments = Math.max(0L, totalAssignments - submittedAssignments - declinedAssignments - cancelledAssignments);
        double completionPercent = totalAssignments == 0 ? 0.0 : roundOneDecimal((submittedAssignments * 100.0) / totalAssignments);

        return FeedbackCompletionDashboardResponse.builder()
                .campaignId(campaignId)
                .campaignName(campaign.getName())
                .campaignStatus(campaign.getStatus().name())
                .campaignStartAt(campaign.getStartAt())
                .campaignEndAt(campaign.getEndAt())
                .totalRequests((long) requests.size())
                .totalTargets((long) requests.size())
                .totalAssignments(totalAssignments)
                .submittedAssignments(submittedAssignments)
                .pendingAssignments(pendingAssignments)
                .pendingUsers(pendingAssignments)
                .inProgressAssignments(inProgressAssignments)
                .notStartedAssignments(notStartedAssignments)
                .overdueAssignments(overdueAssignments)
                .declinedAssignments(declinedAssignments)
                .cancelledAssignments(cancelledAssignments)
                .completedTargets(items.stream().filter(item -> item.getTotalEvaluators() > 0 && item.getPendingEvaluators() == 0).count())
                .targetsWithPending(items.stream().filter(item -> item.getPendingEvaluators() > 0).count())
                .targetsWithOverdue(items.stream().filter(item -> item.getOverdueEvaluators() > 0).count())
                .managerAssignments(items.stream().mapToLong(FeedbackCompletionItemResponse::getManagerEvaluators).sum())
                .peerAssignments(items.stream().mapToLong(FeedbackCompletionItemResponse::getPeerEvaluators).sum())
                .subordinateAssignments(items.stream().mapToLong(FeedbackCompletionItemResponse::getSubordinateEvaluators).sum())
                .selfAssignments(items.stream().mapToLong(FeedbackCompletionItemResponse::getSelfEvaluators).sum())
                .completionPercent(completionPercent)
                .healthStatus(resolveCompletionHealth(campaign, totalAssignments, submittedAssignments, overdueAssignments))
                .healthMessage(resolveCompletionMessage(campaign, totalAssignments, submittedAssignments, overdueAssignments, completionPercent))
                .generatedAt(LocalDateTime.now())
                .requests(items)
                .build();
    }

    private FeedbackCompletionItemResponse buildCompletionItem(
            FeedbackCampaign campaign,
            FeedbackRequest request,
            Map<Long, String> employeeNames
    ) {
        List<com.epms.entity.FeedbackEvaluatorAssignment> assignments = assignmentRepository.findByFeedbackRequestId(request.getId());
        LocalDateTime effectiveDeadline = resolveEffectiveDeadline(campaign, request);

        long total = assignments.stream().filter(this::isCountedAssignment).count();
        long submitted = assignments.stream().filter(a -> a.getStatus() == AssignmentStatus.SUBMITTED).count();
        long inProgress = assignments.stream().filter(a -> a.getStatus() == AssignmentStatus.IN_PROGRESS).count();
        long notStarted = assignments.stream().filter(a -> a.getStatus() == AssignmentStatus.PENDING).count();
        long declined = assignments.stream().filter(a -> a.getStatus() == AssignmentStatus.DECLINED).count();
        long cancelled = assignments.stream().filter(a -> a.getStatus() == AssignmentStatus.CANCELLED).count();
        long overdue = assignments.stream().filter(a -> isOverdue(campaign, effectiveDeadline, a)).count();
        long pending = Math.max(0L, total - submitted - declined - cancelled);
        double percent = total == 0 ? 0.0 : roundOneDecimal((submitted * 100.0) / total);

        List<FeedbackResponse> submittedResponses = assignments.stream()
                .map(com.epms.entity.FeedbackEvaluatorAssignment::getResponse)
                .filter(Objects::nonNull)
                .filter(response -> response.getFinalStatus() == ResponseStatus.SUBMITTED)
                .toList();
        double average = averageScore(submittedResponses);

        String statusLabel = resolveTargetStatus(total, submitted, pending, overdue, campaign);
        String actionNeeded = resolveTargetAction(total, submitted, pending, overdue, campaign);

        return FeedbackCompletionItemResponse.builder()
                .requestId(request.getId())
                .targetEmployeeId(request.getTargetEmployeeId())
                .targetEmployeeName(employeeNames.getOrDefault(request.getTargetEmployeeId(), "Employee #" + request.getTargetEmployeeId()))
                .targetEmployeeEmail(null)
                .requestStatus(request.getStatus().name())
                .dueAt(request.getDueAt())
                .effectiveDeadline(effectiveDeadline)
                .totalEvaluators(total)
                .submittedEvaluators(submitted)
                .pendingEvaluators(pending)
                .inProgressEvaluators(inProgress)
                .notStartedEvaluators(notStarted)
                .overdueEvaluators(overdue)
                .declinedEvaluators(declined)
                .cancelledEvaluators(cancelled)
                .managerEvaluators(countAssignmentsByRelationship(assignments, FeedbackRelationshipType.MANAGER))
                .peerEvaluators(countAssignmentsByRelationship(assignments, FeedbackRelationshipType.PEER))
                .subordinateEvaluators(countAssignmentsByRelationship(assignments, FeedbackRelationshipType.SUBORDINATE))
                .selfEvaluators(countAssignmentsByRelationship(assignments, FeedbackRelationshipType.SELF))
                .completionPercent(percent)
                .averageScore(average)
                .scoreCategory(FeedbackScoreUtil.category(average))
                .statusLabel(statusLabel)
                .actionNeeded(actionNeeded)
                .build();
    }

    private boolean isCountedAssignment(com.epms.entity.FeedbackEvaluatorAssignment assignment) {
        return assignment.getStatus() != AssignmentStatus.CANCELLED;
    }

    private boolean isOverdue(
            FeedbackCampaign campaign,
            LocalDateTime effectiveDeadline,
            com.epms.entity.FeedbackEvaluatorAssignment assignment
    ) {
        return campaign.getStatus() == FeedbackCampaignStatus.ACTIVE
                && effectiveDeadline != null
                && LocalDateTime.now().isAfter(effectiveDeadline)
                && assignment.getStatus() != AssignmentStatus.SUBMITTED
                && assignment.getStatus() != AssignmentStatus.CANCELLED
                && assignment.getStatus() != AssignmentStatus.DECLINED;
    }

    private LocalDateTime resolveEffectiveDeadline(FeedbackCampaign campaign, FeedbackRequest request) {
        LocalDateTime campaignDeadline = campaign.getEndAt();
        if (request.getDueAt() == null) {
            return campaignDeadline;
        }
        if (campaignDeadline == null) {
            return request.getDueAt();
        }
        return request.getDueAt().isBefore(campaignDeadline) ? request.getDueAt() : campaignDeadline;
    }

    private long countAssignmentsByRelationship(
            List<com.epms.entity.FeedbackEvaluatorAssignment> assignments,
            FeedbackRelationshipType relationshipType
    ) {
        return assignments.stream()
                .filter(this::isCountedAssignment)
                .filter(assignment -> assignment.getRelationshipType() == relationshipType)
                .count();
    }

    private String resolveTargetStatus(long total, long submitted, long pending, long overdue, FeedbackCampaign campaign) {
        if (total == 0) {
            return "No evaluators assigned";
        }
        if (submitted >= total) {
            return "Complete";
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return "Closed with pending feedback";
        }
        if (overdue > 0) {
            return "Overdue";
        }
        if (pending > 0) {
            return "In progress";
        }
        return "Pending";
    }

    private String resolveTargetAction(long total, long submitted, long pending, long overdue, FeedbackCampaign campaign) {
        if (total == 0) {
            return "Generate evaluator assignments for this target.";
        }
        if (submitted >= total) {
            return "No action needed.";
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.DRAFT) {
            return "Activate the campaign when assignments are ready.";
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.ACTIVE && overdue > 0) {
            return "Send reminders or close the campaign when ready.";
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.ACTIVE) {
            return "Monitor pending evaluators and send reminders if needed.";
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return "Campaign is closed; pending feedback can no longer be submitted.";
        }
        return "Campaign is not active.";
    }

    private String resolveCompletionHealth(FeedbackCampaign campaign, long totalAssignments, long submittedAssignments, long overdueAssignments) {
        if (totalAssignments == 0) {
            return "SETUP_REQUIRED";
        }
        if (submittedAssignments >= totalAssignments) {
            return "COMPLETE";
        }
        if (overdueAssignments > 0) {
            return "OVERDUE";
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.DRAFT) {
            return "DRAFT";
        }
        return "IN_PROGRESS";
    }

    private String resolveCompletionMessage(
            FeedbackCampaign campaign,
            long totalAssignments,
            long submittedAssignments,
            long overdueAssignments,
            double completionPercent
    ) {
        if (totalAssignments == 0) {
            return "No evaluator assignments exist yet. Generate assignments before activating the campaign.";
        }
        if (submittedAssignments >= totalAssignments) {
            return "All assigned evaluators have submitted feedback.";
        }
        if (overdueAssignments > 0) {
            return overdueAssignments + " evaluator assignment(s) are overdue.";
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.DRAFT) {
            return "Assignments are prepared, but evaluators will not see tasks until the campaign is activated.";
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED) {
            return "Campaign is closed at " + completionPercent + "% completion.";
        }
        return "Campaign is active. Monitor pending evaluators and send reminders as needed.";
    }

    private double roundOneDecimal(double value) {
        return Math.round(value * 10.0) / 10.0;
    }

    @Override
    @Transactional(readOnly = true)
    public ConsolidatedFeedbackReportResponse getConsolidatedReport(Long campaignId) {
        FeedbackCampaign campaign = feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
        if (campaign.getStatus() != FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Consolidated feedback report is available only after the campaign is CLOSED.");
        }
        List<FeedbackResponse> responses = responseRepository.findByCampaignIdAndStatus(campaignId, ResponseStatus.SUBMITTED);

        Map<Long, List<FeedbackResponse>> byTarget = responses.stream()
                .collect(Collectors.groupingBy(r -> r.getEvaluatorAssignment().getFeedbackRequest().getTargetEmployeeId()));
        Map<Long, String> employeeNames = loadEmployeeNames(byTarget.keySet().stream().toList());

        List<ConsolidatedFeedbackItemResponse> items = byTarget.entrySet().stream()
                .map(entry -> buildConsolidatedItem(entry.getKey(), entry.getValue(), employeeNames))
                .sorted(Comparator.comparing(ConsolidatedFeedbackItemResponse::getTargetEmployeeId))
                .toList();

        double campaignAverageScore = averageScore(responses);

        return ConsolidatedFeedbackReportResponse.builder()
                .campaignId(campaignId)
                .campaignName(campaign.getName())
                .campaignAverageScore(campaignAverageScore)
                .campaignScoreCategory(FeedbackScoreUtil.category(campaignAverageScore))
                .totalResponses((long) responses.size())
                .totalEmployees((long) items.size())
                .managerResponses(countByRelationship(responses, FeedbackRelationshipType.MANAGER))
                .peerResponses(countByRelationship(responses, FeedbackRelationshipType.PEER))
                .subordinateResponses(countByRelationship(responses, FeedbackRelationshipType.SUBORDINATE))
                .selfResponses(countByRelationship(responses, FeedbackRelationshipType.SELF))
                .sourceBreakdown(buildSourceBreakdown(responses))
                .items(items)
                .build();
    }

    private ConsolidatedFeedbackItemResponse buildConsolidatedItem(
            Long targetEmployeeId,
            List<FeedbackResponse> targetResponses,
            Map<Long, String> employeeNames
    ) {
        double averageScore = averageScore(targetResponses);
        return ConsolidatedFeedbackItemResponse.builder()
                .targetEmployeeId(targetEmployeeId)
                .targetEmployeeName(employeeNames.getOrDefault(targetEmployeeId, "Employee #" + targetEmployeeId))
                .averageScore(averageScore)
                .scoreCategory(FeedbackScoreUtil.category(averageScore))
                .totalResponses((long) targetResponses.size())
                .managerResponses(countByRelationship(targetResponses, FeedbackRelationshipType.MANAGER))
                .peerResponses(countByRelationship(targetResponses, FeedbackRelationshipType.PEER))
                .subordinateResponses(countByRelationship(targetResponses, FeedbackRelationshipType.SUBORDINATE))
                .selfResponses(countByRelationship(targetResponses, FeedbackRelationshipType.SELF))
                .managerAverageScore(averageScoreByRelationship(targetResponses, FeedbackRelationshipType.MANAGER))
                .peerAverageScore(averageScoreByRelationship(targetResponses, FeedbackRelationshipType.PEER))
                .subordinateAverageScore(averageScoreByRelationship(targetResponses, FeedbackRelationshipType.SUBORDINATE))
                .selfAverageScore(averageScoreByRelationship(targetResponses, FeedbackRelationshipType.SELF))
                .sourceBreakdown(buildSourceBreakdown(targetResponses))
                .build();
    }

    private List<FeedbackSourceBreakdownResponse> buildSourceBreakdown(List<FeedbackResponse> responses) {
        return Stream.of(
                        FeedbackRelationshipType.MANAGER,
                        FeedbackRelationshipType.PEER,
                        FeedbackRelationshipType.SUBORDINATE,
                        FeedbackRelationshipType.SELF
                )
                .map(type -> {
                    long count = countByRelationship(responses, type);
                    double average = averageScoreByRelationship(responses, type);
                    return FeedbackSourceBreakdownResponse.builder()
                            .sourceType(type.name())
                            .responseCount(count)
                            .averageScore(average)
                            .scoreCategory(FeedbackScoreUtil.category(average))
                            .build();
                })
                .toList();
    }

    private long countByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .count();
    }

    private double averageScoreByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return averageScore(responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .toList());
    }

    private double averageScore(List<FeedbackResponse> responses) {
        return FeedbackScoreUtil.averageOrZero(responses.stream().map(FeedbackResponse::getOverallScore));
    }

    private Map<Long, String> loadEmployeeNames(List<Long> employeeIds) {
        if (employeeIds.isEmpty()) {
            return Map.of();
        }
        Map<Long, String> names = new LinkedHashMap<>();
        List<Employee> employees = employeeRepository.findAllById(employeeIds.stream().map(Long::intValue).toList());
        for (Employee employee : employees) {
            String fullName = ((employee.getFirstName() != null ? employee.getFirstName() : "") + " "
                    + (employee.getLastName() != null ? employee.getLastName() : "")).trim();
            names.put(employee.getId().longValue(), fullName.isBlank() ? "Employee #" + employee.getId() : fullName);
        }
        for (Long employeeId : employeeIds) {
            names.putIfAbsent(employeeId, "Employee #" + employeeId);
        }
        return names;
    }
}
