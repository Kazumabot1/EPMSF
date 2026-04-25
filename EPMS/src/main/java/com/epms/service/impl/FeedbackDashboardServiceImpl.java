package com.epms.service.impl;

import com.epms.dto.*;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackDashboardServiceImpl implements FeedbackDashboardService {

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackResponseRepository responseRepository;
    private final FeedbackRequestRepository requestRepository;
    private final FeedbackCampaignRepository campaignRepository;
    private final FeedbackFormRepository feedbackFormRepository;
    private final UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public FeedbackDashboardResponse getEmployeeDashboard(Long userId, List<String> roles) {
        List<FeedbackSubmissionStatusResponse> pending = buildPendingStatuses(userId);
        List<FeedbackReceivedItemResponse> ownResults = buildVisibleResults(userId, roles);

        return FeedbackDashboardResponse.builder()
                .dashboardType("EMPLOYEE")
                .userId(userId)
                .totalRequests((long) pending.size())
                .totalResponses((long) ownResults.size())
                .totalPendingAssignments((long) pending.size())
                .pendingFeedbackToSubmit(pending)
                .ownFeedbackResults(ownResults)
                .teamFeedbackSummary(List.of())
                .campaigns(List.of())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackDashboardResponse getManagerDashboard(Long userId, List<String> roles) {
        List<FeedbackSubmissionStatusResponse> pending = buildPendingStatuses(userId);
        List<User> directReports = userRepository.findByManagerIdAndActiveTrue(userId.intValue());
        List<Long> directReportIds = directReports.stream().map(user -> user.getId().longValue()).toList();

        List<TeamFeedbackSummaryResponse> summaries = directReportIds.isEmpty()
                ? List.of()
                : buildTeamSummaries(directReportIds);

        return FeedbackDashboardResponse.builder()
                .dashboardType("MANAGER")
                .userId(userId)
                .totalRequests((long) summaries.size())
                .totalResponses(summaries.stream().mapToLong(TeamFeedbackSummaryResponse::getTotalResponses).sum())
                .totalPendingAssignments((long) pending.size())
                .pendingFeedbackToSubmit(pending)
                .ownFeedbackResults(List.of())
                .teamFeedbackSummary(summaries)
                .campaigns(List.of())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackDashboardResponse getHrDashboard(Long userId, List<String> roles) {
        List<FeedbackCampaign> campaigns = campaignRepository.findAllByOrderByStartDateDesc();
        List<FeedbackResponse> submittedResponses = responseRepository.findByFinalStatus(ResponseStatus.SUBMITTED);

        double averageScore = submittedResponses.stream()
                .map(FeedbackResponse::getOverallScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        return FeedbackDashboardResponse.builder()
                .dashboardType("HR")
                .userId(userId)
                .totalForms(feedbackFormRepository.count())
                .totalRequests(requestRepository.count())
                .totalResponses((long) submittedResponses.size())
                .totalPendingAssignments(assignmentRepository.count() - submittedResponses.size())
                .averageScore(averageScore)
                .pendingFeedbackToSubmit(List.of())
                .ownFeedbackResults(List.of())
                .teamFeedbackSummary(List.of())
                .campaigns(buildCampaignSummaries(campaigns))
                .build();
    }

    private List<FeedbackSubmissionStatusResponse> buildPendingStatuses(Long evaluatorEmployeeId) {
        return assignmentRepository.findByEvaluatorEmployeeId(evaluatorEmployeeId).stream()
                .filter(assignment -> assignment.getStatus() == AssignmentStatus.PENDING
                        || assignment.getStatus() == AssignmentStatus.IN_PROGRESS)
                .sorted(java.util.Comparator.comparing(this::resolveEffectiveDeadline, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .map(assignment -> FeedbackSubmissionStatusResponse.builder()
                        .evaluatorAssignmentId(assignment.getId())
                        .requestId(assignment.getFeedbackRequest().getId())
                        .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                        .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                        .targetEmployeeId(assignment.getFeedbackRequest().getTargetEmployeeId())
                        .evaluatorType(assignment.getSourceType().name())
                        .status(assignment.getStatus().name())
                        .dueAt(resolveEffectiveDeadline(assignment))
                        .build())
                .toList();
    }

    private List<FeedbackReceivedItemResponse> buildVisibleResults(Long targetEmployeeId, List<String> roles) {
        boolean privileged = hasPrivilegedRole(roles);
        return responseRepository.findByTargetEmployeeIdAndStatus(targetEmployeeId, ResponseStatus.SUBMITTED).stream()
                .filter(response -> privileged || hasVisibilityReached(response.getEvaluatorAssignment().getFeedbackRequest()))
                .map(response -> {
                    FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
                    boolean hideIdentity = Boolean.TRUE.equals(assignment.getIsAnonymous()) && !privileged;
                    return FeedbackReceivedItemResponse.builder()
                            .responseId(response.getId())
                            .requestId(assignment.getFeedbackRequest().getId())
                            .campaignId(assignment.getFeedbackRequest().getCampaign().getId())
                            .campaignName(assignment.getFeedbackRequest().getCampaign().getName())
                            .targetEmployeeId(assignment.getFeedbackRequest().getTargetEmployeeId())
                            .overallScore(response.getOverallScore())
                            .comments(response.getComments())
                            .submittedAt(response.getSubmittedAt())
                            .sourceType(assignment.getSourceType().name())
                            .anonymous(Boolean.TRUE.equals(assignment.getIsAnonymous()))
                            .evaluatorEmployeeId(hideIdentity ? null : assignment.getEvaluatorEmployeeId())
                            .build();
                })
                .toList();
    }

    private List<TeamFeedbackSummaryResponse> buildTeamSummaries(List<Long> targetEmployeeIds) {
        List<FeedbackResponse> responses = responseRepository.findByTargetEmployeeIdsAndStatus(targetEmployeeIds, ResponseStatus.SUBMITTED).stream()
                .filter(response -> hasVisibilityReached(response.getEvaluatorAssignment().getFeedbackRequest()))
                .toList();
        Map<Long, List<FeedbackResponse>> responsesByTarget = responses.stream()
                .collect(Collectors.groupingBy(response -> response.getEvaluatorAssignment().getFeedbackRequest().getTargetEmployeeId()));

        return targetEmployeeIds.stream()
                .map(targetEmployeeId -> {
                    List<FeedbackResponse> targetResponses = responsesByTarget.getOrDefault(targetEmployeeId, Collections.emptyList());
                    double averageScore = targetResponses.stream()
                            .map(FeedbackResponse::getOverallScore)
                            .filter(Objects::nonNull)
                            .mapToDouble(Double::doubleValue)
                            .average()
                            .orElse(0.0);
                    long pendingEvaluations = requestRepository.findByTargetEmployeeId(targetEmployeeId).stream()
                            .flatMap(request -> assignmentRepository.findByFeedbackRequestId(request.getId()).stream())
                            .filter(assignment -> assignment.getStatus() != AssignmentStatus.SUBMITTED)
                            .count();

                    return TeamFeedbackSummaryResponse.builder()
                            .targetEmployeeId(targetEmployeeId)
                            .averageScore(averageScore)
                            .totalResponses((long) targetResponses.size())
                            .pendingEvaluations(pendingEvaluations)
                            .build();
                })
                .toList();
    }

    private List<CampaignDashboardItemResponse> buildCampaignSummaries(List<FeedbackCampaign> campaigns) {
        return campaigns.stream()
                .map(campaign -> {
                    List<FeedbackRequest> requests = requestRepository.findByCampaignId(campaign.getId());
                    long totalAssignments = requests.stream()
                            .mapToLong(request -> assignmentRepository.countByFeedbackRequestId(request.getId()))
                            .sum();
                    long submittedAssignments = requests.stream()
                            .mapToLong(request -> assignmentRepository.countByFeedbackRequestIdAndStatus(request.getId(), AssignmentStatus.SUBMITTED))
                            .sum();
                    double completionPercent = totalAssignments == 0 ? 0.0 : (submittedAssignments * 100.0) / totalAssignments;
                    return CampaignDashboardItemResponse.builder()
                            .campaignId(campaign.getId())
                            .campaignName(campaign.getName())
                            .status(campaign.getStatus().name())
                            .startDate(campaign.getStartDate())
                            .endDate(campaign.getEndDate())
                            .totalRequests((long) requests.size())
                            .completionPercent(completionPercent)
                            .build();
                })
                .toList();
    }

    private boolean hasVisibilityReached(FeedbackRequest request) {
        LocalDateTime effectiveDeadline = resolveEffectiveDeadline(request);
        if (effectiveDeadline != null && LocalDateTime.now().isAfter(effectiveDeadline)) {
            return true;
        }
        long totalAssignments = assignmentRepository.countByFeedbackRequestId(request.getId());
        long submittedAssignments = assignmentRepository.countByFeedbackRequestIdAndStatus(request.getId(), AssignmentStatus.SUBMITTED);
        return totalAssignments > 0 && totalAssignments == submittedAssignments;
    }

    private LocalDateTime resolveEffectiveDeadline(FeedbackEvaluatorAssignment assignment) {
        return resolveEffectiveDeadline(assignment.getFeedbackRequest());
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

    private boolean hasPrivilegedRole(List<String> roles) {
        if (roles == null) {
            return false;
        }
        return roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("ADMIN") || role.equals("HR") || role.equals("ROLE_ADMIN") || role.equals("ROLE_HR"));
    }
}
