package com.epms.service.impl;

import com.epms.dto.ReportingDtos.DepartmentPerformanceRow;
import com.epms.dto.ReportingDtos.EmployeePerformanceRow;
import com.epms.dto.ReportingDtos.FeedbackParticipationRow;
import com.epms.dto.ReportingDtos.KpiPerformanceRow;
import com.epms.dto.ReportingDtos.PipReportRow;
import com.epms.dto.ReportingDtos.RecommendationRow;
import com.epms.dto.ReportingDtos.ReportingAccessResponse;
import com.epms.dto.ReportingDtos.ReportingDashboardResponse;
import com.epms.dto.ReportingDtos.ReportingSummaryResponse;
import com.epms.dto.ReportingDtos.StatusBreakdownRow;
import com.epms.dto.ManagerKpiAssignmentDto;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeAssessment;
import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.Pip;
import com.epms.entity.User;
import com.epms.entity.enums.AssessmentStatus;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeAssessmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.PipRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.EmployeeKpiWorkflowService;
import com.epms.service.ReportingService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Supplier;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class ReportingServiceImpl implements ReportingService {

    private static final List<AssessmentStatus> SUBMITTED_STATUSES = List.of(
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.PENDING_MANAGER,
            AssessmentStatus.PENDING_DEPARTMENT_HEAD,
            AssessmentStatus.PENDING_HR,
            AssessmentStatus.APPROVED,
            AssessmentStatus.DECLINED,
            AssessmentStatus.REJECTED
    );

    private static final List<AssessmentStatus> PENDING_STATUSES = List.of(
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.PENDING_MANAGER,
            AssessmentStatus.PENDING_DEPARTMENT_HEAD,
            AssessmentStatus.PENDING_HR
    );

    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeAssessmentRepository employeeAssessmentRepository;
    private final PipRepository pipRepository;
    private final FeedbackCampaignRepository feedbackCampaignRepository;
    private final FeedbackEvaluatorAssignmentRepository feedbackEvaluatorAssignmentRepository;
    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @Override
    @Transactional(readOnly = false)
    public ReportingDashboardResponse getDashboard() {
        UserPrincipal principal = SecurityUtils.currentUser();
        Set<String> roles = currentUserTargetRoles(principal);

        if (!canViewReports(roles)) {
            throw new UnauthorizedActionException("You do not have permission to view reports.");
        }

        List<Employee> employees = safeList(() -> scopedEmployees(principal, roles));
        List<EmployeeAssessment> assessments = safeList(() -> scopedAssessments(principal, roles));
        List<Pip> pips = safeList(() -> scopedPips(principal, roles));
        List<FeedbackCampaign> campaigns = safeList(feedbackCampaignRepository::findAllByOrderByStartDateDesc);
        List<FeedbackParticipationRow> feedbackRows = safeList(() -> feedbackRows(campaigns, principal, roles));
        List<KpiPerformanceRow> kpiRows = safeList(() -> kpiPerformanceRows(
                employeeKpiWorkflowService.listFinalizedHistoryForCurrentUserScope(),
                employees
        ));

        ReportingAccessResponse access = ReportingAccessResponse.builder()
                .userId(principal.getId())
                .role(primaryRole(roles))
                .departmentId(principal.getDepartmentId())
                .scopeLabel(scopeLabel(principal, roles))
                .canViewAllDepartments(canViewAllDepartments(roles))
                .canExport(Boolean.TRUE)
                .build();

        return ReportingDashboardResponse.builder()
                .access(access)
                .summary(summary(employees, assessments, pips, campaigns, feedbackRows, kpiRows))
                .departmentPerformance(safeList(() -> departmentPerformance(employees, assessments, pips, kpiRows)))
                .employeePerformance(safeList(() -> employeePerformance(assessments)))
                .assessmentStatusBreakdown(safeList(() -> statusBreakdown(assessments)))
                .pipStatusReport(safeList(() -> pipRows(pips)))
                .feedbackParticipation(feedbackRows)
                .promotionRecommendations(safeList(() -> recommendations(assessments)))
                .kpiPerformance(kpiRows)
                .build();
    }

    private ReportingSummaryResponse summary(
            List<Employee> employees,
            List<EmployeeAssessment> assessments,
            List<Pip> pips,
            List<FeedbackCampaign> campaigns,
            List<FeedbackParticipationRow> feedbackRows,
            List<KpiPerformanceRow> kpiRows
    ) {
        long activeEmployees = employees.stream()
                .filter(employee -> employee.getActive() == null || Boolean.TRUE.equals(employee.getActive()))
                .count();

        List<EmployeeAssessment> submittedAssessments = assessments.stream()
                .filter(assessment -> assessment.getStatus() != null)
                .filter(assessment -> SUBMITTED_STATUSES.contains(assessment.getStatus()))
                .toList();

        long approved = assessments.stream()
                .filter(assessment -> AssessmentStatus.APPROVED.equals(assessment.getStatus()))
                .count();

        long pending = assessments.stream()
                .filter(assessment -> assessment.getStatus() != null)
                .filter(assessment -> PENDING_STATUSES.contains(assessment.getStatus()))
                .count();

        double averageScore = submittedAssessments.stream()
                .map(EmployeeAssessment::getScorePercent)
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);

        long activePips = pips.stream()
                .filter(pip -> Boolean.TRUE.equals(pip.getStatus()))
                .count();

        long completedPips = pips.stream()
                .filter(pip -> !Boolean.TRUE.equals(pip.getStatus()))
                .count();

        long activeCampaigns = campaigns.stream()
                .filter(campaign -> campaign.getStatus() != null)
                .filter(campaign -> "ACTIVE".equalsIgnoreCase(campaign.getStatus().name()))
                .count();

        long assignedFeedback = feedbackRows.stream()
                .map(FeedbackParticipationRow::getAssignedCount)
                .filter(Objects::nonNull)
                .mapToLong(Long::longValue)
                .sum();

        long submittedFeedback = feedbackRows.stream()
                .map(FeedbackParticipationRow::getSubmittedCount)
                .filter(Objects::nonNull)
                .mapToLong(Long::longValue)
                .sum();

        long highPerformers = submittedAssessments.stream()
                .filter(assessment -> nullToZero(assessment.getScorePercent()) >= 86.0)
                .count();

        long lowPerformers = submittedAssessments.stream()
                .filter(assessment -> nullToZero(assessment.getScorePercent()) < 60.0)
                .count();

        List<Double> kpiScores = kpiRows.stream()
                .map(this::kpiScoreValue)
                .filter(score -> score > 0.0)
                .toList();

        double averageKpiScore = average(kpiScores);
        long highKpiPerformers = kpiScores.stream()
                .filter(score -> score >= 86.0)
                .count();
        long lowKpiPerformers = kpiScores.stream()
                .filter(score -> score < 60.0)
                .count();

        return ReportingSummaryResponse.builder()
                .totalEmployees((long) employees.size())
                .activeEmployees(activeEmployees)
                .totalAssessments((long) assessments.size())
                .submittedAssessments((long) submittedAssessments.size())
                .approvedAssessments(approved)
                .pendingAssessments(pending)
                .activePips(activePips)
                .completedPips(completedPips)
                .feedbackCampaigns((long) campaigns.size())
                .activeFeedbackCampaigns(activeCampaigns)
                .averageAssessmentScore(round2(averageScore))
                .totalKpiRecords((long) kpiRows.size())
                .finalizedKpiRecords((long) kpiRows.size())
                .averageKpiScore(round2(averageKpiScore))
                .highKpiPerformers(highKpiPerformers)
                .lowKpiPerformers(lowKpiPerformers)
                .overallPerformanceScore(round2(averageAvailable(averageScore, averageKpiScore)))
                .feedbackCompletionRate(percent(submittedFeedback, assignedFeedback))
                .highPerformers(highPerformers)
                .lowPerformers(lowPerformers)
                .build();
    }

    private List<DepartmentPerformanceRow> departmentPerformance(
            List<Employee> employees,
            List<EmployeeAssessment> assessments,
            List<Pip> pips,
            List<KpiPerformanceRow> kpiRows
    ) {
        Map<Integer, String> departmentNames = departmentRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        Department::getId,
                        Department::getDepartmentName,
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));

        Map<Integer, Long> employeeCounts = new LinkedHashMap<>();

        for (Employee employee : employees) {
            Integer departmentId = departmentIdForEmployee(employee);

            if (departmentId != null) {
                employeeCounts.put(departmentId, employeeCounts.getOrDefault(departmentId, 0L) + 1L);
            }
        }

        Map<Integer, List<EmployeeAssessment>> assessmentsByDepartment = assessments.stream()
                .filter(assessment -> assessment.getDepartmentId() != null)
                .collect(Collectors.groupingBy(
                        EmployeeAssessment::getDepartmentId,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        Map<Integer, List<KpiPerformanceRow>> kpisByDepartment = kpiRows.stream()
                .filter(row -> row.getDepartmentId() != null)
                .collect(Collectors.groupingBy(
                        KpiPerformanceRow::getDepartmentId,
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        Map<Integer, Long> activePipCounts = new LinkedHashMap<>();

        for (Pip pip : pips) {
            if (!Boolean.TRUE.equals(pip.getStatus())) {
                continue;
            }

            User user = userById(pip.getEmployeeUserId());

            if (user != null && user.getDepartmentId() != null) {
                activePipCounts.put(
                        user.getDepartmentId(),
                        activePipCounts.getOrDefault(user.getDepartmentId(), 0L) + 1L
                );
            }
        }

        Set<Integer> departmentIds = new LinkedHashSet<>();
        departmentIds.addAll(employeeCounts.keySet());
        departmentIds.addAll(assessmentsByDepartment.keySet());
        departmentIds.addAll(kpisByDepartment.keySet());
        departmentIds.addAll(activePipCounts.keySet());

        return departmentIds.stream()
                .map(departmentId -> {
                    List<EmployeeAssessment> departmentAssessments =
                            assessmentsByDepartment.getOrDefault(departmentId, List.of());
                    List<KpiPerformanceRow> departmentKpis =
                            kpisByDepartment.getOrDefault(departmentId, List.of());

                    long assessmentCount = departmentAssessments.size();

                    long approvedCount = departmentAssessments.stream()
                            .filter(assessment -> AssessmentStatus.APPROVED.equals(assessment.getStatus()))
                            .count();

                    long pendingCount = departmentAssessments.stream()
                            .filter(assessment -> assessment.getStatus() != null)
                            .filter(assessment -> PENDING_STATUSES.contains(assessment.getStatus()))
                            .count();

                    double average = departmentAssessments.stream()
                            .map(EmployeeAssessment::getScorePercent)
                            .filter(Objects::nonNull)
                            .mapToDouble(Double::doubleValue)
                            .average()
                            .orElse(0.0);

                    double kpiAverage = average(departmentKpis.stream()
                            .map(this::kpiScoreValue)
                            .filter(score -> score > 0.0)
                            .toList());
                    double overall = averageAvailable(average, kpiAverage);

                    return DepartmentPerformanceRow.builder()
                            .departmentId(departmentId)
                            .departmentName(departmentNames.getOrDefault(
                                    departmentId,
                                    "Department #" + departmentId
                            ))
                            .employeeCount(employeeCounts.getOrDefault(departmentId, 0L))
                            .assessmentCount(assessmentCount)
                            .approvedCount(approvedCount)
                            .pendingCount(pendingCount)
                            .activePipCount(activePipCounts.getOrDefault(departmentId, 0L))
                            .kpiRecordCount((long) departmentKpis.size())
                            .averageScore(round2(average))
                            .averageKpiScore(round2(kpiAverage))
                            .overallScore(round2(overall))
                            .performanceLabel(labelForScore(overall > 0.0 ? overall : average))
                            .build();
                })
                .sorted(Comparator.comparing(
                        DepartmentPerformanceRow::getOverallScore,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    private List<EmployeePerformanceRow> employeePerformance(List<EmployeeAssessment> assessments) {
        return assessments.stream()
                .filter(assessment -> assessment.getStatus() != null)
                .filter(assessment -> SUBMITTED_STATUSES.contains(assessment.getStatus()))
                .sorted(Comparator.comparing(
                        EmployeeAssessment::getSubmittedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .map(assessment -> EmployeePerformanceRow.builder()
                        .assessmentId(assessment.getId() == null ? null : assessment.getId().intValue())
                        .employeeId(assessment.getEmployeeId())
                        .userId(assessment.getUserId())
                        .employeeName(assessment.getEmployeeName())
                        .employeeCode(assessment.getEmployeeCode())
                        .departmentId(assessment.getDepartmentId())
                        .departmentName(assessment.getDepartmentName())
                        .position(assessment.getCurrentPosition())
                        .managerName(assessment.getManagerName())
                        .formName(assessment.getFormName())
                        .period(assessment.getPeriod())
                        .status(assessment.getStatus().name())
                        .totalScore(nullToZero(assessment.getTotalScore()))
                        .maxScore(nullToZero(assessment.getMaxScore()))
                        .scorePercent(nullToZero(assessment.getScorePercent()))
                        .performanceLabel(emptyToDefault(assessment.getPerformanceLabel(), labelForScore(nullToZero(assessment.getScorePercent()))))
                        .assessmentDate(assessment.getAssessmentDate())
                        .submittedAt(assessment.getSubmittedAt())
                        .approvedAt(assessment.getApprovedAt())
                        .build())
                .toList();
    }

    private List<KpiPerformanceRow> kpiPerformanceRows(
            List<ManagerKpiAssignmentDto> assignments,
            List<Employee> scopedEmployees
    ) {
        if (assignments == null || assignments.isEmpty()) {
            return List.of();
        }

        Map<Integer, Employee> employeeById = scopedEmployees == null
                ? new LinkedHashMap<>()
                : scopedEmployees.stream()
                .filter(employee -> employee.getId() != null)
                .collect(Collectors.toMap(
                        Employee::getId,
                        employee -> employee,
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));

        return assignments.stream()
                .map(row -> {
                    Employee employee = employeeById.get(row.getEmployeeId());
                    if (employee == null && row.getEmployeeId() != null) {
                        employee = employeeRepository.findWithDepartmentsById(row.getEmployeeId()).orElse(null);
                    }

                    Integer departmentId = departmentIdForEmployee(employee);
                    String departmentName = emptyToDefault(row.getDepartmentName(), departmentName(departmentId));
                    String position = emptyToDefault(row.getPositionTitle(), employee != null && employee.getPosition() != null
                            ? employee.getPosition().getPositionTitle()
                            : null);
                    double score = kpiScoreValue(row.getTotalWeightedScore(), row.getTotalScore());

                    return KpiPerformanceRow.builder()
                            .employeeKpiFormId(row.getEmployeeKpiFormId())
                            .employeeId(row.getEmployeeId())
                            .employeeName(row.getEmployeeName())
                            .employeeCode(employee == null ? null : employee.getEmployeeCode())
                            .departmentId(departmentId)
                            .departmentName(departmentName)
                            .position(position)
                            .kpiTitle(row.getKpiTitle())
                            .status(row.getStatus() == null ? null : row.getStatus().name())
                            .totalScore(row.getTotalScore())
                            .totalWeightedScore(row.getTotalWeightedScore())
                            .performanceLabel(labelForScore(score))
                            .periodStartDate(row.getPeriodStartDate())
                            .periodEndDate(row.getPeriodEndDate())
                            .finalizedAt(row.getFinalizedAt())
                            .build();
                })
                .sorted(Comparator.comparing(
                        KpiPerformanceRow::getFinalizedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    private List<StatusBreakdownRow> statusBreakdown(List<EmployeeAssessment> assessments) {
        long total = assessments.size();

        return assessments.stream()
                .collect(Collectors.groupingBy(
                        assessment -> assessment.getStatus() == null ? "UNKNOWN" : assessment.getStatus().name(),
                        LinkedHashMap::new,
                        Collectors.counting()
                ))
                .entrySet()
                .stream()
                .map(entry -> StatusBreakdownRow.builder()
                        .status(entry.getKey())
                        .count(entry.getValue())
                        .percentage(percent(entry.getValue(), total))
                        .build())
                .sorted(Comparator.comparing(
                        StatusBreakdownRow::getCount,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .toList();
    }

    private List<PipReportRow> pipRows(List<Pip> pips) {
        return pips.stream()
                .sorted(Comparator.comparing(
                        Pip::getCreatedAt,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .map(pip -> {
                    User employeeUser = userById(pip.getEmployeeUserId());
                    User creator = userById(pip.getCreatedByUserId());

                    return PipReportRow.builder()
                            .pipId(pip.getId())
                            .employeeUserId(pip.getEmployeeUserId())
                            .employeeName(employeeUser == null ? "User #" + pip.getEmployeeUserId() : safeName(employeeUser))
                            .employeeCode(employeeUser == null ? null : employeeUser.getEmployeeCode())
                            .departmentId(employeeUser == null ? null : employeeUser.getDepartmentId())
                            .departmentName(departmentName(employeeUser == null ? null : employeeUser.getDepartmentId()))
                            .goal(pip.getGoal())
                            .active(Boolean.TRUE.equals(pip.getStatus()))
                            .startDate(pip.getStartDate())
                            .endDate(pip.getEndDate())
                            .createdAt(pip.getCreatedAt())
                            .finishedAt(pip.getFinishedAt())
                            .createdByName(creator == null ? null : safeName(creator))
                            .build();
                })
                .toList();
    }

    private List<FeedbackParticipationRow> feedbackRows(
            List<FeedbackCampaign> campaigns,
            UserPrincipal principal,
            Set<String> roles
    ) {
        List<FeedbackParticipationRow> rows = new ArrayList<>();

        for (FeedbackCampaign campaign : campaigns) {
            List<FeedbackEvaluatorAssignment> assignments = safeList(
                    () -> feedbackEvaluatorAssignmentRepository.findByCampaignIdWithRequest(campaign.getId())
            )
                    .stream()
                    .filter(assignment -> canViewFeedbackAssignment(assignment, principal, roles))
                    .toList();

            long assigned = assignments.size();

            if (!canViewAllDepartments(roles) && assigned == 0) {
                continue;
            }

            long submitted = assignments.stream()
                    .filter(assignment -> AssignmentStatus.SUBMITTED.equals(assignment.getStatus()))
                    .count();

            long pending = Math.max(assigned - submitted, 0);

            rows.add(FeedbackParticipationRow.builder()
                    .campaignId(campaign.getId())
                    .campaignName(campaign.getName())
                    .status(campaign.getStatus() == null ? "UNKNOWN" : campaign.getStatus().name())
                    .startDate(campaign.getStartDate())
                    .endDate(campaign.getEndDate())
                    .assignedCount(assigned)
                    .submittedCount(submitted)
                    .pendingCount(pending)
                    .completionRate(percent(submitted, assigned))
                    .build());
        }

        return rows;
    }

    private boolean canViewFeedbackAssignment(
            FeedbackEvaluatorAssignment assignment,
            UserPrincipal principal,
            Set<String> roles
    ) {
        if (assignment == null) {
            return false;
        }

        if (canViewAllDepartments(roles)) {
            return true;
        }

        if (principal == null) {
            return false;
        }

        Integer userId = principal.getId();
        Integer departmentId = principal.getDepartmentId();

        if (roles.contains("DEPARTMENT_HEAD")) {
            if (departmentId == null || assignment.getFeedbackRequest() == null) {
                return false;
            }

            return Objects.equals(assignment.getFeedbackRequest().getTargetParentDepartmentId(), departmentId)
                    || Objects.equals(assignment.getFeedbackRequest().getTargetCurrentDepartmentId(), departmentId);
        }

        if (roles.contains("MANAGER")) {
            if (assignment.getFeedbackRequest() == null) {
                return false;
            }

            return Objects.equals(assignment.getFeedbackRequest().getTargetManagerUserId(), userId)
                    || Objects.equals(assignment.getFeedbackRequest().getTargetUserId(), userId);
        }

        return Objects.equals(assignment.getEvaluatorUserId(), userId)
                || (assignment.getFeedbackRequest() != null
                && Objects.equals(assignment.getFeedbackRequest().getTargetUserId(), userId));
    }

    private List<RecommendationRow> recommendations(List<EmployeeAssessment> assessments) {
        return assessments.stream()
                .filter(assessment -> assessment.getStatus() != null)
                .filter(assessment -> SUBMITTED_STATUSES.contains(assessment.getStatus()))
                .filter(assessment -> assessment.getScorePercent() != null)
                .sorted(Comparator.comparing(
                        EmployeeAssessment::getScorePercent,
                        Comparator.nullsLast(Comparator.reverseOrder())
                ))
                .map(assessment -> {
                    double score = nullToZero(assessment.getScorePercent());

                    String recommendationType;
                    String reason;

                    if (score >= 86.0) {
                        recommendationType = "Promotion / Increment Candidate";
                        reason = "Score is in Outstanding range.";
                    } else if (score < 60.0) {
                        recommendationType = "Improvement / PIP Watch";
                        reason = "Score is below Meet Requirement range.";
                    } else {
                        return null;
                    }

                    return RecommendationRow.builder()
                            .employeeId(assessment.getEmployeeId())
                            .userId(assessment.getUserId())
                            .employeeName(assessment.getEmployeeName())
                            .employeeCode(assessment.getEmployeeCode())
                            .departmentName(assessment.getDepartmentName())
                            .recommendationType(recommendationType)
                            .scorePercent(score)
                            .performanceLabel(emptyToDefault(assessment.getPerformanceLabel(), labelForScore(score)))
                            .reason(reason)
                            .build();
                })
                .filter(Objects::nonNull)
                .toList();
    }

    private List<Employee> scopedEmployees(UserPrincipal principal, Set<String> roles) {
        if (canViewAllDepartments(roles)) {
            return employeeRepository.findAllActiveWithDepartments();
        }

        if (roles.contains("DEPARTMENT_HEAD")) {
            if (principal.getDepartmentId() == null) {
                return List.of();
            }

            return employeeRepository.findCurrentByWorkingDepartmentId(principal.getDepartmentId(), false);
        }

        if (roles.contains("MANAGER")) {
            Set<Integer> reportEmployeeIds = userRepository.findByManagerIdAndActiveTrue(principal.getId())
                    .stream()
                    .map(User::getEmployeeId)
                    .filter(Objects::nonNull)
                    .collect(Collectors.toSet());

            return employeeRepository.findAllActiveWithDepartments()
                    .stream()
                    .filter(employee -> reportEmployeeIds.contains(employee.getId()))
                    .toList();
        }

        Integer ownEmployeeId = userRepository.findById(principal.getId())
                .map(User::getEmployeeId)
                .orElse(null);

        if (ownEmployeeId == null) {
            return List.of();
        }

        return employeeRepository.findWithDepartmentsById(ownEmployeeId)
                .stream()
                .toList();
    }

    private List<EmployeeAssessment> scopedAssessments(UserPrincipal principal, Set<String> roles) {
        if (canViewAllDepartments(roles)) {
            return employeeAssessmentRepository.findAll();
        }

        if (roles.contains("DEPARTMENT_HEAD")) {
            if (principal.getDepartmentId() == null) {
                return List.of();
            }

            return employeeAssessmentRepository.findByStatusInAndDepartmentIdOrderBySubmittedAtDesc(
                    SUBMITTED_STATUSES,
                    principal.getDepartmentId()
            );
        }

        if (roles.contains("MANAGER")) {
            Map<Long, EmployeeAssessment> visible = new LinkedHashMap<>();

            employeeAssessmentRepository
                    .findByStatusInAndManagerUserIdOrderBySubmittedAtDesc(
                            SUBMITTED_STATUSES,
                            principal.getId()
                    )
                    .forEach(assessment -> visible.put(assessment.getId(), assessment));

            employeeAssessmentRepository
                    .findByUserIdAndStatusInOrderBySubmittedAtDesc(
                            principal.getId(),
                            SUBMITTED_STATUSES
                    )
                    .forEach(assessment -> visible.put(assessment.getId(), assessment));

            return new ArrayList<>(visible.values());
        }

        return employeeAssessmentRepository.findByUserIdAndStatusInOrderBySubmittedAtDesc(
                principal.getId(),
                SUBMITTED_STATUSES
        );
    }

    private List<Pip> scopedPips(UserPrincipal principal, Set<String> roles) {
        if (canViewAllDepartments(roles)) {
            return pipRepository.findAll();
        }

        if (roles.contains("DEPARTMENT_HEAD")) {
            if (principal.getDepartmentId() == null) {
                return List.of();
            }

            Set<Integer> departmentUserIds = userRepository.findByDepartmentIdAndActiveTrue(principal.getDepartmentId())
                    .stream()
                    .map(User::getId)
                    .collect(Collectors.toSet());

            return pipRepository.findAll()
                    .stream()
                    .filter(pip -> departmentUserIds.contains(pip.getEmployeeUserId()))
                    .toList();
        }

        if (roles.contains("MANAGER")) {
            Set<Integer> reportUserIds = userRepository.findByManagerIdAndActiveTrue(principal.getId())
                    .stream()
                    .map(User::getId)
                    .collect(Collectors.toSet());

            reportUserIds.add(principal.getId());

            return pipRepository.findAll()
                    .stream()
                    .filter(pip -> reportUserIds.contains(pip.getEmployeeUserId())
                            || Objects.equals(pip.getCreatedByUserId(), principal.getId()))
                    .toList();
        }

        return pipRepository.findByEmployeeUserIdAndStatusTrueOrderByCreatedAtDesc(principal.getId());
    }

    private Integer departmentIdForEmployee(Employee employee) {
        if (employee == null || employee.getId() == null) {
            return null;
        }

        User linkedUser = userRepository.findByEmployeeId(employee.getId()).orElse(null);

        if (linkedUser != null && linkedUser.getDepartmentId() != null) {
            return linkedUser.getDepartmentId();
        }

        if (employee.getEmployeeDepartments() == null || employee.getEmployeeDepartments().isEmpty()) {
            return null;
        }

        return employee.getEmployeeDepartments()
                .stream()
                .filter(link -> link.getEnddate() == null)
                .findFirst()
                .map(link -> {
                    if (link.getParentDepartment() != null) {
                        return link.getParentDepartment().getId();
                    }

                    if (link.getCurrentDepartment() != null) {
                        return link.getCurrentDepartment().getId();
                    }

                    return null;
                })
                .orElse(null);
    }

    private User userById(Integer userId) {
        if (userId == null) {
            return null;
        }

        return userRepository.findById(userId).orElse(null);
    }

    private String departmentName(Integer departmentId) {
        if (departmentId == null) {
            return null;
        }

        return departmentRepository.findById(departmentId)
                .map(Department::getDepartmentName)
                .orElse("Department #" + departmentId);
    }

    private boolean canViewReports(Set<String> roles) {
        return roles.contains("HR")
                || roles.contains("HRADMIN")
                || roles.contains("ADMIN")
                || roles.contains("EXECUTIVE")
                || roles.contains("MANAGER")
                || roles.contains("DEPARTMENT_HEAD")
                || roles.contains("EMPLOYEE");
    }

    private boolean canViewAllDepartments(Set<String> roles) {
        return roles.contains("HR") || roles.contains("HRADMIN") || roles.contains("ADMIN") || roles.contains("EXECUTIVE");
    }

    private String scopeLabel(UserPrincipal principal, Set<String> roles) {
        if (canViewAllDepartments(roles)) {
            return "Organization-wide";
        }

        if (roles.contains("DEPARTMENT_HEAD")) {
            return departmentName(principal.getDepartmentId());
        }

        if (roles.contains("MANAGER")) {
            return "Direct reports";
        }

        return "Own records";
    }

    private String primaryRole(Set<String> roles) {
        if (roles.contains("HRADMIN") || roles.contains("ADMIN")) return "HR Admin";
        if (roles.contains("HR")) return "HR";
        if (roles.contains("EXECUTIVE")) return "Executive";
        if (roles.contains("DEPARTMENT_HEAD")) return "Department Head";
        if (roles.contains("MANAGER")) return "Manager";
        return "Employee";
    }

    private Set<String> currentUserTargetRoles(UserPrincipal principal) {
        Set<String> roles = new LinkedHashSet<>();

        if (principal != null && principal.getRoles() != null) {
            principal.getRoles().forEach(role -> addRoleWithAliases(roles, role));
        }

        if (principal != null) {
            addRoleWithAliases(roles, roleFromDashboard(principal.getDashboard()));
            addRoleWithAliases(roles, principal.getPosition());
        }

        if (roles.isEmpty()) {
            roles.add("EMPLOYEE");
        }

        return roles;
    }

    private void addRoleWithAliases(Set<String> roles, String value) {
        String role = canonicalRole(value);

        if (role.isBlank()) {
            return;
        }

        roles.add(role);

        if (role.equals("ADMIN")) {
            roles.add("ADMIN");
        }

        if (role.equals("HR")
                || role.equals("HUMAN_RESOURCE")
                || role.equals("HUMAN_RESOURCES")
                || role.contains("HR")
                || role.contains("HUMAN_RESOURCE")) {
            roles.add("HR");
        }

        if (role.equals("EXECUTIVE")
                || role.equals("CEO")
                || role.contains("EXECUTIVE")
                || role.contains("CEO")
                || role.contains("CHIEF_EXECUTIVE")) {
            roles.add("EXECUTIVE");
        }

        if (role.equals("MANAGER")
                || role.equals("PROJECT_MANAGER")
                || role.equals("TEAM_MANAGER")
                || role.contains("MANAGER")) {
            roles.add("MANAGER");
        }

        if (role.equals("DEPARTMENT_HEAD")
                || role.equals("DEPARTMENTHEAD")
                || role.equals("DEPT_HEAD")
                || role.equals("DEPTHEAD")
                || role.equals("HEAD_OF_DEPARTMENT")
                || role.contains("DEPARTMENT_HEAD")
                || role.contains("DEPARTMENTHEAD")
                || role.contains("DEPT_HEAD")
                || role.contains("DEPTHEAD")
                || role.contains("HEAD_OF_DEPARTMENT")) {
            roles.add("DEPARTMENT_HEAD");
        }

        if (role.equals("EMPLOYEE")) {
            roles.add("EMPLOYEE");
        }
    }

    private String roleFromDashboard(String dashboard) {
        String normalized = canonicalRole(dashboard);

        return switch (normalized) {
            case "ADMIN_DASHBOARD" -> "ADMIN";
            case "HR_DASHBOARD" -> "HR";
            case "MANAGER_DASHBOARD" -> "MANAGER";
            case "DEPARTMENT_HEAD_DASHBOARD", "DEPARTMENTHEAD_DASHBOARD", "DEPT_HEAD_DASHBOARD" -> "DEPARTMENT_HEAD";
            case "EXECUTIVE_DASHBOARD", "CEO_DASHBOARD" -> "EXECUTIVE";
            case "EMPLOYEE_DASHBOARD" -> "EMPLOYEE";
            default -> null;
        };
    }

    private String canonicalRole(String value) {
        if (value == null) {
            return "";
        }

        String normalized = value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);

        if (normalized.equals("DEPARTMENTHEAD")
                || normalized.equals("DEPTHEAD")
                || normalized.equals("DEPT_HEAD")
                || normalized.equals("HEAD_OF_DEPARTMENT")) {
            return "DEPARTMENT_HEAD";
        }

        return normalized;
    }

    private String safeName(User user) {
        if (user == null) {
            return null;
        }

        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }

        return "User #" + user.getId();
    }

    private String labelForScore(double score) {
        if (score >= 86.0) return "Outstanding";
        if (score >= 71.0) return "Good";
        if (score >= 60.0) return "Meet Requirement";
        if (score >= 40.0) return "Need Improvement";
        return "Unsatisfactory";
    }

    private Double percent(long numerator, long denominator) {
        if (denominator <= 0) {
            return 0.0;
        }

        return round2((numerator * 100.0) / denominator);
    }

    private double nullToZero(Double value) {
        return value == null ? 0.0 : value;
    }

    private double round2(double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private String emptyToDefault(String value, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }

        return value;
    }

    private double kpiScoreValue(KpiPerformanceRow row) {
        if (row == null) {
            return 0.0;
        }
        return kpiScoreValue(row.getTotalWeightedScore(), row.getTotalScore());
    }

    private double kpiScoreValue(Double weightedScore, Double totalScore) {
        double weighted = nullToZero(weightedScore);
        if (weighted > 0.0) {
            return weighted;
        }
        return nullToZero(totalScore);
    }

    private double average(Collection<Double> values) {
        if (values == null || values.isEmpty()) {
            return 0.0;
        }
        return values.stream()
                .filter(Objects::nonNull)
                .mapToDouble(Double::doubleValue)
                .average()
                .orElse(0.0);
    }

    private double averageAvailable(double... values) {
        if (values == null || values.length == 0) {
            return 0.0;
        }
        double sum = 0.0;
        int count = 0;
        for (double value : values) {
            if (value > 0.0) {
                sum += value;
                count++;
            }
        }
        return count == 0 ? 0.0 : sum / count;
    }

    private <T> List<T> safeList(Supplier<List<T>> supplier) {
        try {
            List<T> result = supplier.get();
            return result == null ? List.of() : result;
        } catch (Exception ignored) {
            return List.of();
        }
    }
}