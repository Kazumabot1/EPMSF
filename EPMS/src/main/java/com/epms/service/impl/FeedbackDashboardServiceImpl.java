package com.epms.service.impl;

import com.epms.dto.*;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.User;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackFormRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.FeedbackSummaryRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackDashboardService;
import com.epms.service.FeedbackWorkRelationshipResolver;
import com.epms.util.FeedbackPrivacyUtil;
import com.epms.util.FeedbackScoreUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
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
    private final FeedbackSummaryRepository feedbackSummaryRepository;
    private final FeedbackRequestRepository requestRepository;
    private final FeedbackCampaignRepository campaignRepository;
    private final FeedbackFormRepository feedbackFormRepository;
    private final UserRepository userRepository;
    private final FeedbackWorkRelationshipResolver workRelationshipResolver;

    @Override
    @Transactional(readOnly = true)
    public FeedbackDashboardResponse getEmployeeDashboard(Long userId, List<String> roles) {
        Long employeeId = resolveEmployeeIdForUser(userId);
        List<FeedbackSubmissionStatusResponse> pending = buildPendingStatuses(employeeId);
        List<FeedbackReceivedItemResponse> ownResults = buildVisibleResults(employeeId, roles);

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
        Long managerEmployeeId = resolveEmployeeIdForUser(userId);
        List<FeedbackSubmissionStatusResponse> pending = buildPendingStatuses(managerEmployeeId);
        User managerUser = userRepository.findById(userId.intValue())
                .orElseThrow(() -> new BusinessValidationException("This user is not linked to an employee record."));
        List<Long> workContextEmployeeIds = workRelationshipResolver.resolveSubordinateEmployeeIds(managerUser).stream()
                .distinct()
                .toList();

        List<TeamFeedbackSummaryResponse> summaries = workContextEmployeeIds.isEmpty()
                ? List.of()
                : buildTeamSummaries(workContextEmployeeIds);

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


    private Long resolveEmployeeIdForUser(Long userId) {
        return userRepository.findById(userId.intValue())
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .orElseThrow(() -> new BusinessValidationException("This user is not linked to an employee record."));
    }

    private List<FeedbackSubmissionStatusResponse> buildPendingStatuses(Long evaluatorEmployeeId) {
        return assignmentRepository.findByEvaluatorEmployeeId(evaluatorEmployeeId).stream()
                .filter(assignment -> assignment.getFeedbackRequest().getCampaign().getStatus() == FeedbackCampaignStatus.ACTIVE)
                .filter(assignment -> assignment.getStatus() == AssignmentStatus.PENDING
                        || assignment.getStatus() == AssignmentStatus.IN_PROGRESS)
                .sorted(java.util.Comparator.comparing(this::resolveEffectiveDeadline, java.util.Comparator.nullsLast(java.util.Comparator.naturalOrder())))
                .map(assignment -> {
                    FeedbackRequest request = assignment.getFeedbackRequest();
                    LocalDateTime dueAt = resolveEffectiveDeadline(assignment);
                    boolean overdue = dueAt != null && LocalDateTime.now().isAfter(dueAt);
                    boolean canSubmit = request.getCampaign().getStatus() == FeedbackCampaignStatus.ACTIVE
                            && !overdue
                            && assignment.getStatus() != AssignmentStatus.SUBMITTED
                            && assignment.getStatus() != AssignmentStatus.CANCELLED;
                    return FeedbackSubmissionStatusResponse.builder()
                            .evaluatorAssignmentId(assignment.getId())
                            .requestId(request.getId())
                            .campaignId(request.getCampaign().getId())
                            .campaignName(request.getCampaign().getName())
                            .campaignStatus(request.getCampaign().getStatus().name())
                            .targetEmployeeId(request.getTargetEmployeeId())
                            .targetEmployeeName(resolveEmployeeName(request.getTargetEmployeeId()))
                            .relationshipType(assignment.getRelationshipType().name())
                            .status(assignment.getStatus().name())
                            .canSubmit(canSubmit)
                            .lifecycleMessage(buildLifecycleMessage(request.getCampaign().getStatus(), dueAt, assignment.getStatus()))
                            .dueAt(dueAt)
                            .build();
                })
                .toList();
    }

    private List<FeedbackReceivedItemResponse> buildVisibleResults(Long targetEmployeeId, List<String> roles) {
        return responseRepository.findByTargetEmployeeIdAndStatusWithItems(targetEmployeeId, ResponseStatus.SUBMITTED).stream()
                .filter(response -> isTargetResultPublished(response.getEvaluatorAssignment().getFeedbackRequest()))
                .map(response -> {
                    FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
                    boolean identityVisible = FeedbackPrivacyUtil.canViewerSeeEvaluatorIdentity(assignment, targetEmployeeId);
                    FeedbackRequest request = assignment.getFeedbackRequest();
                    return FeedbackReceivedItemResponse.builder()
                            .responseId(response.getId())
                            .requestId(request.getId())
                            .campaignId(request.getCampaign().getId())
                            .campaignName(request.getCampaign().getName())
                            .campaignStatus(request.getCampaign().getStatus().name())
                            .targetEmployeeId(request.getTargetEmployeeId())
                            .targetEmployeeName(resolveEmployeeName(request.getTargetEmployeeId()))
                            .overallScore(response.getOverallScore())
                            .scoreCategory(FeedbackScoreUtil.category(response.getOverallScore()))
                            .comments(response.getComments())
                            .submittedAt(response.getSubmittedAt())
                            .relationshipType(assignment.getRelationshipType().name())
                            .anonymous(FeedbackPrivacyUtil.isIdentityProtected(assignment))
                            .evaluatorEmployeeId(identityVisible ? assignment.getEvaluatorEmployeeId() : null)
                            .evaluatorDisplayName(identityVisible
                                    ? resolveEmployeeName(assignment.getEvaluatorEmployeeId())
                                    : FeedbackPrivacyUtil.maskedEvaluatorLabel(assignment.getRelationshipType()))
                            .evaluatorIdentityVisible(identityVisible)
                            .evaluatorSourceLabel(FeedbackPrivacyUtil.relationshipLabel(assignment.getRelationshipType()))
                            .identityProtectionReason(FeedbackPrivacyUtil.identityProtectionReason(assignment))
                            .visibilityReason(visibilityReason(request))
                            .questionItems(mapQuestionItems(response))
                            .build();
                })
                .toList();
    }

    private List<FeedbackReceivedQuestionItemResponse> mapQuestionItems(FeedbackResponse response) {
        if (response.getItems() == null || response.getItems().isEmpty()) {
            return List.of();
        }
        return response.getItems().stream()
                .filter(item -> item != null && (item.getQuestion() != null || item.getAssignmentQuestion() != null))
                .sorted((a, b) -> {
                    int sectionCompare = Integer.compare(resolveQuestionSectionOrder(a), resolveQuestionSectionOrder(b));
                    if (sectionCompare != 0) {
                        return sectionCompare;
                    }
                    return Integer.compare(resolveQuestionDisplayOrder(a), resolveQuestionDisplayOrder(b));
                })
                .map(this::mapQuestionItem)
                .toList();
    }

    private FeedbackReceivedQuestionItemResponse mapQuestionItem(FeedbackResponseItem item) {
        if (item.getAssignmentQuestion() != null) {
            var assignmentQuestion = item.getAssignmentQuestion();
            return FeedbackReceivedQuestionItemResponse.builder()
                    .questionId(assignmentQuestion.getId())
                    .questionText(assignmentQuestion.getQuestionTextSnapshot())
                    .questionOrder(assignmentQuestion.getDisplayOrder())
                    .sectionTitle(assignmentQuestion.getSectionTitle())
                    .sectionOrder(assignmentQuestion.getSectionOrder())
                    .required(Boolean.TRUE.equals(assignmentQuestion.getRequired()))
                    .ratingValue(item.getRatingValue())
                    .comment(item.getComment())
                    .build();
        }

        var question = item.getQuestion();
        var section = question.getSection();
        return FeedbackReceivedQuestionItemResponse.builder()
                .questionId(question.getId())
                .questionText(question.getQuestionText())
                .questionOrder(question.getQuestionOrder())
                .sectionTitle(section == null ? null : section.getTitle())
                .sectionOrder(section == null ? null : section.getOrderNo())
                .required(Boolean.TRUE.equals(question.getIsRequired()))
                .ratingValue(item.getRatingValue())
                .comment(item.getComment())
                .build();
    }

    private int resolveQuestionSectionOrder(FeedbackResponseItem item) {
        if (item.getAssignmentQuestion() != null && item.getAssignmentQuestion().getSectionOrder() != null) {
            return item.getAssignmentQuestion().getSectionOrder();
        }
        if (item.getQuestion() != null && item.getQuestion().getSection() != null && item.getQuestion().getSection().getOrderNo() != null) {
            return item.getQuestion().getSection().getOrderNo();
        }
        return 0;
    }

    private int resolveQuestionDisplayOrder(FeedbackResponseItem item) {
        if (item.getAssignmentQuestion() != null && item.getAssignmentQuestion().getDisplayOrder() != null) {
            return item.getAssignmentQuestion().getDisplayOrder();
        }
        if (item.getQuestion() != null && item.getQuestion().getQuestionOrder() != null) {
            return item.getQuestion().getQuestionOrder();
        }
        return 0;
    }

    private List<TeamFeedbackSummaryResponse> buildTeamSummaries(List<Long> targetEmployeeIds) {
        List<FeedbackResponse> responses = responseRepository.findByTargetEmployeeIdsAndStatus(targetEmployeeIds, ResponseStatus.SUBMITTED).stream()
                .filter(response -> isTargetResultPublished(response.getEvaluatorAssignment().getFeedbackRequest()))
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
                            .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
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

    private String resolveEmployeeName(Long employeeId) {
        if (employeeId == null) {
            return "Unknown employee";
        }
        return userRepository.findActiveByEmployeeId(employeeId.intValue())
                .map(this::displayUser)
                .orElse("Employee #" + employeeId);
    }

    private String displayUser(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }
        return "Employee #" + user.getEmployeeId();
    }

    private String anonymousEvaluatorLabel(String relationshipType) {
        String label = relationshipType == null ? "Evaluator" : relationshipType.replace('_', ' ').toLowerCase();
        return "Anonymous " + label.substring(0, 1).toUpperCase() + label.substring(1);
    }

    private String visibilityReason(FeedbackRequest request) {
        return isTargetResultPublished(request)
                ? "Campaign result has been published by HR"
                : "Results are not published yet";
    }

    private String buildLifecycleMessage(FeedbackCampaignStatus campaignStatus, LocalDateTime dueAt, AssignmentStatus assignmentStatus) {
        if (assignmentStatus == AssignmentStatus.SUBMITTED) {
            return "Submitted feedback is locked and can only be viewed.";
        }
        if (campaignStatus == FeedbackCampaignStatus.DRAFT) {
            return "This campaign is still in HR setup.";
        }
        if (campaignStatus == FeedbackCampaignStatus.CLOSED) {
            return "This campaign is closed. Feedback can no longer be edited or submitted.";
        }
        if (dueAt != null && LocalDateTime.now().isAfter(dueAt)) {
            return "Feedback deadline has passed.";
        }
        return "Open for draft saving and final submission.";
    }

    private boolean isTargetResultPublished(FeedbackRequest request) {
        return request.getCampaign().getStatus() == FeedbackCampaignStatus.PUBLISHED
                && feedbackSummaryRepository.existsByCampaign_IdAndTargetEmployeeIdAndVisibilityStatus(
                request.getCampaign().getId(),
                request.getTargetEmployeeId(),
                FeedbackSummaryVisibilityStatus.PUBLISHED
        );
    }

    private LocalDateTime resolveEffectiveDeadline(FeedbackEvaluatorAssignment assignment) {
        return resolveEffectiveDeadline(assignment.getFeedbackRequest());
    }

    private LocalDateTime resolveEffectiveDeadline(FeedbackRequest request) {
        LocalDateTime campaignDeadline = request.getCampaign().getEndAt();
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
