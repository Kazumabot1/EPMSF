package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignSummaryResponse;
import com.epms.dto.FeedbackIntegrationScoreResponse;
import com.epms.dto.FeedbackMyResultResponse;
import com.epms.dto.FeedbackResultItemResponse;
import com.epms.dto.FeedbackTeamSummaryResponse;
import com.epms.dto.FeedbackSummaryPublishRequest;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackCampaignRelationshipWeight;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackSummary;
import com.epms.entity.Team;
import com.epms.entity.User;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import com.epms.entity.enums.ResponseStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRelationshipWeightRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.FeedbackResponseRepository;
import com.epms.repository.FeedbackSummaryRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackOperationalService;
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

    private static final String SCORE_METHOD = "RELATIONSHIP_WEIGHTED_SUBMITTED_RESPONSE_AVERAGE";
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackCampaignRelationshipWeightRepository relationshipWeightRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final FeedbackEvaluatorAssignmentRepository feedbackEvaluatorAssignmentRepository;
    private final FeedbackResponseRepository feedbackResponseRepository;
    private final FeedbackSummaryRepository feedbackSummaryRepository;
    private final TeamRepository teamRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final FeedbackOperationalService feedbackOperationalService;
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
            summary.setPublishNote("Unpublished by HR or HR Admin.");
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

        managedTeams.forEach(team -> {
            if (team.getTeamMembers() == null) {
                return;
            }
            team.getTeamMembers().stream()
                    .filter(member -> member.getEndedDate() == null)
                    .map(member -> member.getMemberUser())
                    .filter(Objects::nonNull)
                    .filter(user -> user.getActive() == null || Boolean.TRUE.equals(user.getActive()))
                    .filter(user -> !Objects.equals(user.getId(), managerUserId))
                    .map(User::getEmployeeId)
                    .filter(Objects::nonNull)
                    .map(Integer::longValue)
                    .forEach(employeeIdSet::add);
        });

        List<Long> employeeIds = employeeIdSet.stream()
                .sorted()
                .toList();

        if (employeeIds.isEmpty()) {
            return FeedbackTeamSummaryResponse.builder()
                    .managerUserId(userId)
                    .ownerUserId(userId)
                    .viewScope("MANAGER_DIRECT_REPORTS")
                    .totalDirectReports(0)
                    .totalDepartmentEmployees(0)
                    .totalManagedTeams(managedTeamCount)
                    .totalClosedResults(0)
                    .accessTitle("Managed employee published 360 summary")
                    .accessDescription("Managers can view published 360 results for employees in their 360 work-context scope: active team members, or department employees when no team exists.")
                    .privacyNotice("Only privacy-safe published summaries are shown. Anonymous peer and subordinate detail remains masked when confidentiality thresholds are not met.")
                    .emptyStateMessage("No managed-employee 360 results are available yet. This view uses active teams and department work context.")
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
                .viewScope("MANAGER_DIRECT_REPORTS")
                .totalDirectReports(employeeIds.size())
                .totalDepartmentEmployees(0)
                .totalManagedTeams(managedTeamCount)
                .totalClosedResults(summaries.size())
                .accessTitle("Managed employee published 360 summary")
                .accessDescription("Managers can view published 360 results for employees in their 360 work-context scope. If one manager handles multiple teams, all active team members are included once.")
                .privacyNotice("Only privacy-safe published summaries are shown. Anonymous peer and subordinate detail remains masked when confidentiality thresholds are not met.")
                .emptyStateMessage("No published managed-employee 360 results are available yet.")
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
                .privacyNotice("Department Head access is a department-level view. It does not create a separate evaluator relationship, and it is based on department scope plus the 360 work-context resolver.")
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
                || normalized.equals("TEAM_MANAGER");
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
            applySummaryValues(summary, campaign, targetEmployeeId, countedAssignments, responses, now);
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

    private void applySummaryValues(
            FeedbackSummary summary,
            FeedbackCampaign campaign,
            Long targetEmployeeId,
            List<FeedbackEvaluatorAssignment> assignments,
            List<FeedbackResponse> responses,
            LocalDateTime summarizedAt
    ) {
        long assignedCount = assignments.size();
        long submittedCount = responses.size();
        long pendingCount = Math.max(0, assignedCount - submittedCount);
        double completionRate = assignedCount == 0 ? 0.0 : roundToTwoDecimals((submittedCount * 100.0) / assignedCount);
        Double rawAverage = averageScore(responses);
        Double relationshipWeightedAverage = weightedScoreByRelationship(campaign, responses);
        String confidenceLevel = determineConfidenceLevel(assignedCount, submittedCount, completionRate);
        boolean insufficientFeedback = isInsufficientFeedback(assignedCount, submittedCount, responses);

        summary.setCampaign(campaign);
        summary.setTargetEmployeeId(targetEmployeeId);
        summary.setRawAverageScore(rawAverage);
        summary.setAverageScore(relationshipWeightedAverage);
        summary.setTotalResponses(submittedCount);
        summary.setManagerResponses(countByRelationship(responses, FeedbackRelationshipType.MANAGER));
        summary.setPeerResponses(countByRelationship(responses, FeedbackRelationshipType.PEER));
        summary.setSubordinateResponses(countByRelationship(responses, FeedbackRelationshipType.SUBORDINATE));
        summary.setSelfResponses(countByRelationship(responses, FeedbackRelationshipType.SELF));
        summary.setAssignedEvaluatorCount(assignedCount);
        summary.setSubmittedEvaluatorCount(submittedCount);
        summary.setPendingEvaluatorCount(pendingCount);
        summary.setCompletionRate(completionRate);
        summary.setConfidenceLevel(confidenceLevel);
        summary.setInsufficientFeedback(insufficientFeedback);
        summary.setScoreCalculationMethod(SCORE_METHOD);
        summary.setScoreCalculationNote(buildScoreCalculationNote(campaign, assignedCount, submittedCount, insufficientFeedback));
        summary.setManagerAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.MANAGER));
        summary.setPeerAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.PEER));
        summary.setSubordinateAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.SUBORDINATE));
        summary.setSelfAverageScore(averageScoreByRelationship(responses, FeedbackRelationshipType.SELF));
        summary.setSummarizedAt(summarizedAt);
        applyVisibilityStatusAfterRecalculation(summary, campaign, submittedCount, insufficientFeedback);
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
        return "Published by HR or HR Admin after campaign close. Included: " + includedText + ".";
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

    private void applyVisibilityStatusAfterRecalculation(
            FeedbackSummary summary,
            FeedbackCampaign campaign,
            long submittedCount,
            boolean insufficientFeedback
    ) {
        if (campaign.getStatus() == FeedbackCampaignStatus.CLOSED && submittedCount > 0 && !insufficientFeedback) {
            if (summary.getVisibilityStatus() == FeedbackSummaryVisibilityStatus.PUBLISHED) {
                return;
            }
            summary.setVisibilityStatus(FeedbackSummaryVisibilityStatus.READY_TO_PUBLISH);
            summary.setPublishedAt(null);
            summary.setPublishedByUserId(null);
            summary.setPublishNote(null);
            return;
        }

        summary.setVisibilityStatus(FeedbackSummaryVisibilityStatus.HIDDEN);
        summary.setPublishedAt(null);
        summary.setPublishedByUserId(null);
        summary.setPublishNote(null);
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

    private String buildScoreCalculationNote(FeedbackCampaign campaign, long assignedCount, long submittedCount, boolean insufficientFeedback) {
        if (assignedCount == 0) {
            return "No evaluator assignments exist for this target employee.";
        }
        if (submittedCount == 0) {
            return "No submitted feedback responses are available yet.";
        }
        if (insufficientFeedback) {
            return "Feedback score uses submitted responses and configured evaluator relationship weights, but confidence is low because too few evaluators submitted.";
        }
        if (Boolean.FALSE.equals(campaign.getRedistributeMissingRelationshipWeight())) {
            return "Feedback score applies configured evaluator relationship weights. Unavailable relationship weight is not redistributed.";
        }
        return "Feedback score applies configured evaluator relationship weights and redistributes unavailable relationship weight across available evaluator groups.";
    }

    private boolean isInsufficientFeedback(long assignedCount, long submittedCount, List<FeedbackResponse> responses) {
        if (submittedCount == 0) {
            return true;
        }
        if (assignedCount > 1 && submittedCount < 2) {
            return true;
        }
        return hasSingleProtectedRelationshipResponse(responses, FeedbackRelationshipType.PEER)
                || hasSingleProtectedRelationshipResponse(responses, FeedbackRelationshipType.SUBORDINATE);
    }

    private boolean hasSingleProtectedRelationshipResponse(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        long count = countByRelationship(responses, relationshipType);
        return count > 0 && !FeedbackPrivacyUtil.hasEnoughProtectedResponses(relationshipType, count);
    }

    private String determineConfidenceLevel(long assignedCount, long submittedCount, double completionRate) {
        if (assignedCount == 0 || submittedCount == 0) {
            return "INSUFFICIENT";
        }
        if (submittedCount < 2 || completionRate < 50.0) {
            return "LOW";
        }
        if (completionRate < 100.0 || submittedCount < 3) {
            return "MEDIUM";
        }
        return "HIGH";
    }

    private long countByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .count();
    }

    private Double weightedScoreByRelationship(FeedbackCampaign campaign, List<FeedbackResponse> responses) {
        if (responses == null || responses.isEmpty()) {
            return null;
        }
        Map<FeedbackRelationshipType, Double> averages = new EnumMap<>(FeedbackRelationshipType.class);
        for (FeedbackRelationshipType type : FeedbackRelationshipType.values()) {
            Double average = averageScoreByRelationship(responses, type);
            if (average != null) {
                averages.put(type, average);
            }
        }
        if (averages.isEmpty()) {
            return null;
        }

        Map<FeedbackRelationshipType, Double> weights = relationshipWeights(campaign.getId());
        if (weights.isEmpty()) {
            return averageScore(responses);
        }

        double weightedTotal = 0.0;
        double availableWeight = 0.0;
        double configuredPositiveTotal = weights.values().stream().filter(value -> value > 0).mapToDouble(Double::doubleValue).sum();
        for (Map.Entry<FeedbackRelationshipType, Double> entry : averages.entrySet()) {
            double weight = weights.getOrDefault(entry.getKey(), 0.0);
            if (weight <= 0.0) {
                continue;
            }
            weightedTotal += entry.getValue() * weight;
            availableWeight += weight;
        }
        if (availableWeight <= 0.0) {
            return averageScore(responses);
        }
        double denominator = Boolean.FALSE.equals(campaign.getRedistributeMissingRelationshipWeight())
                ? (configuredPositiveTotal <= 0.0 ? availableWeight : configuredPositiveTotal)
                : availableWeight;
        return roundToTwoDecimals(weightedTotal / denominator);
    }

    private Map<FeedbackRelationshipType, Double> relationshipWeights(Long campaignId) {
        Map<FeedbackRelationshipType, Double> weights = relationshipWeightRepository.findByCampaignIdOrderByRelationshipTypeAsc(campaignId).stream()
                .filter(weight -> weight.getRelationshipType() != null)
                .collect(Collectors.toMap(
                        FeedbackCampaignRelationshipWeight::getRelationshipType,
                        weight -> weight.getWeightPercent() == null ? 0.0 : weight.getWeightPercent().doubleValue(),
                        (first, duplicate) -> duplicate,
                        () -> new EnumMap<>(FeedbackRelationshipType.class)
                ));
        if (!weights.isEmpty()) {
            return weights;
        }
        weights.put(FeedbackRelationshipType.MANAGER, 40.0);
        weights.put(FeedbackRelationshipType.PEER, 30.0);
        weights.put(FeedbackRelationshipType.SUBORDINATE, 20.0);
        weights.put(FeedbackRelationshipType.SELF, 10.0);
        return weights;
    }

    private Double averageScore(List<FeedbackResponse> responses) {
        return responses.stream()
                .map(FeedbackResponse::getOverallScore)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .stream()
                .map(this::roundToTwoDecimals)
                .boxed()
                .findFirst()
                .orElse(null);
    }

    private Double averageScoreByRelationship(List<FeedbackResponse> responses, FeedbackRelationshipType relationshipType) {
        return averageScore(responses.stream()
                .filter(response -> response.getEvaluatorAssignment().getRelationshipType() == relationshipType)
                .toList());
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


    private List<FeedbackResultItemResponse> mapResults(List<FeedbackSummary> summaries, Map<Long, String> employeeNames, boolean protectRelationshipBreakdown) {
        return summaries.stream()
                .map(summary -> FeedbackResultItemResponse.builder()
                        .campaignId(summary.getCampaign().getId())
                        .campaignName(summary.getCampaign().getName())
                        .targetEmployeeId(summary.getTargetEmployeeId())
                        .targetEmployeeName(employeeNames.getOrDefault(
                                summary.getTargetEmployeeId(),
                                "Employee #" + summary.getTargetEmployeeId()
                        ))
                        .averageScore(summary.getAverageScore())
                        .rawAverageScore(summary.getRawAverageScore())
                        .scoreCategory(FeedbackScoreUtil.category(summary.getAverageScore()))
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
                        .managerAverageScore(visibleRelationshipAverage(summary, FeedbackRelationshipType.MANAGER, protectRelationshipBreakdown))
                        .peerAverageScore(visibleRelationshipAverage(summary, FeedbackRelationshipType.PEER, protectRelationshipBreakdown))
                        .subordinateAverageScore(visibleRelationshipAverage(summary, FeedbackRelationshipType.SUBORDINATE, protectRelationshipBreakdown))
                        .selfAverageScore(visibleRelationshipAverage(summary, FeedbackRelationshipType.SELF, protectRelationshipBreakdown))
                        .scoreCalculationMethod(summary.getScoreCalculationMethod())
                        .scoreCalculationNote(visibleScoreCalculationNote(summary, protectRelationshipBreakdown))
                        .visibilityStatus(visibilityStatusName(summary))
                        .publishedAt(summary.getPublishedAt())
                        .publishedByUserId(summary.getPublishedByUserId())
                        .publishNote(summary.getPublishNote())
                        .summarizedAt(summary.getSummarizedAt())
                        .build())
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
}
