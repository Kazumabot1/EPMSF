package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignSummaryResponse;
import com.epms.dto.FeedbackIntegrationScoreResponse;
import com.epms.dto.FeedbackMyResultResponse;
import com.epms.dto.FeedbackResultItemResponse;
import com.epms.dto.FeedbackTeamSummaryResponse;
import com.epms.dto.FeedbackSummaryPublishRequest;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.FeedbackSummaryRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.FeedbackSummaryCalculationService;
import com.epms.service.FeedbackSummaryPrivacyService;
import com.epms.service.FeedbackSummaryService;
import com.epms.util.FeedbackScoreUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class FeedbackSummaryServiceImpl implements FeedbackSummaryService {

    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository feedbackEvaluatorAssignmentRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final FeedbackSummaryRepository feedbackSummaryRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackSummaryCalculationService feedbackSummaryCalculationService;
    private final FeedbackSummaryPrivacyService feedbackSummaryPrivacyService;

    @Override
    @Transactional
    public FeedbackCampaignSummaryResponse getCampaignSummary(Long campaignId) {
        FeedbackCampaign campaign = getClosedCampaign(campaignId);
        List<FeedbackSummary> summaries = refreshCampaignSummary(campaign);
        return buildCampaignSummary(campaign, summaries);
    }

    @Override
    @Transactional
    public FeedbackCampaignSummaryResponse recalculateCampaignSummary(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        List<FeedbackSummary> summaries = refreshCampaignSummary(campaign);
        feedbackOperationalService.audit(
                (Long) null,
                FeedbackOperationalService.SUMMARY_CALCULATED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                null,
                "summaries=" + summaries.size(),
                "360 feedback summary recalculated"
        );
        return buildCampaignSummary(campaign, summaries);
    }

    @Override
    @Transactional
    public FeedbackCampaignSummaryResponse publishCampaignSummary(Long campaignId, Long userId, FeedbackSummaryPublishRequest request) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        validatePublishableCampaign(campaign);

        List<FeedbackSummary> summaries = refreshCampaignSummary(campaign);
        List<FeedbackSummary> publishableSummaries = selectPublishableSummaries(summaries, request);

        if (publishableSummaries.isEmpty()) {
            throw new BusinessValidationException("No employee results are ready to publish. Results must have submitted responses and pass confidentiality/confidence checks.");
        }

        LocalDateTime now = LocalDateTime.now();
        String publishNote = buildPublishNote(request);
        for (FeedbackSummary summary : publishableSummaries) {
            summary.setVisibilityStatus(FeedbackSummaryVisibilityStatus.PUBLISHED);
            summary.setPublishedAt(now);
            summary.setPublishedByUserId(userId);
            summary.setPublishNote(publishNote);
            feedbackSummaryRepository.save(summary);
        }

        feedbackOperationalService.audit(
                userId,
                FeedbackOperationalService.SUMMARY_PUBLISHED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                "requestedScope=" + normalizedPublishScope(request),
                "publishedSummaries=" + publishableSummaries.size(),
                "360 feedback summaries published after confidentiality and readiness checks"
        );
        campaign.setStatus(FeedbackCampaignStatus.PUBLISHED);
        feedbackCampaignRepository.save(campaign);
        if (request == null || !Boolean.FALSE.equals(request.getNotifyEmployees())) {
            feedbackOperationalService.notifySummaryPublished(campaign, publishableSummaries);
        }

        return buildCampaignSummary(campaign, feedbackSummaryRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId));
    }

    @Override
    @Transactional
    public FeedbackCampaignSummaryResponse unpublishCampaignSummary(Long campaignId, Long userId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        if (campaign.getStatus() != FeedbackCampaignStatus.CLOSED
                && campaign.getStatus() != FeedbackCampaignStatus.PUBLISHED) {
            throw new BusinessValidationException("Cannot unpublish feedback summary until the campaign is CLOSED or PUBLISHED.");
        }

        List<FeedbackSummary> summaries = feedbackSummaryRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId);
        if (summaries.isEmpty()) {
            summaries = refreshCampaignSummary(campaign);
        }

        long previouslyPublished = summaries.stream()
                .filter(summary -> summary.getVisibilityStatus() == FeedbackSummaryVisibilityStatus.PUBLISHED)
                .count();

        for (FeedbackSummary summary : summaries) {
            summary.setVisibilityStatus(feedbackSummaryPrivacyService.isSummaryReadyForPublish(summary)
                    ? FeedbackSummaryVisibilityStatus.READY_TO_PUBLISH
                    : FeedbackSummaryVisibilityStatus.HIDDEN);
            summary.setPublishedAt(null);
            summary.setPublishedByUserId(null);
            summary.setPublishNote("Unpublished by HR/Admin.");
            feedbackSummaryRepository.save(summary);
        }

        feedbackOperationalService.audit(
                userId,
                FeedbackOperationalService.SUMMARY_UNPUBLISHED,
                FeedbackOperationalService.ENTITY_CAMPAIGN,
                campaignId,
                "previouslyPublished=" + previouslyPublished,
                "visibilityStatus=READY_TO_PUBLISH",
                "360 feedback summaries unpublished"
        );

        campaign.setStatus(FeedbackCampaignStatus.CLOSED);
        feedbackCampaignRepository.save(campaign);

        return buildCampaignSummary(campaign, feedbackSummaryRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaignId));
    }

    @Override
    @Transactional
    public FeedbackMyResultResponse getMyResult(Long userId) {
        User user = getUser(userId);
        Long employeeId = requireEmployeeId(user);
        refreshClosedCampaignSummariesForEmployee(employeeId);

        List<FeedbackSummary> results = feedbackSummaryRepository.findByTargetEmployeeIdOrderByCampaignEndDateDesc(employeeId)
                .stream()
                .filter(this::isPublishedClosedSummary)
                .toList();

        String employeeName = loadEmployeeNames(List.of(employeeId)).getOrDefault(employeeId, "Employee #" + employeeId);
        return FeedbackMyResultResponse.builder()
                .employeeId(employeeId)
                .employeeName(employeeName)
                .results(feedbackSummaryPrivacyService.mapResultItems(results, Map.of(employeeId, employeeName), true))
                .build();
    }

    @Override
    @Transactional
    public FeedbackTeamSummaryResponse getTeamSummary(Long userId) {
        List<User> directReports = userRepository.findByManagerIdAndActiveTrue(userId.intValue());
        List<Long> employeeIds = directReports.stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .distinct()
                .toList();

        if (employeeIds.isEmpty()) {
            return FeedbackTeamSummaryResponse.builder()
                    .managerUserId(userId)
                    .totalDirectReports(0)
                    .totalClosedResults(0)
                    .items(List.of())
                    .build();
        }

        refreshClosedCampaignSummariesForEmployees(employeeIds);
        List<FeedbackSummary> summaries = feedbackSummaryRepository.findByTargetEmployeeIdInOrderByCampaignEndDateDesc(employeeIds)
                .stream()
                .filter(this::isPublishedClosedSummary)
                .toList();

        return FeedbackTeamSummaryResponse.builder()
                .managerUserId(userId)
                .totalDirectReports(employeeIds.size())
                .totalClosedResults(summaries.size())
                .items(feedbackSummaryPrivacyService.mapResultItems(summaries, loadEmployeeNames(employeeIds), true))
                .build();
    }

    @Override
    @Transactional
    public List<FeedbackIntegrationScoreResponse> getIntegrationScores(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        List<FeedbackSummary> summaries = refreshCampaignSummary(campaign);
        Map<Long, String> employeeNames = loadEmployeeNames(extractTargetEmployeeIds(summaries));
        return summaries.stream()
                .map(summary -> feedbackSummaryPrivacyService.mapIntegrationScore(summary, employeeNames))
                .toList();
    }

    @Override
    @Transactional
    public List<FeedbackIntegrationScoreResponse> getIntegrationScoresForEmployee(Long employeeId) {
        refreshClosedCampaignSummariesForEmployee(employeeId);
        List<FeedbackSummary> summaries = feedbackSummaryRepository.findByTargetEmployeeIdOrderByCampaignEndDateDesc(employeeId);
        Map<Long, String> employeeNames = loadEmployeeNames(List.of(employeeId));
        return summaries.stream()
                .map(summary -> feedbackSummaryPrivacyService.mapIntegrationScore(summary, employeeNames))
                .toList();
    }

    private FeedbackCampaignSummaryResponse buildCampaignSummary(FeedbackCampaign campaign, List<FeedbackSummary> summaries) {
        List<FeedbackResultItemResponse> items = feedbackSummaryPrivacyService.mapResultItems(
                summaries,
                loadEmployeeNames(extractTargetEmployeeIds(summaries)),
                false
        );

        double overallAverage = summaries.stream()
                .map(FeedbackSummary::getAverageScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
        long totalResponses = summaries.stream().mapToLong(summary -> safeLong(summary.getTotalResponses())).sum();
        long assignedCount = summaries.stream().mapToLong(summary -> safeLong(summary.getAssignedEvaluatorCount())).sum();
        long submittedCount = summaries.stream().mapToLong(summary -> safeLong(summary.getSubmittedEvaluatorCount())).sum();
        long pendingCount = summaries.stream().mapToLong(summary -> safeLong(summary.getPendingEvaluatorCount())).sum();
        double completionRate = assignedCount == 0 ? 0.0 : roundToTwoDecimals((submittedCount * 100.0) / assignedCount);
        long insufficientCount = summaries.stream().filter(summary -> Boolean.TRUE.equals(summary.getInsufficientFeedback())).count();
        LocalDateTime summarizedAt = summaries.stream()
                .map(FeedbackSummary::getSummarizedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(LocalDateTime.now());

        return FeedbackCampaignSummaryResponse.builder()
                .campaignId(campaign.getId())
                .campaignName(campaign.getName())
                .status(campaign.getStatus().name())
                .overallAverageScore(roundToTwoDecimals(overallAverage))
                .overallScoreCategory(FeedbackScoreUtil.category(overallAverage))
                .totalEmployees((long) items.size())
                .totalResponses(totalResponses)
                .assignedEvaluatorCount(assignedCount)
                .submittedEvaluatorCount(submittedCount)
                .pendingEvaluatorCount(pendingCount)
                .completionRate(completionRate)
                .insufficientFeedbackCount(insufficientCount)
                .visibilityStatus(feedbackSummaryPrivacyService.campaignVisibilityStatus(summaries).name())
                .publishedAt(feedbackSummaryPrivacyService.campaignPublishedAt(summaries))
                .publishedByUserId(feedbackSummaryPrivacyService.campaignPublishedByUserId(summaries))
                .publishNote(feedbackSummaryPrivacyService.campaignPublishNote(summaries))
                .summarizedAt(summarizedAt)
                .items(items)
                .build();
    }

    private void refreshClosedCampaignSummariesForEmployee(Long employeeId) {
        refreshClosedCampaignSummariesForEmployees(List.of(employeeId));
    }

    private void refreshClosedCampaignSummariesForEmployees(List<Long> employeeIds) {
        List<FeedbackCampaign> closedCampaigns = feedbackCampaignRepository.findAllByOrderByStartDateDesc().stream()
                .filter(campaign -> campaign.getStatus() == FeedbackCampaignStatus.CLOSED
                        || campaign.getStatus() == FeedbackCampaignStatus.PUBLISHED)
                .toList();
        for (FeedbackCampaign campaign : closedCampaigns) {
            List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId())
                    .stream()
                    .filter(request -> employeeIds.contains(request.getTargetEmployeeId()))
                    .toList();
            if (!requests.isEmpty()) {
                refreshCampaignSummary(campaign, requests);
            }
        }
    }

    private FeedbackCampaign getClosedCampaign(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        if (campaign.getStatus() != FeedbackCampaignStatus.CLOSED
                && campaign.getStatus() != FeedbackCampaignStatus.PUBLISHED) {
            throw new BusinessValidationException("Feedback results are available only after the campaign is CLOSED or PUBLISHED.");
        }
        return campaign;
    }

    private FeedbackCampaign getCampaign(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    private List<FeedbackSummary> refreshCampaignSummary(FeedbackCampaign campaign) {
        List<FeedbackRequest> requests = feedbackRequestRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        return refreshCampaignSummary(campaign, requests);
    }

    private List<FeedbackSummary> refreshCampaignSummary(FeedbackCampaign campaign, List<FeedbackRequest> requests) {
        List<FeedbackEvaluatorAssignment> campaignAssignments = feedbackEvaluatorAssignmentRepository.findByCampaignIdWithRequest(campaign.getId());
        List<FeedbackResponse> submittedResponses = feedbackResponseRepository.findByCampaignIdAndStatus(campaign.getId(), ResponseStatus.SUBMITTED);

        Map<Long, List<FeedbackEvaluatorAssignment>> assignmentsByRequestId = campaignAssignments.stream()
                .collect(Collectors.groupingBy(assignment -> assignment.getFeedbackRequest().getId()));

        Map<Long, FeedbackResponse> submittedResponseByAssignmentId = submittedResponses.stream()
                .filter(response -> response.getEvaluatorAssignment() != null)
                .collect(Collectors.toMap(
                        response -> response.getEvaluatorAssignment().getId(),
                        response -> response,
                        (first, duplicate) -> first
                ));

        List<FeedbackSummary> persisted = new ArrayList<>();
        Set<Long> activeTargetEmployeeIds = new HashSet<>();
        LocalDateTime now = LocalDateTime.now();

        for (FeedbackRequest request : requests) {
            Long targetEmployeeId = request.getTargetEmployeeId();
            activeTargetEmployeeIds.add(targetEmployeeId);
            List<FeedbackEvaluatorAssignment> assignments = assignmentsByRequestId.getOrDefault(request.getId(), List.of());
            List<FeedbackEvaluatorAssignment> countedAssignments = assignments.stream()
                    .filter(assignment -> assignment.getStatus() != AssignmentStatus.CANCELLED)
                    .toList();
            List<FeedbackResponse> responses = countedAssignments.stream()
                    .map(assignment -> submittedResponseByAssignmentId.get(assignment.getId()))
                    .filter(Objects::nonNull)
                    .toList();

            FeedbackSummary summary = feedbackSummaryRepository.findByCampaignIdAndTargetEmployeeId(campaign.getId(), targetEmployeeId)
                    .orElseGet(FeedbackSummary::new);
            feedbackSummaryCalculationService.applySummaryValues(
                    summary,
                    campaign,
                    targetEmployeeId,
                    countedAssignments,
                    responses,
                    now
            );
            persisted.add(feedbackSummaryRepository.save(summary));
        }

        List<FeedbackSummary> existing = feedbackSummaryRepository.findByCampaignIdOrderByTargetEmployeeIdAsc(campaign.getId());
        for (FeedbackSummary summary : existing) {
            if (!activeTargetEmployeeIds.contains(summary.getTargetEmployeeId())) {
                feedbackSummaryRepository.delete(summary);
            }
        }

        return persisted.stream()
                .sorted(Comparator.comparing(FeedbackSummary::getTargetEmployeeId))
                .toList();
    }

    private List<FeedbackSummary> selectPublishableSummaries(
            List<FeedbackSummary> summaries,
            FeedbackSummaryPublishRequest request
    ) {
        String scope = normalizedPublishScope(request);
        Set<Long> selectedTargetIds = request == null || request.getTargetEmployeeIds() == null
                ? Set.of()
                : request.getTargetEmployeeIds().stream().filter(Objects::nonNull).collect(Collectors.toSet());

        if ("SELECTED_EMPLOYEES".equals(scope) && selectedTargetIds.isEmpty()) {
            throw new BusinessValidationException("Select at least one ready employee result before publishing.");
        }

        return summaries.stream()
                .filter(summary -> !"SELECTED_EMPLOYEES".equals(scope) || selectedTargetIds.contains(summary.getTargetEmployeeId()))
                .filter(feedbackSummaryPrivacyService::isSummaryReadyForPublish)
                .toList();
    }

    private String normalizedPublishScope(FeedbackSummaryPublishRequest request) {
        if (request == null || request.getScope() == null || request.getScope().isBlank()) {
            return "ALL_READY";
        }
        String scope = request.getScope().trim().toUpperCase();
        return "SELECTED_EMPLOYEES".equals(scope) ? "SELECTED_EMPLOYEES" : "ALL_READY";
    }


    private String buildPublishNote(FeedbackSummaryPublishRequest request) {
        List<String> included = new ArrayList<>();
        if (request == null || !Boolean.FALSE.equals(request.getIncludeOverallScore())) {
            included.add("overall score");
        }
        if (request == null || Boolean.TRUE.equals(request.getIncludeCompetencyBreakdown())) {
            included.add("competency breakdown");
        }
        if (request == null || Boolean.TRUE.equals(request.getIncludeSelfVsOthers())) {
            included.add("self vs others comparison");
        }
        if (request != null && Boolean.TRUE.equals(request.getIncludeComments())) {
            included.add("anonymous comments where confidentiality allows");
        }
        if (request == null || !Boolean.FALSE.equals(request.getIncludeScoreExplanation())) {
            included.add("score explanation");
        }
        String includedText = included.isEmpty() ? "no optional result sections selected" : String.join(", ", included);
        return "Published by HR/Admin after campaign close. Included: " + includedText + ".";
    }


    private void validatePublishableCampaign(FeedbackCampaign campaign) {
        if (campaign.getStatus() == FeedbackCampaignStatus.ACTIVE) {
            throw new BusinessValidationException("Cannot publish active campaign summary. Close the campaign before publishing.");
        }
        if (campaign.getStatus() == FeedbackCampaignStatus.DRAFT) {
            throw new BusinessValidationException("Cannot publish draft campaign summary. Close the campaign before publishing.");
        }
        if (campaign.getStatus() != FeedbackCampaignStatus.CLOSED) {
            throw new BusinessValidationException("Cannot publish feedback summary until the campaign is CLOSED.");
        }
    }

    private boolean isPublishedClosedSummary(FeedbackSummary summary) {
        if (summary == null
                || summary.getCampaign() == null
                || summary.getVisibilityStatus() != FeedbackSummaryVisibilityStatus.PUBLISHED) {
            return false;
        }
        FeedbackCampaignStatus status = summary.getCampaign().getStatus();
        return status == FeedbackCampaignStatus.CLOSED || status == FeedbackCampaignStatus.PUBLISHED;
    }

    private List<Long> extractTargetEmployeeIds(List<FeedbackSummary> summaries) {
        return summaries.stream()
                .map(FeedbackSummary::getTargetEmployeeId)
                .distinct()
                .toList();
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

    private User getUser(Long userId) {
        return userRepository.findById(userId.intValue())
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
    }

    private Long requireEmployeeId(User user) {
        if (user.getEmployeeId() == null) {
            throw new BusinessValidationException("This user is not linked to an employee record.");
        }
        return user.getEmployeeId().longValue();
    }

    private long safeLong(Long value) {
        return value == null ? 0L : value;
    }


    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }
}
