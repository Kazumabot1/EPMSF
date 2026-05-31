package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignSummaryResponse;
import com.epms.dto.FeedbackCompetencyResultResponse;
import com.epms.dto.FeedbackIntegrationScoreResponse;
import com.epms.dto.FeedbackMyResultResponse;
import com.epms.dto.FeedbackPublishedCommentResponse;
import com.epms.dto.FeedbackResultItemResponse;
import com.epms.entity.FeedbackResponseItem;
import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.dto.FeedbackConfidenceBreakdownResponse;
import com.epms.dto.FeedbackRelationshipAverageResponse;
import com.epms.dto.FeedbackRelationshipPrivacyResponse;
import com.epms.dto.FeedbackRelationshipScoreResponse;
import com.epms.dto.FeedbackScoreDistributionResponse;
import com.epms.dto.FeedbackTeamSummaryResponse;
import com.epms.dto.FeedbackSummaryPublishRequest;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.Team;
import com.epms.entity.User;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.FeedbackSummaryRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackOperationalService;
import com.epms.service.FeedbackSummaryCalculationService;
import com.epms.service.FeedbackSummaryService;
import com.epms.service.FeedbackWorkRelationshipResolver;
import com.epms.util.FeedbackScoreUtil;
import com.epms.util.FeedbackPrivacyUtil;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.EnumMap;
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
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final FeedbackSummaryRepository feedbackSummaryRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final FeedbackOperationalService feedbackOperationalService;
    private final FeedbackSummaryCalculationService feedbackSummaryCalculationService;
    private final Feedback360ScoringServiceImpl feedback360ScoringService;
    private final FeedbackWorkRelationshipResolver workRelationshipResolver;

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
            applyPublishOptions(summary, request);
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
            summary.setVisibilityStatus(isSummaryReadyForPublish(summary)
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
                .results(mapResults(results, Map.of(employeeId, employeeName), true))
                .build();
    }

    @Override
    @Transactional
    public FeedbackTeamSummaryResponse getTeamSummary(Long userId) {
        User viewer = getUser(userId);

        if (isDepartmentHeadViewer(viewer)) {
            return getDepartmentHeadSummary(viewer, userId);
        }
        if (isManagerViewer(viewer)) {
            return getDirectReportSummary(userId);
        }

        throw new UnauthorizedActionException("Only Managers and Department Heads can access managed-employee or department 360 feedback summaries.");
    }

    private FeedbackTeamSummaryResponse getDirectReportSummary(Long userId) {
        Integer managerUserId = userId.intValue();
        User managerUser = userRepository.findById(managerUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Manager user not found."));
        List<Team> managedTeams = loadActiveTeamsManagedBy(managerUserId);
        int managedTeamCount = (int) managedTeams.stream()
                .map(Team::getId)
                .filter(Objects::nonNull)
                .distinct()
                .count();

        Set<Long> employeeIdSet = new HashSet<>(workRelationshipResolver.resolveSubordinateEmployeeIds(managerUser));

        List<Long> employeeIds = employeeIdSet.stream()
                .sorted()
                .toList();

        if (employeeIds.isEmpty()) {
            return FeedbackTeamSummaryResponse.builder()
                    .managerUserId(userId)
                    .ownerUserId(userId)
                    .viewScope("MANAGER_WORK_CONTEXT")
                    .totalDirectReports(0)
                    .totalDepartmentEmployees(0)
                    .totalManagedTeams(managedTeamCount)
                    .totalClosedResults(0)
                    .accessTitle("Published 360 summary")
                    .accessDescription("Managers can view published 360 results only for employees included in their reviewer summary scope.")
                    .privacyNotice("Only privacy-safe published summaries are shown. Anonymous peer and subordinate detail remains masked when confidentiality thresholds are not met.")
                    .emptyStateMessage("No published 360 results are available yet.")
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
                .ownerUserId(userId)
                .viewScope("MANAGER_WORK_CONTEXT")
                .totalDirectReports(employeeIds.size())
                .totalDepartmentEmployees(0)
                .totalManagedTeams(managedTeamCount)
                .totalClosedResults(summaries.size())
                .accessTitle("Published 360 summary")
                .accessDescription("Managers can view published 360 results only for employees included in their reviewer summary scope.")
                .privacyNotice("Only privacy-safe published summaries are shown. Anonymous peer and subordinate detail remains masked when confidentiality thresholds are not met.")
                .emptyStateMessage("No published 360 results are available yet.")
                .items(mapResults(summaries, loadEmployeeNames(employeeIds), true))
                .build();
    }

    private List<Team> loadActiveTeamsManagedBy(Integer managerUserId) {
        if (managerUserId == null) {
            return List.of();
        }
        Map<Integer, Team> teamsById = new LinkedHashMap<>();
        teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(managerUserId, "Active")
                .forEach(team -> {
                    if (team.getId() != null) {
                        teamsById.put(team.getId(), team);
                    }
                });
        teamRepository.findByProjectManagerIdAndStatusIgnoreCase(managerUserId, "Active")
                .forEach(team -> {
                    if (team.getId() != null) {
                        teamsById.put(team.getId(), team);
                    }
                });
        return new ArrayList<>(teamsById.values());
    }

    private FeedbackTeamSummaryResponse getDepartmentHeadSummary(User departmentHead, Long userId) {
        Integer departmentId = departmentHead.getDepartmentId();
        if (departmentId == null) {
            return FeedbackTeamSummaryResponse.builder()
                    .managerUserId(userId)
                    .ownerUserId(userId)
                    .viewScope("DEPARTMENT")
                    .totalDirectReports(0)
                    .totalDepartmentEmployees(0)
                    .totalDepartmentTeams(0)
                    .totalClosedResults(0)
                    .accessTitle("Department published 360 summary")
                    .accessDescription("Department Heads can view privacy-safe published 360 results for employees in their own department, whether or not the department uses teams.")
                    .privacyNotice("Department Head access is a department-level view. It does not expose evaluator identities or hidden peer/subordinate relationship scores.")
                    .emptyStateMessage("Your user account is not linked to a department, so no department 360 summary can be shown.")
                    .items(List.of())
                    .build();
        }

        List<Long> employeeIds = employeeRepository.findCurrentByWorkingDepartmentId(departmentId, false).stream()
                .map(Employee::getId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .distinct()
                .toList();

        if (employeeIds.isEmpty()) {
            return FeedbackTeamSummaryResponse.builder()
                    .managerUserId(userId)
                    .ownerUserId(userId)
                    .viewScope("DEPARTMENT")
                    .departmentId(departmentId)
                    .departmentName(resolveDepartmentName(departmentId))
                    .totalDirectReports(0)
                    .totalDepartmentEmployees(0)
                    .totalDepartmentTeams(teamRepository.findByDepartmentIdAndStatusIgnoreCase(departmentId, "Active").size())
                    .totalClosedResults(0)
                    .accessTitle("Department published 360 summary")
                    .accessDescription("Department Heads can view privacy-safe published 360 results for employees in their own department, whether or not the department uses teams.")
                    .privacyNotice("Department Head access is a department-level view. It does not expose evaluator identities or hidden peer/subordinate relationship scores.")
                    .emptyStateMessage("No published 360 results are available for your department yet.")
                    .items(List.of())
                    .build();
        }

        int departmentTeamCount = teamRepository.findByDepartmentIdAndStatusIgnoreCase(departmentId, "Active").size();

        refreshClosedCampaignSummariesForEmployees(employeeIds);
        List<FeedbackSummary> summaries = feedbackSummaryRepository.findByTargetEmployeeIdInOrderByCampaignEndDateDesc(employeeIds)
                .stream()
                .filter(this::isPublishedClosedSummary)
                .toList();

        return FeedbackTeamSummaryResponse.builder()
                .managerUserId(userId)
                .ownerUserId(userId)
                .viewScope("DEPARTMENT")
                .departmentId(departmentId)
                .departmentName(resolveDepartmentName(departmentId))
                .totalDirectReports(workRelationshipResolver.resolveSubordinateEmployeeIds(departmentHead).size())
                .totalDepartmentEmployees(employeeIds.size())
                .totalDepartmentTeams(departmentTeamCount)
                .totalClosedResults(summaries.size())
                .accessTitle("Department published 360 summary")
                .accessDescription("Department Heads can view privacy-safe published 360 results for employees in their own department, whether or not the department uses teams.")
                .privacyNotice("Department Head access is a department-level view. It does not create a separate evaluator relationship.")
                .emptyStateMessage("No published 360 results are available for your department yet.")
                .items(mapResults(summaries, loadEmployeeNames(employeeIds), true))
                .build();
    }

    private boolean isManagerViewer(User viewer) {
        if (viewer == null) {
            return false;
        }
        if (isManagerDashboard(viewer.getDashboard())) {
            return true;
        }
        return userRepository.findNormalizedRoleNamesByUserId(viewer.getId()).stream()
                .map(this::normalizeRoleName)
                .anyMatch(this::isManagerRole);
    }

    private boolean isManagerDashboard(String dashboard) {
        String normalized = normalizeRoleName(dashboard);
        return normalized.equals("MANAGER_DASHBOARD")
                || normalized.equals("PROJECT_MANAGER_DASHBOARD");
    }

    private boolean isManagerRole(String role) {
        String normalized = normalizeRoleName(role);
        return normalized.equals("MANAGER")
                || normalized.equals("PROJECT_MANAGER")
                || normalized.equals("PROJECTMANAGER")
                || normalized.equals("TEAM_MANAGER")
                || normalized.equals("PM")
                || normalized.equals("TEAM_LEADER")
                || normalized.equals("TEAMLEADER");
    }

    private boolean isDepartmentHeadViewer(User viewer) {
        if (viewer == null) {
            return false;
        }
        if (isDepartmentHeadDashboard(viewer.getDashboard())) {
            return true;
        }
        return userRepository.findNormalizedRoleNamesByUserId(viewer.getId()).stream()
                .map(this::normalizeRoleName)
                .anyMatch(this::isDepartmentHeadRole);
    }

    private boolean isDepartmentHeadDashboard(String dashboard) {
        String normalized = normalizeRoleName(dashboard);
        return normalized.equals("DEPARTMENT_HEAD_DASHBOARD")
                || normalized.equals("DEPARTMENTHEAD_DASHBOARD")
                || normalized.equals("DEPT_HEAD_DASHBOARD");
    }

    private boolean isDepartmentHeadRole(String role) {
        String normalized = normalizeRoleName(role);
        return normalized.equals("DEPARTMENT_HEAD")
                || normalized.equals("DEPARTMENTHEAD")
                || normalized.equals("DEPT_HEAD")
                || normalized.equals("HEAD_OF_DEPARTMENT");
    }

    private String normalizeRoleName(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();
    }

    private String resolveDepartmentName(Integer departmentId) {
        if (departmentId == null) {
            return null;
        }
        return departmentRepository.findById(departmentId)
                .map(Department::getDepartmentName)
                .orElse("Department #" + departmentId);
    }

    @Override
    @Transactional
    public List<FeedbackIntegrationScoreResponse> getIntegrationScores(Long campaignId) {
        FeedbackCampaign campaign = getCampaign(campaignId);
        List<FeedbackSummary> summaries = refreshCampaignSummary(campaign);
        Map<Long, String> employeeNames = loadEmployeeNames(extractTargetEmployeeIds(summaries));
        return summaries.stream()
                .map(summary -> mapIntegrationScore(summary, employeeNames))
                .toList();
    }

    @Override
    @Transactional
    public List<FeedbackIntegrationScoreResponse> getIntegrationScoresForEmployee(Long employeeId) {
        refreshClosedCampaignSummariesForEmployee(employeeId);
        List<FeedbackSummary> summaries = feedbackSummaryRepository.findByTargetEmployeeIdOrderByCampaignEndDateDesc(employeeId);
        Map<Long, String> employeeNames = loadEmployeeNames(List.of(employeeId));
        return summaries.stream()
                .map(summary -> mapIntegrationScore(summary, employeeNames))
                .toList();
    }

    private FeedbackCampaignSummaryResponse buildCampaignSummary(FeedbackCampaign campaign, List<FeedbackSummary> summaries) {
        List<FeedbackResultItemResponse> items = mapResults(summaries, loadEmployeeNames(extractTargetEmployeeIds(summaries)), false);

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
                .visibilityStatus(campaignVisibilityStatus(summaries).name())
                .publishedAt(campaignPublishedAt(summaries))
                .publishedByUserId(campaignPublishedByUserId(summaries))
                .publishNote(campaignPublishNote(summaries))
                .summarizedAt(summarizedAt)
                .scoreDistribution(buildScoreDistribution(summaries))
                .relationshipAverages(buildRelationshipAverages(summaries))
                .competencyAverages(feedbackSummaryCalculationService.buildCampaignCompetencyAverages(campaign.getId()))
                .confidenceBreakdown(buildConfidenceBreakdown(summaries))
                .items(items)
                .build();
    }


    private List<FeedbackScoreDistributionResponse> buildScoreDistribution(List<FeedbackSummary> summaries) {
        return List.of(
                scoreBand("OUTSTANDING", FeedbackScoreUtil.OUTSTANDING, 86, 100, summaries),
                scoreBand("GOOD", FeedbackScoreUtil.GOOD, 71, 85, summaries),
                scoreBand("MEETS_REQUIREMENT", FeedbackScoreUtil.MEETS_REQUIREMENT, 60, 70, summaries),
                scoreBand("NEEDS_IMPROVEMENT", FeedbackScoreUtil.NEEDS_IMPROVEMENT, 40, 59, summaries),
                scoreBand("UNSATISFACTORY", FeedbackScoreUtil.UNSATISFACTORY, 0, 39, summaries)
        );
    }

    private FeedbackScoreDistributionResponse scoreBand(
            String band,
            String label,
            int minScore,
            int maxScore,
            List<FeedbackSummary> summaries
    ) {
        long count = summaries.stream()
                .map(FeedbackSummary::getAverageScore)
                .filter(Objects::nonNull)
                .filter(score -> label.equals(FeedbackScoreUtil.category(score)))
                .count();
        return FeedbackScoreDistributionResponse.builder()
                .band(band)
                .label(label)
                .minScore(minScore)
                .maxScore(maxScore)
                .count(count)
                .build();
    }

    private List<FeedbackRelationshipAverageResponse> buildRelationshipAverages(List<FeedbackSummary> summaries) {
        return List.of(
                relationshipAverageResponse(FeedbackRelationshipType.MANAGER, "Manager reviewers", summaries),
                relationshipAverageResponse(FeedbackRelationshipType.PEER, "Peer reviewers", summaries),
                relationshipAverageResponse(FeedbackRelationshipType.SUBORDINATE, "Subordinate reviewers", summaries),
                relationshipAverageResponse(FeedbackRelationshipType.SELF, "Self reviewers", summaries)
        );
    }

    private FeedbackRelationshipAverageResponse relationshipAverageResponse(
            FeedbackRelationshipType relationshipType,
            String label,
            List<FeedbackSummary> summaries
    ) {
        double weightedScoreTotal = 0.0;
        long responseCount = 0L;
        for (FeedbackSummary summary : summaries) {
            long count = relationshipResponseCount(summary, relationshipType);
            Double average = relationshipAverage(summary, relationshipType);
            if (count <= 0 || average == null) {
                continue;
            }
            weightedScoreTotal += average * count;
            responseCount += count;
        }
        Double averageScore = responseCount == 0 ? null : roundToTwoDecimals(weightedScoreTotal / responseCount);
        return FeedbackRelationshipAverageResponse.builder()
                .relationshipType(relationshipType.name())
                .label(label)
                .averageScore(averageScore)
                .responseCount(responseCount)
                .build();
    }

    private List<FeedbackConfidenceBreakdownResponse> buildConfidenceBreakdown(List<FeedbackSummary> summaries) {
        return List.of(
                confidenceBreakdownResponse("HIGH", "High confidence", summaries),
                confidenceBreakdownResponse("MEDIUM", "Medium confidence", summaries),
                confidenceBreakdownResponse("LOW", "Low confidence", summaries),
                confidenceBreakdownResponse("INSUFFICIENT", "Insufficient feedback", summaries)
        );
    }

    private FeedbackConfidenceBreakdownResponse confidenceBreakdownResponse(
            String level,
            String label,
            List<FeedbackSummary> summaries
    ) {
        long count = summaries.stream()
                .filter(summary -> normalizedConfidenceLevel(summary).equals(level))
                .count();
        return FeedbackConfidenceBreakdownResponse.builder()
                .level(level)
                .label(label)
                .count(count)
                .build();
    }

    private String normalizedConfidenceLevel(FeedbackSummary summary) {
        if (summary == null || Boolean.TRUE.equals(summary.getInsufficientFeedback())) {
            return "INSUFFICIENT";
        }
        String level = summary.getConfidenceLevel();
        if (level == null || level.isBlank()) {
            return "INSUFFICIENT";
        }
        String normalized = level.trim().toUpperCase();
        return switch (normalized) {
            case "HIGH", "MEDIUM", "LOW" -> normalized;
            default -> "INSUFFICIENT";
        };
    }


    private boolean isScoredAssignmentQuestion(FeedbackAssignmentQuestion question) {
        return feedback360ScoringService.isScoredQuestion(question);
    }

    private String normalizeCompetencyCode(String competencyCode) {
        return feedback360ScoringService.normalizeCompetencyCode(competencyCode);
    }

    private String resolveCompetencyName(FeedbackAssignmentQuestion question, String competencyCode) {
        return feedback360ScoringService.resolveCompetencyName(question, competencyCode);
    }

    private String questionKey(FeedbackAssignmentQuestion question) {
        return feedback360ScoringService.questionKey(question);
    }

    private void refreshClosedCampaignSummariesForEmployee(Long employeeId) {
        refreshClosedCampaignSummariesForEmployees(List.of(employeeId));
    }

    private void refreshClosedCampaignSummariesForEmployees(List<Long> employeeIds) {
        if (employeeIds == null || employeeIds.isEmpty()) {
            return;
        }
        List<FeedbackCampaign> closedCampaigns = feedbackCampaignRepository.findAllByOrderByStartDateDesc().stream()
                .filter(campaign -> campaign.getStatus() == FeedbackCampaignStatus.CLOSED
                        || campaign.getStatus() == FeedbackCampaignStatus.PUBLISHED)
                .toList();
        for (FeedbackCampaign campaign : closedCampaigns) {
            feedbackSummaryCalculationService.refreshCampaignSummaryForTargetEmployees(campaign, employeeIds);
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
        return feedbackSummaryCalculationService.refreshCampaignSummary(campaign);
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
                .filter(this::isSummaryReadyForPublish)
                .toList();
    }

    private String normalizedPublishScope(FeedbackSummaryPublishRequest request) {
        if (request == null || request.getScope() == null || request.getScope().isBlank()) {
            return "ALL_READY";
        }
        String scope = request.getScope().trim().toUpperCase();
        return "SELECTED_EMPLOYEES".equals(scope) ? "SELECTED_EMPLOYEES" : "ALL_READY";
    }

    private boolean isSummaryReadyForPublish(FeedbackSummary summary) {
        return safeLong(summary.getTotalResponses()) > 0
                && !Boolean.TRUE.equals(summary.getInsufficientFeedback());
    }

    private String buildPublishNote(FeedbackSummaryPublishRequest request) {
        List<String> included = new ArrayList<>();
        if (includeOverallScoreOption(request)) {
            included.add("overall score");
        }
        if (includeCompetencyBreakdownOption(request)) {
            included.add("competency breakdown");
        }
        if (includeSelfVsOthersOption(request)) {
            included.add("self vs others comparison");
        }
        if (includeCommentsOption(request)) {
            included.add("anonymous comments where confidentiality allows");
        }
        if (includeScoreExplanationOption(request)) {
            included.add("score explanation");
        }
        String includedText = included.isEmpty() ? "no optional result sections selected" : String.join(", ", included);
        return "Published by HR/Admin after campaign close. Included: " + includedText + ".";
    }

    private void applyPublishOptions(FeedbackSummary summary, FeedbackSummaryPublishRequest request) {
        summary.setIncludeOverallScore(includeOverallScoreOption(request));
        summary.setIncludeCompetencyBreakdown(includeCompetencyBreakdownOption(request));
        summary.setIncludeSelfVsOthers(includeSelfVsOthersOption(request));
        summary.setIncludeComments(includeCommentsOption(request));
        summary.setIncludeScoreExplanation(includeScoreExplanationOption(request));
    }

    private boolean includeOverallScoreOption(FeedbackSummaryPublishRequest request) {
        return request == null || !Boolean.FALSE.equals(request.getIncludeOverallScore());
    }

    private boolean includeCompetencyBreakdownOption(FeedbackSummaryPublishRequest request) {
        return request == null || !Boolean.FALSE.equals(request.getIncludeCompetencyBreakdown());
    }

    private boolean includeSelfVsOthersOption(FeedbackSummaryPublishRequest request) {
        return request == null || !Boolean.FALSE.equals(request.getIncludeSelfVsOthers());
    }

    private boolean includeCommentsOption(FeedbackSummaryPublishRequest request) {
        return request != null && Boolean.TRUE.equals(request.getIncludeComments());
    }

    private boolean includeScoreExplanationOption(FeedbackSummaryPublishRequest request) {
        return request == null || !Boolean.FALSE.equals(request.getIncludeScoreExplanation());
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
        return (summary.getCampaign().getStatus() == FeedbackCampaignStatus.CLOSED
                || summary.getCampaign().getStatus() == FeedbackCampaignStatus.PUBLISHED)
                && summary.getVisibilityStatus() == FeedbackSummaryVisibilityStatus.PUBLISHED;
    }

    private FeedbackSummaryVisibilityStatus campaignVisibilityStatus(List<FeedbackSummary> summaries) {
        if (summaries.stream().anyMatch(summary -> summary.getVisibilityStatus() == FeedbackSummaryVisibilityStatus.PUBLISHED)) {
            return FeedbackSummaryVisibilityStatus.PUBLISHED;
        }
        if (summaries.stream().anyMatch(summary -> summary.getVisibilityStatus() == FeedbackSummaryVisibilityStatus.READY_TO_PUBLISH)) {
            return FeedbackSummaryVisibilityStatus.READY_TO_PUBLISH;
        }
        return FeedbackSummaryVisibilityStatus.HIDDEN;
    }

    private LocalDateTime campaignPublishedAt(List<FeedbackSummary> summaries) {
        return summaries.stream()
                .map(FeedbackSummary::getPublishedAt)
                .filter(Objects::nonNull)
                .max(LocalDateTime::compareTo)
                .orElse(null);
    }

    private Long campaignPublishedByUserId(List<FeedbackSummary> summaries) {
        return summaries.stream()
                .filter(summary -> summary.getPublishedAt() != null)
                .max(Comparator.comparing(FeedbackSummary::getPublishedAt))
                .map(FeedbackSummary::getPublishedByUserId)
                .orElse(null);
    }

    private String campaignPublishNote(List<FeedbackSummary> summaries) {
        return summaries.stream()
                .filter(summary -> summary.getPublishedAt() != null)
                .max(Comparator.comparing(FeedbackSummary::getPublishedAt))
                .map(FeedbackSummary::getPublishNote)
                .orElse(null);
    }

    private String visibilityStatusName(FeedbackSummary summary) {
        return summary.getVisibilityStatus() == null
                ? FeedbackSummaryVisibilityStatus.HIDDEN.name()
                : summary.getVisibilityStatus().name();
    }

    private Double visibleRelationshipAverage(
            FeedbackSummary summary,
            FeedbackRelationshipType relationshipType,
            boolean protectRelationshipBreakdown
    ) {
        if (!protectRelationshipBreakdown || !FeedbackPrivacyUtil.requiresGroupThreshold(relationshipType)) {
            return relationshipAverage(summary, relationshipType);
        }
        long responses = relationshipResponseCount(summary, relationshipType);
        return FeedbackPrivacyUtil.hasEnoughProtectedResponses(relationshipType, responses)
                ? relationshipAverage(summary, relationshipType)
                : null;
    }

    private String visibleScoreCalculationNote(FeedbackSummary summary, boolean protectRelationshipBreakdown) {
        String baseNote = summary.getScoreCalculationNote();
        if (!protectRelationshipBreakdown) {
            return baseNote;
        }

        List<String> hiddenNotes = new ArrayList<>();
        if (relationshipResponseCount(summary, FeedbackRelationshipType.PEER) > 0
                && !FeedbackPrivacyUtil.hasEnoughProtectedResponses(FeedbackRelationshipType.PEER, safeLong(summary.getPeerResponses()))) {
            hiddenNotes.add(FeedbackPrivacyUtil.protectedRelationshipThresholdMessage(FeedbackRelationshipType.PEER));
        }
        if (relationshipResponseCount(summary, FeedbackRelationshipType.SUBORDINATE) > 0
                && !FeedbackPrivacyUtil.hasEnoughProtectedResponses(FeedbackRelationshipType.SUBORDINATE, safeLong(summary.getSubordinateResponses()))) {
            hiddenNotes.add(FeedbackPrivacyUtil.protectedRelationshipThresholdMessage(FeedbackRelationshipType.SUBORDINATE));
        }
        if (hiddenNotes.isEmpty()) {
            return baseNote;
        }
        String privacyNote = String.join(" ", hiddenNotes);
        return baseNote == null || baseNote.isBlank() ? privacyNote : baseNote + " " + privacyNote;
    }

    private Double relationshipAverage(FeedbackSummary summary, FeedbackRelationshipType relationshipType) {
        return switch (relationshipType) {
            case MANAGER -> summary.getManagerAverageScore();
            case PEER -> summary.getPeerAverageScore();
            case SUBORDINATE -> summary.getSubordinateAverageScore();
            case SELF -> summary.getSelfAverageScore();
        };
    }

    private long relationshipResponseCount(FeedbackSummary summary, FeedbackRelationshipType relationshipType) {
        return switch (relationshipType) {
            case MANAGER -> safeLong(summary.getManagerResponses());
            case PEER -> safeLong(summary.getPeerResponses());
            case SUBORDINATE -> safeLong(summary.getSubordinateResponses());
            case SELF -> safeLong(summary.getSelfResponses());
        };
    }


    private boolean includeOverallScore(FeedbackSummary summary) {
        return summary == null || !Boolean.FALSE.equals(summary.getIncludeOverallScore());
    }

    private boolean includeCompetencyBreakdown(FeedbackSummary summary) {
        return summary == null || !Boolean.FALSE.equals(summary.getIncludeCompetencyBreakdown());
    }

    private boolean includeSelfVsOthers(FeedbackSummary summary) {
        return summary == null || !Boolean.FALSE.equals(summary.getIncludeSelfVsOthers());
    }

    private boolean includeComments(FeedbackSummary summary) {
        return summary != null && Boolean.TRUE.equals(summary.getIncludeComments());
    }

    private boolean includeScoreExplanation(FeedbackSummary summary) {
        return summary == null || !Boolean.FALSE.equals(summary.getIncludeScoreExplanation());
    }


    private Map<String, List<FeedbackResponse>> loadSubmittedResponsesBySummaryKey(List<FeedbackSummary> summaries) {
        if (summaries == null || summaries.isEmpty()) {
            return Map.of();
        }

        Map<String, List<FeedbackResponse>> responsesBySummaryKey = new LinkedHashMap<>();
        List<Long> campaignIds = summaries.stream()
                .map(FeedbackSummary::getCampaign)
                .filter(Objects::nonNull)
                .map(FeedbackCampaign::getId)
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        for (Long campaignId : campaignIds) {
            List<FeedbackResponse> responses = feedbackResponseRepository.findByCampaignIdAndStatusWithItems(campaignId, ResponseStatus.SUBMITTED);
            for (FeedbackResponse response : responses) {
                FeedbackEvaluatorAssignment assignment = response == null ? null : response.getEvaluatorAssignment();
                FeedbackRequest request = assignment == null ? null : assignment.getFeedbackRequest();
                Long targetEmployeeId = request == null ? null : request.getTargetEmployeeId();
                if (targetEmployeeId == null) {
                    continue;
                }
                responsesBySummaryKey.computeIfAbsent(summaryKey(campaignId, targetEmployeeId), ignored -> new ArrayList<>())
                        .add(response);
            }
        }
        return responsesBySummaryKey;
    }

    private String summaryKey(FeedbackSummary summary) {
        Long campaignId = summary == null || summary.getCampaign() == null ? null : summary.getCampaign().getId();
        Long targetEmployeeId = summary == null ? null : summary.getTargetEmployeeId();
        return summaryKey(campaignId, targetEmployeeId);
    }

    private String summaryKey(Long campaignId, Long targetEmployeeId) {
        return String.valueOf(campaignId) + ":" + String.valueOf(targetEmployeeId);
    }

    private List<FeedbackRelationshipPrivacyResponse> buildRelationshipPrivacy(
            FeedbackSummary summary,
            boolean protectRelationshipBreakdown
    ) {
        return List.of(
                relationshipPrivacy(summary, FeedbackRelationshipType.SELF, protectRelationshipBreakdown),
                relationshipPrivacy(summary, FeedbackRelationshipType.MANAGER, protectRelationshipBreakdown),
                relationshipPrivacy(summary, FeedbackRelationshipType.PEER, protectRelationshipBreakdown),
                relationshipPrivacy(summary, FeedbackRelationshipType.SUBORDINATE, protectRelationshipBreakdown)
        );
    }

    private FeedbackRelationshipPrivacyResponse relationshipPrivacy(
            FeedbackSummary summary,
            FeedbackRelationshipType relationshipType,
            boolean protectRelationshipBreakdown
    ) {
        long responseCount = relationshipResponseCount(summary, relationshipType);
        boolean thresholdRequired = FeedbackPrivacyUtil.requiresGroupThreshold(relationshipType);
        int minimumVisibleResponses = thresholdRequired ? FeedbackPrivacyUtil.MIN_PROTECTED_RELATIONSHIP_RESPONSES : 1;
        boolean thresholdMet = FeedbackPrivacyUtil.hasEnoughProtectedResponses(relationshipType, responseCount);
        boolean visibleOutsideHr = !protectRelationshipBreakdown || thresholdMet;
        String hiddenReason = visibleOutsideHr ? null : FeedbackPrivacyUtil.protectedRelationshipThresholdMessage(relationshipType);
        return FeedbackRelationshipPrivacyResponse.builder()
                .relationshipType(relationshipType.name())
                .label(relationshipDisplayLabel(relationshipType))
                .responseCount(responseCount)
                .minimumVisibleResponses(minimumVisibleResponses)
                .thresholdRequired(thresholdRequired)
                .thresholdMet(thresholdMet)
                .visibleOutsideHr(visibleOutsideHr)
                .hiddenReason(hiddenReason)
                .build();
    }

    private List<FeedbackCompetencyResultResponse> buildEmployeeCompetencyBreakdown(
            FeedbackSummary summary,
            List<FeedbackResponse> submittedResponses,
            boolean protectRelationshipBreakdown
    ) {
        if (submittedResponses == null || submittedResponses.isEmpty()) {
            return List.of();
        }

        Map<String, CompetencyResultAggregate> aggregates = new LinkedHashMap<>();
        for (FeedbackResponse response : submittedResponses) {
            FeedbackEvaluatorAssignment assignment = response.getEvaluatorAssignment();
            FeedbackRelationshipType relationshipType = assignment == null ? null : assignment.getRelationshipType();
            if (relationshipType == null || response.getItems() == null) {
                continue;
            }

            boolean relationshipVisible = isRelationshipDetailVisible(summary, relationshipType, protectRelationshipBreakdown);
            String relationshipHiddenReason = relationshipVisible ? null : FeedbackPrivacyUtil.protectedRelationshipThresholdMessage(relationshipType);

            for (FeedbackResponseItem item : response.getItems()) {
                if (item == null || item.getRatingValue() == null) {
                    continue;
                }
                FeedbackAssignmentQuestion question = item.getAssignmentQuestion();
                if (question == null || !isScoredAssignmentQuestion(question)) {
                    continue;
                }
                String competencyCode = normalizeCompetencyCode(question.getCompetencyCode());
                String competencyName = resolveCompetencyName(question, competencyCode);
                CompetencyResultAggregate aggregate = aggregates.computeIfAbsent(
                        competencyCode,
                        ignored -> new CompetencyResultAggregate(competencyCode, competencyName)
                );
                aggregate.addQuestion(questionKey(question));
                aggregate.addRelationshipScore(
                        relationshipType,
                        feedback360ScoringService.normalizeQuestionScore(item.getRatingValue(), question),
                        relationshipVisible,
                        relationshipHiddenReason
                );
            }
        }

        return aggregates.values().stream()
                .map(CompetencyResultAggregate::toResponse)
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(FeedbackCompetencyResultResponse::getCompetencyName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private boolean isRelationshipDetailVisible(
            FeedbackSummary summary,
            FeedbackRelationshipType relationshipType,
            boolean protectRelationshipBreakdown
    ) {
        return !protectRelationshipBreakdown
                || FeedbackPrivacyUtil.hasEnoughProtectedResponses(relationshipType, relationshipResponseCount(summary, relationshipType));
    }

    private List<FeedbackPublishedCommentResponse> buildPublishedComments(
            FeedbackSummary summary,
            List<FeedbackResponse> submittedResponses,
            boolean protectRelationshipBreakdown
    ) {
        if (submittedResponses == null || submittedResponses.isEmpty()) {
            return List.of();
        }

        List<FeedbackPublishedCommentResponse> comments = new ArrayList<>();
        for (FeedbackResponse response : submittedResponses) {
            FeedbackEvaluatorAssignment assignment = response == null ? null : response.getEvaluatorAssignment();
            FeedbackRelationshipType relationshipType = assignment == null ? null : assignment.getRelationshipType();
            if (relationshipType == null || response.getItems() == null) {
                continue;
            }
            if (!isRelationshipDetailVisible(summary, relationshipType, protectRelationshipBreakdown)) {
                continue;
            }

            for (FeedbackResponseItem item : response.getItems()) {
                String comment = normalizeComment(item == null ? null : item.getComment());
                if (comment == null) {
                    continue;
                }
                FeedbackAssignmentQuestion question = item.getAssignmentQuestion();
                if (question == null) {
                    continue;
                }

                String competencyCode = normalizeCompetencyCode(question.getCompetencyCode());
                comments.add(FeedbackPublishedCommentResponse.builder()
                        .relationshipType(relationshipType.name())
                        .label(relationshipDisplayLabel(relationshipType))
                        .competencyCode(competencyCode)
                        .competencyName(resolveCompetencyName(question, competencyCode))
                        .questionCode(resolveQuestionCode(question))
                        .questionText(resolveQuestionText(question))
                        .comment(comment)
                        .build());
            }

            String overallComment = normalizeComment(response.getComments());
            if (overallComment != null) {
                comments.add(FeedbackPublishedCommentResponse.builder()
                        .relationshipType(relationshipType.name())
                        .label(relationshipDisplayLabel(relationshipType))
                        .competencyCode("OVERALL")
                        .competencyName("Overall feedback")
                        .questionCode("OVERALL_COMMENT")
                        .questionText("Overall feedback")
                        .comment(overallComment)
                        .build());
            }
        }

        return comments.stream()
                .sorted(Comparator
                        .comparing((FeedbackPublishedCommentResponse comment) -> relationshipSortOrder(comment.getRelationshipType()))
                        .thenComparing(comment -> safeText(comment.getCompetencyName()), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(comment -> safeText(comment.getQuestionCode()), String.CASE_INSENSITIVE_ORDER)
                        .thenComparing(comment -> safeText(comment.getComment()), String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private String normalizeComment(String comment) {
        if (comment == null) {
            return null;
        }
        String normalized = comment.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String resolveQuestionCode(FeedbackAssignmentQuestion question) {
        if (question == null) {
            return "QUESTION";
        }
        if (question.getQuestionCode() != null && !question.getQuestionCode().isBlank()) {
            return question.getQuestionCode().trim();
        }
        return question.getId() == null ? "QUESTION" : "QUESTION_" + question.getId();
    }

    private String resolveQuestionText(FeedbackAssignmentQuestion question) {
        if (question == null) {
            return "Feedback question";
        }
        if (question.getQuestionTextSnapshot() != null && !question.getQuestionTextSnapshot().isBlank()) {
            return question.getQuestionTextSnapshot().trim();
        }
        return "Feedback question";
    }

    private int relationshipSortOrder(String relationshipType) {
        if (relationshipType == null) {
            return 99;
        }
        return switch (relationshipType.trim().toUpperCase()) {
            case "SELF" -> 1;
            case "MANAGER" -> 2;
            case "PEER" -> 3;
            case "SUBORDINATE" -> 4;
            default -> 99;
        };
    }

    private String safeText(String value) {
        return value == null ? "" : value.trim();
    }

    private List<FeedbackResultItemResponse> mapResults(List<FeedbackSummary> summaries, Map<Long, String> employeeNames, boolean protectRelationshipBreakdown) {
        Map<String, List<FeedbackResponse>> submittedResponsesBySummaryKey = loadSubmittedResponsesBySummaryKey(summaries);
        return summaries.stream()
                .map(summary -> {
                    boolean showOverallScore = !protectRelationshipBreakdown || includeOverallScore(summary);
                    boolean showSelfVsOthers = !protectRelationshipBreakdown || includeSelfVsOthers(summary);
                    boolean showScoreExplanation = !protectRelationshipBreakdown || includeScoreExplanation(summary);
                    boolean showCompetencyBreakdown = !protectRelationshipBreakdown || includeCompetencyBreakdown(summary);
                    boolean showComments = !protectRelationshipBreakdown || includeComments(summary);

                    List<FeedbackResponse> submittedResponses = submittedResponsesBySummaryKey.getOrDefault(summaryKey(summary), List.of());
                    Double visibleAverageScore = showOverallScore ? summary.getAverageScore() : null;
                    return FeedbackResultItemResponse.builder()
                            .campaignId(summary.getCampaign().getId())
                            .campaignName(summary.getCampaign().getName())
                            .targetEmployeeId(summary.getTargetEmployeeId())
                            .targetEmployeeName(employeeNames.getOrDefault(
                                    summary.getTargetEmployeeId(),
                                    "Employee #" + summary.getTargetEmployeeId()
                            ))
                            .averageScore(visibleAverageScore)
                            .rawAverageScore(showOverallScore ? summary.getRawAverageScore() : null)
                            .scoreCategory(showOverallScore ? FeedbackScoreUtil.category(summary.getAverageScore()) : null)
                            .totalResponses(safeLong(summary.getTotalResponses()))
                            .managerResponses(safeLong(summary.getManagerResponses()))
                            .peerResponses(safeLong(summary.getPeerResponses()))
                            .subordinateResponses(safeLong(summary.getSubordinateResponses()))
                            .selfResponses(safeLong(summary.getSelfResponses()))
                            .assignedEvaluatorCount(safeLong(summary.getAssignedEvaluatorCount()))
                            .submittedEvaluatorCount(safeLong(summary.getSubmittedEvaluatorCount()))
                            .pendingEvaluatorCount(safeLong(summary.getPendingEvaluatorCount()))
                            .completionRate(safeDouble(summary.getCompletionRate()))
                            .confidenceLevel(summary.getConfidenceLevel())
                            .insufficientFeedback(Boolean.TRUE.equals(summary.getInsufficientFeedback()))
                            .managerAverageScore(showSelfVsOthers ? visibleRelationshipAverage(summary, FeedbackRelationshipType.MANAGER, protectRelationshipBreakdown) : null)
                            .peerAverageScore(showSelfVsOthers ? visibleRelationshipAverage(summary, FeedbackRelationshipType.PEER, protectRelationshipBreakdown) : null)
                            .subordinateAverageScore(showSelfVsOthers ? visibleRelationshipAverage(summary, FeedbackRelationshipType.SUBORDINATE, protectRelationshipBreakdown) : null)
                            .selfAverageScore(showSelfVsOthers ? visibleRelationshipAverage(summary, FeedbackRelationshipType.SELF, protectRelationshipBreakdown) : null)
                            .scoreCalculationMethod(showScoreExplanation ? summary.getScoreCalculationMethod() : null)
                            .scoreCalculationNote(showScoreExplanation ? visibleScoreCalculationNote(summary, protectRelationshipBreakdown) : null)
                            .visibilityStatus(visibilityStatusName(summary))
                            .publishedAt(summary.getPublishedAt())
                            .publishedByUserId(summary.getPublishedByUserId())
                            .publishNote(summary.getPublishNote())
                            .includeOverallScore(includeOverallScore(summary))
                            .includeCompetencyBreakdown(includeCompetencyBreakdown(summary))
                            .includeSelfVsOthers(includeSelfVsOthers(summary))
                            .includeComments(includeComments(summary))
                            .includeScoreExplanation(includeScoreExplanation(summary))
                            .relationshipPrivacy(buildRelationshipPrivacy(summary, protectRelationshipBreakdown))
                            .competencyBreakdown(showCompetencyBreakdown
                                    ? buildEmployeeCompetencyBreakdown(summary, submittedResponses, protectRelationshipBreakdown)
                                    : List.of())
                            .comments(showComments
                                    ? buildPublishedComments(summary, submittedResponses, protectRelationshipBreakdown)
                                    : List.of())
                            .summarizedAt(summary.getSummarizedAt())
                            .build();
                })
                .toList();
    }

    private FeedbackIntegrationScoreResponse mapIntegrationScore(FeedbackSummary summary, Map<Long, String> employeeNames) {
        return FeedbackIntegrationScoreResponse.builder()
                .campaignId(summary.getCampaign().getId())
                .campaignName(summary.getCampaign().getName())
                .campaignStatus(summary.getCampaign().getStatus().name())
                .targetEmployeeId(summary.getTargetEmployeeId())
                .targetEmployeeName(employeeNames.getOrDefault(summary.getTargetEmployeeId(), "Employee #" + summary.getTargetEmployeeId()))
                .feedbackScore(summary.getAverageScore())
                .rawFeedbackScore(summary.getRawAverageScore())
                .scoreBand(FeedbackScoreUtil.category(summary.getAverageScore()))
                .assignedEvaluatorCount(safeLong(summary.getAssignedEvaluatorCount()))
                .submittedEvaluatorCount(safeLong(summary.getSubmittedEvaluatorCount()))
                .pendingEvaluatorCount(safeLong(summary.getPendingEvaluatorCount()))
                .completionRate(safeDouble(summary.getCompletionRate()))
                .confidenceLevel(summary.getConfidenceLevel())
                .insufficientFeedback(Boolean.TRUE.equals(summary.getInsufficientFeedback()))
                .managerAverageScore(summary.getManagerAverageScore())
                .peerAverageScore(summary.getPeerAverageScore())
                .subordinateAverageScore(summary.getSubordinateAverageScore())
                .selfAverageScore(summary.getSelfAverageScore())
                .managerResponses(safeLong(summary.getManagerResponses()))
                .peerResponses(safeLong(summary.getPeerResponses()))
                .subordinateResponses(safeLong(summary.getSubordinateResponses()))
                .selfResponses(safeLong(summary.getSelfResponses()))
                .scoreCalculationMethod(summary.getScoreCalculationMethod())
                .scoreCalculationNote(summary.getScoreCalculationNote())
                .visibilityStatus(visibilityStatusName(summary))
                .publishedAt(summary.getPublishedAt())
                .publishedByUserId(summary.getPublishedByUserId())
                .publishNote(summary.getPublishNote())
                .summarizedAt(summary.getSummarizedAt())
                .build();
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

    private double safeDouble(Double value) {
        return value == null ? 0.0 : value;
    }

    private double roundToTwoDecimals(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String relationshipDisplayLabel(FeedbackRelationshipType relationshipType) {
        if (relationshipType == null) {
            return "Reviewer";
        }
        return switch (relationshipType) {
            case SELF -> "Self review";
            case MANAGER -> "Manager reviewer";
            case PEER -> "Peer reviewer";
            case SUBORDINATE -> "Subordinate reviewer";
        };
    }

    private final class CompetencyResultAggregate {
        private final String competencyCode;
        private final String competencyName;
        private final Set<String> questionKeys = new HashSet<>();
        private final Map<FeedbackRelationshipType, RelationshipScoreAggregate> relationships = new EnumMap<>(FeedbackRelationshipType.class);
        private double visibleScoreTotal = 0.0;
        private long visibleResponseCount = 0L;

        private CompetencyResultAggregate(String competencyCode, String competencyName) {
            this.competencyCode = competencyCode;
            this.competencyName = competencyName;
        }

        private void addQuestion(String questionKey) {
            if (questionKey != null && !questionKey.isBlank()) {
                questionKeys.add(questionKey);
            }
        }

        private void addRelationshipScore(
                FeedbackRelationshipType relationshipType,
                double score,
                boolean visibleOutsideHr,
                String hiddenReason
        ) {
            RelationshipScoreAggregate relationship = relationships.computeIfAbsent(
                    relationshipType,
                    ignored -> new RelationshipScoreAggregate(relationshipType)
            );
            relationship.addScore(score, visibleOutsideHr, hiddenReason);
            if (visibleOutsideHr) {
                visibleScoreTotal += score;
                visibleResponseCount++;
            }
        }

        private FeedbackCompetencyResultResponse toResponse() {
            List<FeedbackRelationshipScoreResponse> relationshipBreakdown = relationships.values().stream()
                    .map(RelationshipScoreAggregate::toResponse)
                    .sorted(Comparator.comparing(FeedbackRelationshipScoreResponse::getRelationshipType))
                    .toList();
            if (relationshipBreakdown.isEmpty()) {
                return null;
            }
            return FeedbackCompetencyResultResponse.builder()
                    .competencyCode(competencyCode)
                    .competencyName(competencyName)
                    .averageScore(visibleResponseCount == 0 ? null : roundToTwoDecimals(visibleScoreTotal / visibleResponseCount))
                    .responseCount(visibleResponseCount)
                    .questionCount((long) questionKeys.size())
                    .relationshipBreakdown(relationshipBreakdown)
                    .build();
        }
    }

    private final class RelationshipScoreAggregate {
        private final FeedbackRelationshipType relationshipType;
        private double scoreTotal = 0.0;
        private long responseCount = 0L;
        private boolean visibleOutsideHr = true;
        private String hiddenReason;

        private RelationshipScoreAggregate(FeedbackRelationshipType relationshipType) {
            this.relationshipType = relationshipType;
        }

        private void addScore(double score, boolean visibleOutsideHr, String hiddenReason) {
            responseCount++;
            if (visibleOutsideHr) {
                scoreTotal += score;
            } else {
                this.visibleOutsideHr = false;
                this.hiddenReason = hiddenReason;
            }
        }

        private FeedbackRelationshipScoreResponse toResponse() {
            return FeedbackRelationshipScoreResponse.builder()
                    .relationshipType(relationshipType.name())
                    .label(relationshipDisplayLabel(relationshipType))
                    .averageScore(visibleOutsideHr && responseCount > 0 ? roundToTwoDecimals(scoreTotal / responseCount) : null)
                    .responseCount(responseCount)
                    .visibleOutsideHr(visibleOutsideHr)
                    .hiddenReason(visibleOutsideHr ? null : hiddenReason)
                    .build();
        }
    }


}
