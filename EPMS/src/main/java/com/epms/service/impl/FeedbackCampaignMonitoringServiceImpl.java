package com.epms.service.impl;

import com.epms.dto.FeedbackCampaignMonitoringDtos;
import com.epms.dto.FeedbackCampaignMonitoringDtos.AlertSeverity;
import com.epms.dto.FeedbackCampaignMonitoringDtos.CloseReadinessChecklistItemDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.CloseReadinessDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.AlertType;
import com.epms.dto.FeedbackCampaignMonitoringDtos.EvaluatorWorkloadDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.FeedbackCampaignMonitoringResponse;
import com.epms.dto.FeedbackCampaignMonitoringDtos.MonitoringActivityItemDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.MonitoringAlertDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.MonitoringHealthStatus;
import com.epms.dto.FeedbackCampaignMonitoringDtos.MonitoringOverviewDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.RelationshipProgressDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.TargetHealthDto;
import com.epms.dto.FeedbackCampaignMonitoringDtos.TargetRelationshipStatusDto;
import com.epms.entity.AuditLog;
import com.epms.repository.UserRepository;
import com.epms.service.AuditLogService;
import com.epms.service.FeedbackCampaignMonitoringService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import jakarta.persistence.Tuple;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.LocalTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Date;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedbackCampaignMonitoringServiceImpl implements FeedbackCampaignMonitoringService {

    private static final List<String> RELATIONSHIP_ORDER = List.of("MANAGER", "PEER", "SUBORDINATE", "SELF");
    private static final Set<String> PROTECTED_RELATIONSHIPS = Set.of("PEER", "SUBORDINATE");
    private static final int MIN_PROTECTED_RESPONSES = 2;
    private static final int DAYS_REMAINING_RISK_THRESHOLD = 2;
    private static final int HEAVY_PENDING_THRESHOLD = 8;
    private static final int OVERLOADED_PENDING_THRESHOLD = 12;
    private static final double EXPECTED_PROGRESS_WARNING_GAP = -20.0;

    @PersistenceContext
    private EntityManager entityManager;

    private final AuditLogService auditLogService;
    private final UserRepository userRepository;

    @Override
    public FeedbackCampaignMonitoringResponse getMonitoring(Long campaignId) {
        MonitoringSnapshot snapshot = buildSnapshot(campaignId);
        return snapshot.response;
    }

    @Override
    public MonitoringOverviewDto getOverview(Long campaignId) {
        return buildSnapshot(campaignId).response.getOverview();
    }

    @Override
    public List<RelationshipProgressDto> getRelationshipProgress(Long campaignId) {
        return buildSnapshot(campaignId).response.getRelationships();
    }

    @Override
    public List<TargetHealthDto> getTargetHealth(Long campaignId) {
        return buildSnapshot(campaignId).response.getTargets();
    }

    @Override
    public List<EvaluatorWorkloadDto> getEvaluatorWorkload(Long campaignId) {
        return buildSnapshot(campaignId).response.getEvaluators();
    }

    @Override
    public List<MonitoringAlertDto> getAlerts(Long campaignId) {
        return buildSnapshot(campaignId).response.getAlerts();
    }

    @Override
    public List<MonitoringActivityItemDto> getActivity(Long campaignId) {
        return buildActivity(findCampaign(campaignId));
    }

    @Override
    public String exportMonitoringCsv(Long campaignId, Long actorUserId) {
        MonitoringSnapshot snapshot = buildSnapshot(campaignId);
        String csv = buildMonitoringCsv(snapshot.response);
        auditLogService.log(
                actorUserId == null ? null : actorUserId.intValue(),
                "FEEDBACK_MONITORING_EXPORT_DOWNLOADED",
                "FEEDBACK_CAMPAIGN",
                campaignId == null ? null : campaignId.intValue(),
                null,
                "format=CSV, sections=summary|relationships|targets|evaluators|alerts|activity",
                "Monitoring CSV report exported for HR follow-up. No scores, ratings, comments, or answer content included."
        );
        return csv;
    }

    private MonitoringSnapshot buildSnapshot(Long campaignId) {
        CampaignRow campaign = findCampaign(campaignId);
        List<RequestRow> requests = findRequests(campaignId);
        List<AssignmentRow> assignments = findAssignments(campaignId, requests);

        Map<Long, RequestRow> requestById = requests.stream()
                .collect(Collectors.toMap(RequestRow::id, Function.identity(), (left, right) -> left, LinkedHashMap::new));

        Map<Long, List<AssignmentRow>> assignmentsByRequestId = assignments.stream()
                .collect(Collectors.groupingBy(AssignmentRow::requestId, LinkedHashMap::new, Collectors.toList()));

        Timing timing = buildTiming(campaign);
        List<TargetHealthDto> targets = buildTargets(campaign, timing, requests, assignmentsByRequestId);
        List<RelationshipProgressDto> relationships = buildRelationships(campaign, requests, assignmentsByRequestId, assignments, targets);
        List<EvaluatorWorkloadDto> evaluators = buildEvaluators(campaign, requestById, assignments);
        MonitoringOverviewDto overview = buildOverview(assignments, targets);
        List<MonitoringAlertDto> alerts = buildAlerts(campaign, timing, overview, relationships, targets, evaluators);
        List<MonitoringActivityItemDto> activity = buildActivity(campaign);
        MonitoringHealthStatus campaignHealth = resolveCampaignHealth(overview, targets, timing);
        CloseReadinessDto closeReadiness = buildCloseReadiness(campaign, overview, relationships, targets);
        boolean readyToClose = "READY_TO_CLOSE".equals(closeReadiness.getStatus());
        boolean closeWithWarnings = "CLOSE_WITH_WARNINGS".equals(closeReadiness.getStatus());

        FeedbackCampaignMonitoringResponse response = FeedbackCampaignMonitoringResponse.builder()
                .campaignId(campaign.id())
                .campaignName(campaign.name())
                .campaignStatus(campaign.status())
                .reviewYear(campaign.reviewYear())
                .startDate(campaign.startDate())
                .startTime(campaign.startTime())
                .endDate(campaign.endDate())
                .endTime(campaign.endTime())
                .daysRemaining(timing.daysRemaining())
                .totalCampaignDays(timing.totalCampaignDays())
                .expectedProgressPercent(timing.expectedProgressPercent())
                .progressGapPercent(round(percentValue(overview.getCompletionPercent()) - timing.expectedProgressPercent()))
                .campaignHealthStatus(campaignHealth.name())
                .readyToClose(readyToClose)
                .closeWithWarnings(closeWithWarnings)
                .overview(overview)
                .closeReadiness(closeReadiness)
                .relationships(relationships)
                .targets(targets)
                .evaluators(evaluators)
                .alerts(alerts)
                .activity(activity)
                .build();

        return new MonitoringSnapshot(response);
    }

    private CampaignRow findCampaign(Long campaignId) {
        List<Tuple> rows = entityManager.createQuery("""
                        select c.id as id,
                               c.name as name,
                               c.status as status,
                               c.reviewYear as reviewYear,
                               c.startDate as startDate,
                               c.startTime as startTime,
                               c.endDate as endDate,
                               c.endTime as endTime
                        from FeedbackCampaign c
                        where c.id = :campaignId
                        """, Tuple.class)
                .setParameter("campaignId", campaignId)
                .getResultList();

        if (rows.isEmpty()) {
            throw new IllegalArgumentException("Feedback campaign not found.");
        }

        Tuple row = rows.get(0);
        return new CampaignRow(
                toLong(row.get("id")),
                toText(row.get("name")),
                normalizeStatus(row.get("status"), "DRAFT"),
                toInteger(row.get("reviewYear")),
                toLocalDate(row.get("startDate")),
                toLocalTime(row.get("startTime")),
                toLocalDate(row.get("endDate")),
                toLocalTime(row.get("endTime"))
        );
    }

    private List<RequestRow> findRequests(Long campaignId) {
        return entityManager.createQuery("""
                        select r.id as id,
                               r.status as status,
                               r.dueAt as dueAt,
                               r.updatedAt as updatedAt,
                               r.targetEmployeeId as targetEmployeeId,
                               r.targetUserId as targetUserId,
                               r.targetEmployeeCode as targetEmployeeCode,
                               r.targetEmployeeEmail as targetEmployeeEmail,
                               r.targetEmployeeName as targetEmployeeName,
                               r.targetCurrentDepartmentId as departmentId,
                               r.targetCurrentDepartmentName as departmentName,
                               r.targetPositionId as positionId,
                               r.targetPositionName as positionName,
                               r.targetManagerEmployeeId as managerEmployeeId,
                               r.targetManagerName as managerName,
                               r.targetWarningSnapshot as warningSnapshot
                        from FeedbackRequest r
                        where r.campaign.id = :campaignId
                        order by r.targetEmployeeName, r.targetEmployeeId, r.id
                        """, Tuple.class)
                .setParameter("campaignId", campaignId)
                .getResultList()
                .stream()
                .map(row -> new RequestRow(
                        toLong(row.get("id")),
                        normalizeStatus(row.get("status"), "PENDING"),
                        toLocalDateTime(row.get("dueAt")),
                        toLocalDateTime(row.get("updatedAt")),
                        toLong(row.get("targetEmployeeId")),
                        toLong(row.get("targetUserId")),
                        toText(row.get("targetEmployeeCode")),
                        toText(row.get("targetEmployeeEmail")),
                        toText(row.get("targetEmployeeName")),
                        toLong(row.get("departmentId")),
                        toText(row.get("departmentName")),
                        toLong(row.get("positionId")),
                        toText(row.get("positionName")),
                        toLong(row.get("managerEmployeeId")),
                        toText(row.get("managerName")),
                        toText(row.get("warningSnapshot"))
                ))
                .toList();
    }

    private List<AssignmentRow> findAssignments(Long campaignId, List<RequestRow> requests) {
        if (requests.isEmpty()) {
            return List.of();
        }

        return entityManager.createQuery("""
                        select a.id as id,
                               a.feedbackRequest.id as requestId,
                               a.status as status,
                               a.relationshipType as relationshipType,
                               a.selectionMethod as selectionMethod,
                               a.updatedAt as updatedAt,
                               a.evaluatorEmployeeId as evaluatorEmployeeId,
                               a.evaluatorUserId as evaluatorUserId,
                               a.evaluatorEmployeeCode as evaluatorEmployeeCode,
                               a.evaluatorEmployeeEmail as evaluatorEmployeeEmail,
                               a.evaluatorEmployeeName as evaluatorEmployeeName,
                               a.evaluatorDepartmentId as evaluatorDepartmentId,
                               a.evaluatorPositionId as evaluatorPositionId,
                               a.evaluatorPositionName as evaluatorPositionName
                        from FeedbackEvaluatorAssignment a
                        where a.feedbackRequest.campaign.id = :campaignId
                        order by a.feedbackRequest.targetEmployeeName, a.relationshipType, a.evaluatorEmployeeName, a.evaluatorEmployeeId
                        """, Tuple.class)
                .setParameter("campaignId", campaignId)
                .getResultList()
                .stream()
                .map(row -> new AssignmentRow(
                        toLong(row.get("id")),
                        toLong(row.get("requestId")),
                        normalizeStatus(row.get("status"), "PENDING"),
                        normalizeRelationship(row.get("relationshipType")),
                        normalizeStatus(row.get("selectionMethod"), "AUTO_RELATIONSHIP"),
                        toLocalDateTime(row.get("updatedAt")),
                        toLong(row.get("evaluatorEmployeeId")),
                        toLong(row.get("evaluatorUserId")),
                        toText(row.get("evaluatorEmployeeCode")),
                        toText(row.get("evaluatorEmployeeEmail")),
                        toText(row.get("evaluatorEmployeeName")),
                        toLong(row.get("evaluatorDepartmentId")),
                        toLong(row.get("evaluatorPositionId")),
                        toText(row.get("evaluatorPositionName"))
                ))
                .toList();
    }

    private List<TargetHealthDto> buildTargets(
            CampaignRow campaign,
            Timing timing,
            List<RequestRow> requests,
            Map<Long, List<AssignmentRow>> assignmentsByRequestId
    ) {
        List<TargetHealthDto> targets = new ArrayList<>();

        for (RequestRow request : requests) {
            List<AssignmentRow> assignments = assignmentsByRequestId.getOrDefault(request.id(), List.of());
            Map<String, List<AssignmentRow>> byRelationship = assignments.stream()
                    .collect(Collectors.groupingBy(AssignmentRow::relationshipType, LinkedHashMap::new, Collectors.toList()));
            List<TargetRelationshipStatusDto> relationshipStatuses = new ArrayList<>();
            List<String> blockingReasons = new ArrayList<>();
            List<String> warnings = new ArrayList<>();

            int requiredRelationshipCount = 0;
            int completedRequiredRelationshipCount = 0;
            boolean privacyCoveragePassed = true;
            boolean hasOverdue = false;

            for (String relationship : RELATIONSHIP_ORDER) {
                List<AssignmentRow> group = byRelationship.getOrDefault(relationship, List.of());
                RelationshipCounts counts = countAssignments(campaign, request, group);
                boolean protectedRelationship = isProtectedRelationship(relationship);
                boolean required = isRequiredRelationship(relationship, group);
                boolean relationshipCompleted = !required || counts.submittedCount() > 0;
                boolean privacyPassed = !protectedRelationship || counts.assignedCount() == 0 || counts.submittedCount() >= MIN_PROTECTED_RESPONSES;
                String status = relationshipStatus(required, relationshipCompleted, privacyPassed, counts);

                if (required) {
                    requiredRelationshipCount++;
                    if (relationshipCompleted && privacyPassed) {
                        completedRequiredRelationshipCount++;
                    }
                }
                if (!privacyPassed) {
                    privacyCoveragePassed = false;
                }
                if (counts.overdueCount() > 0) {
                    hasOverdue = true;
                }

                if (required && counts.assignedCount() <= 0) {
                    blockingReasons.add(missingRelationshipMessage(relationship));
                } else if (required && counts.submittedCount() <= 0) {
                    warnings.add(pendingRelationshipMessage(relationship));
                }
                if (protectedRelationship && counts.assignedCount() > 0 && counts.submittedCount() > 0 && counts.submittedCount() < MIN_PROTECTED_RESPONSES) {
                    warnings.add(label(relationship) + " feedback has fewer than " + MIN_PROTECTED_RESPONSES + " submitted responses, so anonymity coverage is not ready.");
                }

                relationshipStatuses.add(TargetRelationshipStatusDto.builder()
                        .relationshipType(relationship)
                        .label(label(relationship))
                        .assignedCount(counts.assignedCount())
                        .submittedCount(counts.submittedCount())
                        .pendingCount(counts.pendingCount())
                        .overdueCount(counts.overdueCount())
                        .required(required)
                        .protectedRelationship(protectedRelationship)
                        .minimumResponses(protectedRelationship ? MIN_PROTECTED_RESPONSES : 1)
                        .completed(relationshipCompleted)
                        .privacyPassed(privacyPassed)
                        .status(status)
                        .build());
            }

            if (assignments.isEmpty()) {
                blockingReasons.add("No evaluator assignments have been generated for this target.");
            }
            if (notBlank(request.warningSnapshot())) {
                warnings.add(request.warningSnapshot());
            }

            RelationshipCounts totalCounts = countAssignments(campaign, request, assignments);
            double requiredCoverage = requiredRelationshipCount == 0
                    ? 0
                    : round((completedRequiredRelationshipCount * 100.0) / requiredRelationshipCount);
            boolean readyToClose = assignments.size() > 0
                    && requiredRelationshipCount > 0
                    && completedRequiredRelationshipCount == requiredRelationshipCount
                    && privacyCoveragePassed
                    && blockingReasons.isEmpty();
            MonitoringHealthStatus health = targetHealthStatus(
                    readyToClose,
                    blockingReasons,
                    warnings,
                    hasOverdue,
                    requiredCoverage,
                    timing,
                    totalCounts
            );

            targets.add(TargetHealthDto.builder()
                    .feedbackRequestId(request.id())
                    .targetEmployeeId(request.targetEmployeeId())
                    .targetUserId(request.targetUserId())
                    .targetEmployeeCode(request.targetEmployeeCode())
                    .targetEmployeeName(request.targetEmployeeName())
                    .targetEmployeeEmail(request.targetEmployeeEmail())
                    .departmentId(request.departmentId())
                    .departmentName(request.departmentName())
                    .positionId(request.positionId())
                    .positionName(request.positionName())
                    .managerEmployeeId(request.managerEmployeeId())
                    .managerName(request.managerName())
                    .requestStatus(request.status())
                    .dueAt(request.dueAt())
                    .assignedCount(totalCounts.assignedCount())
                    .submittedCount(totalCounts.submittedCount())
                    .pendingCount(totalCounts.pendingCount())
                    .overdueCount(totalCounts.overdueCount())
                    .completionPercent(completionPercent(totalCounts.submittedCount(), totalCounts.assignedCount()))
                    .requiredRelationshipCount(requiredRelationshipCount)
                    .completedRequiredRelationshipCount(completedRequiredRelationshipCount)
                    .requiredCoveragePercent(requiredCoverage)
                    .privacyCoveragePassed(privacyCoveragePassed)
                    .healthStatus(health.name())
                    .readyToClose(readyToClose)
                    .recommendedAction(recommendedAction(readyToClose, blockingReasons, warnings, hasOverdue, relationshipStatuses))
                    .lastActivityAt(lastActivity(request, assignments))
                    .relationshipStatuses(relationshipStatuses)
                    .blockingReasons(blockingReasons)
                    .warnings(warnings)
                    .build());
        }

        return targets.stream()
                .sorted(Comparator
                        .comparing((TargetHealthDto target) -> healthRank(target.getHealthStatus()))
                        .thenComparing(TargetHealthDto::getTargetEmployeeName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(TargetHealthDto::getFeedbackRequestId, Comparator.nullsLast(Long::compareTo)))
                .toList();
    }

    private List<RelationshipProgressDto> buildRelationships(
            CampaignRow campaign,
            List<RequestRow> requests,
            Map<Long, List<AssignmentRow>> assignmentsByRequestId,
            List<AssignmentRow> assignments,
            List<TargetHealthDto> targets
    ) {
        Map<Long, RequestRow> requestById = requests.stream()
                .collect(Collectors.toMap(RequestRow::id, Function.identity(), (left, right) -> left));
        List<RelationshipProgressDto> result = new ArrayList<>();

        for (String relationship : RELATIONSHIP_ORDER) {
            List<AssignmentRow> group = assignments.stream()
                    .filter(item -> relationship.equals(item.relationshipType()))
                    .toList();
            RelationshipCounts counts = countAssignmentsForRelationship(campaign, requestById, group);
            boolean protectedRelationship = isProtectedRelationship(relationship);
            int targetsWithRelationship = 0;
            int targetsPassingPrivacy = 0;
            int targetsFailingPrivacy = 0;

            for (RequestRow request : requests) {
                List<AssignmentRow> targetRelationshipAssignments = assignmentsByRequestId.getOrDefault(request.id(), List.of()).stream()
                        .filter(item -> relationship.equals(item.relationshipType()))
                        .toList();
                if (targetRelationshipAssignments.isEmpty()) {
                    continue;
                }
                targetsWithRelationship++;
                RelationshipCounts targetCounts = countAssignments(campaign, request, targetRelationshipAssignments);
                boolean privacyPassed = !protectedRelationship || targetCounts.submittedCount() >= MIN_PROTECTED_RESPONSES;
                if (privacyPassed) {
                    targetsPassingPrivacy++;
                } else {
                    targetsFailingPrivacy++;
                }
            }

            String warning = null;
            if (counts.assignedCount() == 0) {
                warning = label(relationship) + " feedback has no assignments yet.";
            } else if (protectedRelationship && targetsFailingPrivacy > 0) {
                warning = targetsFailingPrivacy + " target" + plural(targetsFailingPrivacy) + " do not meet anonymity coverage for " + label(relationship).toLowerCase(Locale.ROOT) + " feedback.";
            } else if (counts.pendingCount() > 0) {
                warning = counts.pendingCount() + " " + label(relationship).toLowerCase(Locale.ROOT) + " assignment" + plural(counts.pendingCount()) + " still pending.";
            }

            result.add(RelationshipProgressDto.builder()
                    .relationshipType(relationship)
                    .label(label(relationship))
                    .assignedCount(counts.assignedCount())
                    .submittedCount(counts.submittedCount())
                    .notStartedCount(counts.notStartedCount())
                    .inProgressCount(counts.inProgressCount())
                    .cancelledCount(counts.cancelledCount())
                    .declinedCount(counts.declinedCount())
                    .overdueCount(counts.overdueCount())
                    .pendingCount(counts.pendingCount())
                    .completionPercent(completionPercent(counts.submittedCount(), counts.assignedCount()))
                    .protectedRelationship(protectedRelationship)
                    .minimumProtectedResponses(protectedRelationship ? MIN_PROTECTED_RESPONSES : 1)
                    .targetsWithRelationship(targetsWithRelationship)
                    .targetsPassingPrivacy(targetsPassingPrivacy)
                    .targetsFailingPrivacy(targetsFailingPrivacy)
                    .warning(warning)
                    .build());
        }

        return result;
    }

    private List<EvaluatorWorkloadDto> buildEvaluators(
            CampaignRow campaign,
            Map<Long, RequestRow> requestById,
            List<AssignmentRow> assignments
    ) {
        Map<String, List<AssignmentRow>> byEvaluator = assignments.stream()
                .filter(item -> item.evaluatorEmployeeId() != null || item.evaluatorUserId() != null)
                .collect(Collectors.groupingBy(this::evaluatorKey, LinkedHashMap::new, Collectors.toList()));

        List<EvaluatorWorkloadDto> result = new ArrayList<>();
        for (List<AssignmentRow> group : byEvaluator.values()) {
            AssignmentRow sample = group.get(0);
            RelationshipCounts counts = countAssignmentsForEvaluator(campaign, requestById, group);
            Map<String, Integer> relationshipCounts = group.stream()
                    .collect(Collectors.groupingBy(AssignmentRow::relationshipType, LinkedHashMap::new, Collectors.summingInt(item -> 1)));
            List<String> targetNames = group.stream()
                    .map(item -> requestById.get(item.requestId()))
                    .filter(Objects::nonNull)
                    .map(RequestRow::targetEmployeeName)
                    .filter(this::notBlank)
                    .collect(Collectors.toCollection(LinkedHashSet::new))
                    .stream()
                    .sorted(String.CASE_INSENSITIVE_ORDER)
                    .toList();

            result.add(EvaluatorWorkloadDto.builder()
                    .evaluatorEmployeeId(sample.evaluatorEmployeeId())
                    .evaluatorUserId(sample.evaluatorUserId())
                    .evaluatorEmployeeCode(sample.evaluatorEmployeeCode())
                    .evaluatorEmployeeName(sample.evaluatorEmployeeName())
                    .evaluatorEmployeeEmail(sample.evaluatorEmployeeEmail())
                    .evaluatorDepartmentId(sample.evaluatorDepartmentId())
                    .evaluatorPositionId(sample.evaluatorPositionId())
                    .evaluatorPositionName(sample.evaluatorPositionName())
                    .assignedCount(counts.assignedCount())
                    .submittedCount(counts.submittedCount())
                    .pendingCount(counts.pendingCount())
                    .overdueCount(counts.overdueCount())
                    .completionPercent(completionPercent(counts.submittedCount(), counts.assignedCount()))
                    .workloadStatus(workloadStatus(counts.pendingCount()))
                    .lastActivityAt(group.stream().map(AssignmentRow::updatedAt).filter(Objects::nonNull).max(LocalDateTime::compareTo).orElse(null))
                    .relationshipCounts(relationshipCounts)
                    .targetNames(targetNames)
                    .build());
        }

        return result.stream()
                .sorted(Comparator
                        .comparing(EvaluatorWorkloadDto::getPendingCount, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(EvaluatorWorkloadDto::getAssignedCount, Comparator.nullsLast(Comparator.reverseOrder()))
                        .thenComparing(EvaluatorWorkloadDto::getEvaluatorEmployeeName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    private MonitoringOverviewDto buildOverview(List<AssignmentRow> assignments, List<TargetHealthDto> targets) {
        int submitted = 0;
        int inProgress = 0;
        int cancelled = 0;
        int declined = 0;
        int overdue = 0;
        int notStarted = 0;

        for (AssignmentRow assignment : assignments) {
            String status = assignment.monitoringStatus();
            if ("SUBMITTED".equals(status)) submitted++;
            else if ("IN_PROGRESS".equals(status)) inProgress++;
            else if ("CANCELLED".equals(status) || "EXPIRED".equals(status)) cancelled++;
            else if ("DECLINED".equals(status)) declined++;
            else if ("OVERDUE".equals(status)) overdue++;
            else notStarted++;
        }

        int ready = countTargets(targets, MonitoringHealthStatus.READY);
        int onTrack = countTargets(targets, MonitoringHealthStatus.ON_TRACK);
        int needsAttention = countTargets(targets, MonitoringHealthStatus.NEEDS_ATTENTION);
        int atRisk = countTargets(targets, MonitoringHealthStatus.AT_RISK);
        int blocked = countTargets(targets, MonitoringHealthStatus.BLOCKED);
        int readyToClose = (int) targets.stream().filter(target -> Boolean.TRUE.equals(target.getReadyToClose())).count();
        int privacyRisk = (int) targets.stream().filter(target -> !Boolean.TRUE.equals(target.getPrivacyCoveragePassed())).count();
        double requiredCoverage = targets.isEmpty()
                ? 0
                : round(targets.stream().mapToDouble(target -> percentValue(target.getRequiredCoveragePercent())).average().orElse(0));

        return MonitoringOverviewDto.builder()
                .totalTargets(targets.size())
                .totalAssignments(assignments.size())
                .notStartedCount(notStarted)
                .inProgressCount(inProgress)
                .submittedCount(submitted)
                .cancelledCount(cancelled)
                .declinedCount(declined)
                .overdueCount(overdue)
                .pendingCount(assignments.size() - submitted - cancelled - declined)
                .completionPercent(completionPercent(submitted, assignments.size()))
                .readyTargetCount(ready)
                .onTrackTargetCount(onTrack)
                .needsAttentionTargetCount(needsAttention)
                .atRiskTargetCount(atRisk)
                .blockedTargetCount(blocked)
                .readyToCloseTargetCount(readyToClose)
                .requiredCoveragePercent(requiredCoverage)
                .privacyRiskTargetCount(privacyRisk)
                .build();
    }


    private CloseReadinessDto buildCloseReadiness(
            CampaignRow campaign,
            MonitoringOverviewDto overview,
            List<RelationshipProgressDto> relationships,
            List<TargetHealthDto> targets
    ) {
        List<CloseReadinessChecklistItemDto> checklist = new ArrayList<>();
        String campaignStatus = normalizeStatus(campaign.status(), "DRAFT");
        boolean active = "ACTIVE".equals(campaignStatus);
        boolean closed = "CLOSED".equals(campaignStatus);
        boolean published = "PUBLISHED".equals(campaignStatus);

        if (published) {
            checklist.add(closeCheck("campaign-published", "Campaign window", "INFO", "Results are already published", "This campaign has already been published. Closing is no longer available.", 1, false));
        } else if (closed) {
            checklist.add(closeCheck("campaign-closed", "Campaign window", "INFO", "Campaign is already closed", "Feedback collection has already been locked for this campaign.", 1, false));
        } else if (active) {
            checklist.add(closeCheck("campaign-active", "Campaign window", "PASS", "Campaign is active", "This campaign is active and can be reviewed for closing.", 1, false));
        } else {
            checklist.add(closeCheck("campaign-not-active", "Campaign window", "BLOCKER", "Campaign is not active", "Only active campaigns can be closed from monitoring.", 1, true));
        }

        int totalTargets = safeInt(overview.getTotalTargets());
        int totalAssignments = safeInt(overview.getTotalAssignments());
        int submitted = safeInt(overview.getSubmittedCount());
        int pending = safeInt(overview.getPendingCount());
        int overdue = safeInt(overview.getOverdueCount());
        int privacyRisks = safeInt(overview.getPrivacyRiskTargetCount());
        int readyTargets = safeInt(overview.getReadyToCloseTargetCount());
        int blockedTargets = safeInt(overview.getBlockedTargetCount());
        int atRiskTargets = safeInt(overview.getAtRiskTargetCount());

        if (totalTargets <= 0) {
            checklist.add(closeCheck("targets-missing", "Campaign setup", "BLOCKER", "No target employees", "Add target employees before closing the campaign.", 0, true));
        } else {
            checklist.add(closeCheck("targets-selected", "Campaign setup", "PASS", "Targets selected", totalTargets + " target employee" + plural(totalTargets) + " included in this campaign.", totalTargets, false));
        }

        if (totalAssignments <= 0) {
            checklist.add(closeCheck("assignments-missing", "Campaign setup", "BLOCKER", "No evaluator assignments", "Generate evaluator assignments before closing the campaign.", 0, true));
        } else {
            checklist.add(closeCheck("assignments-created", "Campaign setup", "PASS", "Evaluator assignments generated", totalAssignments + " evaluator assignment" + plural(totalAssignments) + " available for monitoring.", totalAssignments, false));
        }

        if (submitted <= 0 && totalAssignments > 0) {
            checklist.add(closeCheck("no-submissions", "Submission completion", "WARNING", "No feedback submitted yet", "No evaluator has submitted final feedback. Closing is allowed only as a warning decision.", totalAssignments, false));
        } else if (submitted > 0) {
            checklist.add(closeCheck("submitted-feedback", "Submission completion", "PASS", "Submitted feedback exists", submitted + " submitted assignment" + plural(submitted) + " will be included in operational close readiness.", submitted, false));
        }

        if (pending > 0) {
            checklist.add(closeCheck("pending-assignments", "Submission completion", "WARNING", "Pending assignments remain", pending + " evaluator assignment" + plural(pending) + " will be locked if the campaign is closed.", pending, false));
        } else if (totalAssignments > 0) {
            checklist.add(closeCheck("no-pending-assignments", "Submission completion", "PASS", "No pending assignments", "All non-cancelled evaluator assignments are completed or terminal.", 0, false));
        }

        if (overdue > 0) {
            checklist.add(closeCheck("overdue-assignments", "Submission completion", "WARNING", "Overdue assignments remain", overdue + " evaluator assignment" + plural(overdue) + " passed the campaign deadline.", overdue, false));
        }

        if (blockedTargets > 0) {
            checklist.add(closeCheck("blocked-targets", "Target coverage", "WARNING", "Some targets are blocked", blockedTargets + " target" + plural(blockedTargets) + " still have assignment or coverage issues.", blockedTargets, false));
        }
        if (atRiskTargets > 0) {
            checklist.add(closeCheck("at-risk-targets", "Target coverage", "WARNING", "Targets need follow-up", atRiskTargets + " target" + plural(atRiskTargets) + " are at risk or overdue.", atRiskTargets, false));
        }
        if (totalTargets > 0 && readyTargets == totalTargets) {
            checklist.add(closeCheck("all-targets-ready", "Target coverage", "PASS", "All targets meet close coverage", "Every target currently satisfies required relationship coverage checks.", readyTargets, false));
        } else if (totalTargets > 0) {
            int notReady = Math.max(0, totalTargets - readyTargets);
            checklist.add(closeCheck("target-coverage-warning", "Target coverage", "WARNING", "Some targets are not close-ready", notReady + " target" + plural(notReady) + " still need required feedback or coverage review.", notReady, false));
        }

        if (privacyRisks > 0) {
            checklist.add(closeCheck("privacy-risks", "Privacy readiness", "WARNING", "Anonymity threshold not ready", privacyRisks + " target" + plural(privacyRisks) + " do not meet protected relationship anonymity coverage.", privacyRisks, false));
        } else if (totalTargets > 0) {
            checklist.add(closeCheck("privacy-ready", "Privacy readiness", "PASS", "Privacy checks clear", "No protected relationship anonymity risk is currently detected.", 0, false));
        }

        for (RelationshipProgressDto relationship : relationships) {
            if (relationship == null || safeInt(relationship.getAssignedCount()) <= 0) {
                continue;
            }
            if (Boolean.TRUE.equals(relationship.getProtectedRelationship()) && safeInt(relationship.getTargetsFailingPrivacy()) > 0) {
                checklist.add(closeCheck(
                        "privacy-" + relationship.getRelationshipType().toLowerCase(Locale.ROOT),
                        "Privacy readiness",
                        "WARNING",
                        relationship.getLabel() + " anonymity not ready",
                        relationship.getTargetsFailingPrivacy() + " target" + plural(relationship.getTargetsFailingPrivacy()) + " need more " + relationship.getLabel().toLowerCase(Locale.ROOT) + " submissions.",
                        relationship.getTargetsFailingPrivacy(),
                        false
                ));
            }
        }

        int blockerCount = (int) checklist.stream().filter(item -> "BLOCKER".equals(item.getStatus())).count();
        int warningCount = (int) checklist.stream().filter(item -> "WARNING".equals(item.getStatus())).count();
        int passCount = (int) checklist.stream().filter(item -> "PASS".equals(item.getStatus())).count();

        String status;
        String label;
        boolean canClose;
        boolean closeWithWarnings;
        boolean requiresAcknowledgement;
        String primaryActionLabel;
        String summary;

        if (closed) {
            status = "ALREADY_CLOSED";
            label = "Already closed";
            canClose = false;
            closeWithWarnings = false;
            requiresAcknowledgement = false;
            primaryActionLabel = "Campaign closed";
            summary = warningCount > 0
                    ? "Feedback collection is already closed. Some follow-up or publish-readiness warnings remain."
                    : "Feedback collection is already closed.";
        } else if (published) {
            status = "PUBLISHED";
            label = "Published";
            canClose = false;
            closeWithWarnings = false;
            requiresAcknowledgement = false;
            primaryActionLabel = "Published";
            summary = "This campaign is already published.";
        } else if (blockerCount > 0) {
            status = "NOT_READY_TO_CLOSE";
            label = "Not ready to close";
            canClose = false;
            closeWithWarnings = false;
            requiresAcknowledgement = false;
            primaryActionLabel = "Resolve blockers";
            summary = blockerCount + " blocker" + plural(blockerCount) + " must be resolved before the campaign can be closed.";
        } else if (warningCount > 0) {
            status = "CLOSE_WITH_WARNINGS";
            label = "Close with warnings";
            canClose = active;
            closeWithWarnings = active;
            requiresAcknowledgement = active;
            primaryActionLabel = active ? "Close with warnings" : "Close unavailable";
            summary = warningCount + " warning" + plural(warningCount) + " remain. HR can close after acknowledging that pending feedback will be locked.";
        } else {
            status = "READY_TO_CLOSE";
            label = "Ready to close";
            canClose = active;
            closeWithWarnings = false;
            requiresAcknowledgement = false;
            primaryActionLabel = active ? "Close campaign" : "Close unavailable";
            summary = "No blockers or warnings were detected. The campaign can be closed safely.";
        }

        return CloseReadinessDto.builder()
                .status(status)
                .statusLabel(label)
                .canClose(canClose)
                .canCloseWithWarnings(closeWithWarnings)
                .requiresAcknowledgement(requiresAcknowledgement)
                .hardBlockerCount(blockerCount)
                .warningCount(warningCount)
                .passCount(passCount)
                .totalTargets(totalTargets)
                .readyTargets(readyTargets)
                .pendingAssignments(pending)
                .overdueAssignments(overdue)
                .privacyRiskTargets(privacyRisks)
                .summary(summary)
                .primaryActionLabel(primaryActionLabel)
                .checklist(checklist)
                .build();
    }

    private CloseReadinessChecklistItemDto closeCheck(
            String key,
            String category,
            String status,
            String title,
            String message,
            Integer affectedCount,
            boolean blocking
    ) {
        return CloseReadinessChecklistItemDto.builder()
                .key(key)
                .category(category)
                .status(status)
                .title(title)
                .message(message)
                .affectedCount(affectedCount == null ? 0 : affectedCount)
                .blocking(blocking)
                .build();
    }

    private int safeInt(Integer value) {
        return value == null ? 0 : value;
    }


    private List<MonitoringActivityItemDto> buildActivity(CampaignRow campaign) {
        List<AuditLog> logs = auditLogService.getRecent("FEEDBACK_CAMPAIGN", campaign.id() == null ? null : campaign.id().intValue()).stream()
                .filter(log -> log != null && isMonitoringActivityAction(log.getAction()))
                .limit(40)
                .toList();

        Map<Integer, UserRepository.AuditLogEditorProjection> actors = actorLookup(logs.stream()
                .map(AuditLog::getUserId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new)));

        List<MonitoringActivityItemDto> activity = logs.stream()
                .map(log -> mapActivity(log, actors.get(log.getUserId())))
                .toList();

        if (!activity.isEmpty()) {
            return activity;
        }

        String title = switch (campaign.status()) {
            case "ACTIVE" -> "Campaign is active";
            case "CLOSED" -> "Campaign is closed";
            case "PUBLISHED" -> "Campaign is published";
            case "READY_TO_ACTIVATE" -> "Campaign is ready to activate";
            default -> "Campaign monitoring started";
        };
        String message = "No operational activity has been recorded for this campaign yet.";
        return List.of(MonitoringActivityItemDto.builder()
                .id(0L)
                .activityType("SYSTEM_STATUS")
                .title(title)
                .message(message)
                .severity("INFO")
                .actorName("System")
                .actorRole("System")
                .actorUserId(null)
                .metadata("status=" + campaign.status())
                .occurredAt(null)
                .build());
    }

    private Map<Integer, UserRepository.AuditLogEditorProjection> actorLookup(Collection<Integer> userIds) {
        if (userIds == null || userIds.isEmpty()) {
            return Map.of();
        }
        return userRepository.findAuditLogEditorOptionsByUserIds(userIds).stream()
                .collect(Collectors.toMap(
                        UserRepository.AuditLogEditorProjection::getUserId,
                        Function.identity(),
                        (left, right) -> left,
                        LinkedHashMap::new
                ));
    }

    private MonitoringActivityItemDto mapActivity(AuditLog log, UserRepository.AuditLogEditorProjection actor) {
        String action = normalizeStatus(log.getAction(), "ACTIVITY");
        ActivityCopy copy = activityCopy(action, log);
        return MonitoringActivityItemDto.builder()
                .id(log.getId() == null ? null : log.getId().longValue())
                .activityType(action)
                .title(copy.title())
                .message(copy.message())
                .severity(copy.severity())
                .actorName(actor == null ? (log.getUserId() == null ? "System" : "User #" + log.getUserId()) : actor.getDisplayName())
                .actorRole(actor == null ? null : actor.getRoleName())
                .actorUserId(log.getUserId())
                .metadata(firstNonBlank(log.getNewValue(), log.getReason(), log.getChangedColumn()))
                .occurredAt(toLocalDateTime(log.getTimestamp()))
                .build();
    }

    private boolean isMonitoringActivityAction(String actionValue) {
        String action = normalizeStatus(actionValue, "");
        return action.startsWith("FEEDBACK_CAMPAIGN_")
                || action.startsWith("FEEDBACK_TARGETS_")
                || action.startsWith("FEEDBACK_ASSIGNMENT")
                || action.startsWith("FEEDBACK_DEADLINE_REMINDERS")
                || action.startsWith("FEEDBACK_OVERDUE_REMINDERS")
                || action.startsWith("FEEDBACK_MONITORING_EXPORT")
                || action.startsWith("FEEDBACK_DRAFT_AUTO_SUBMITTED")
                || action.startsWith("FEEDBACK_SUMMARY_");
    }

    private ActivityCopy activityCopy(String action, AuditLog log) {
        String metadata = firstNonBlank(log.getNewValue(), log.getReason(), "");
        return switch (action) {
            case "FEEDBACK_CAMPAIGN_CREATED" -> new ActivityCopy("Campaign created", "The 360 feedback campaign was created.", "INFO");
            case "FEEDBACK_CAMPAIGN_UPDATED" -> new ActivityCopy("Campaign updated", "Campaign setup details were updated.", "INFO");
            case "FEEDBACK_CAMPAIGN_READY_TO_ACTIVATE" -> new ActivityCopy("Marked ready to activate", "Campaign setup passed readiness review.", "INFO");
            case "FEEDBACK_CAMPAIGN_ACTIVATED" -> new ActivityCopy("Campaign activated", "Evaluator submissions were opened for this campaign.", "SUCCESS");
            case "FEEDBACK_CAMPAIGN_CLOSED" -> new ActivityCopy("Campaign closed", closeMessageFromMetadata(metadata), metadataContainsWarning(metadata) ? "WARNING" : "SUCCESS");
            case "FEEDBACK_CAMPAIGN_PUBLISHED" -> new ActivityCopy("Campaign published", "Published results were made available after close processing.", "SUCCESS");
            case "FEEDBACK_TARGETS_UPDATED" -> new ActivityCopy("Targets updated", "Target employees were updated for this campaign.", "INFO");
            case "FEEDBACK_ASSIGNMENTS_GENERATED" -> new ActivityCopy("Evaluator assignments generated", "Evaluator assignments were generated for selected targets.", "INFO");
            case "FEEDBACK_ASSIGNMENT_MANUAL_ADDED" -> new ActivityCopy("Manual evaluator added", "HR added an evaluator manually.", "INFO");
            case "FEEDBACK_ASSIGNMENT_REMOVED" -> new ActivityCopy("Evaluator assignment removed", "HR removed an evaluator assignment.", "WARNING");
            case "FEEDBACK_DEADLINE_REMINDERS_SENT" -> new ActivityCopy("Pending reminders sent", reminderMessage(metadata, "pending"), "INFO");
            case "FEEDBACK_OVERDUE_REMINDERS_SENT" -> new ActivityCopy("Overdue reminders sent", reminderMessage(metadata, "overdue"), "WARNING");
            case "FEEDBACK_MONITORING_EXPORT_DOWNLOADED" -> new ActivityCopy("Monitoring report exported", "A CSV monitoring report was downloaded for HR follow-up.", "INFO");
            case "FEEDBACK_DRAFT_AUTO_SUBMITTED_ON_CLOSE" -> new ActivityCopy("Drafts auto-submitted on close", "Completed draft responses were submitted during campaign close processing.", "INFO");
            case "FEEDBACK_SUMMARY_CALCULATED" -> new ActivityCopy("Summary calculated", "Operational summary calculation was completed after closing.", "INFO");
            case "FEEDBACK_SUMMARY_PUBLISHED" -> new ActivityCopy("Summary published", "Feedback summaries were published.", "SUCCESS");
            case "FEEDBACK_SUMMARY_UNPUBLISHED" -> new ActivityCopy("Summary unpublished", "Published feedback summaries were withdrawn.", "WARNING");
            default -> new ActivityCopy(labelFromAction(action), "Campaign activity was recorded.", "INFO");
        };
    }

    private String closeMessageFromMetadata(String metadata) {
        if (metadataContainsWarning(metadata)) {
            return "Feedback collection was closed with unresolved warnings recorded for follow-up.";
        }
        return "Feedback collection was closed and evaluator submissions were locked.";
    }

    private boolean metadataContainsWarning(String metadata) {
        String clean = String.valueOf(metadata == null ? "" : metadata).toUpperCase(Locale.ROOT);
        return clean.contains("WARNING") || clean.contains("CLOSE_WITH_WARNINGS") || clean.contains("PENDINGASSIGNMENTS=") || clean.contains("PRIVACYRISKTARGETS=");
    }

    private String reminderMessage(String metadata, String defaultType) {
        Integer pending = parseMetric(metadata, "pendingAssignments");
        Integer notified = parseMetric(metadata, "notifiedUsers");
        if (notified == null) {
            notified = parseMetric(metadata, "notifiedAssignments");
        }
        String type = defaultType == null ? "pending" : defaultType;
        if (pending != null || notified != null) {
            return (notified == null ? "Some" : notified) + " evaluator" + plural(notified == null ? 2 : notified) + " were notified for " + type + " feedback follow-up.";
        }
        return "Evaluator reminders were sent for " + type + " feedback follow-up.";
    }

    private Integer parseMetric(String value, String key) {
        if (value == null || key == null) {
            return null;
        }
        String needle = key + "=";
        for (String piece : value.split(",")) {
            String clean = piece.trim();
            if (clean.startsWith(needle)) {
                try {
                    return Integer.valueOf(clean.substring(needle.length()).trim());
                } catch (NumberFormatException ignored) {
                    return null;
                }
            }
        }
        return null;
    }

    private String labelFromAction(String action) {
        String clean = action == null ? "Activity" : action.replace("FEEDBACK_", "").replace('_', ' ').toLowerCase(Locale.ROOT);
        return clean.isBlank() ? "Activity" : clean.substring(0, 1).toUpperCase(Locale.ROOT) + clean.substring(1);
    }

    private String buildMonitoringCsv(FeedbackCampaignMonitoringResponse response) {
        StringBuilder csv = new StringBuilder();
        appendSection(csv, "Campaign summary");
        appendRow(csv, "Campaign ID", response.getCampaignId());
        appendRow(csv, "Campaign name", response.getCampaignName());
        appendRow(csv, "Status", response.getCampaignStatus());
        appendRow(csv, "Review year", response.getReviewYear());
        appendRow(csv, "Start", combineDateTime(response.getStartDate(), response.getStartTime()));
        appendRow(csv, "End", combineDateTime(response.getEndDate(), response.getEndTime()));
        appendRow(csv, "Overall completion", percentValue(response.getOverview().getCompletionPercent()) + "%");
        appendRow(csv, "Close readiness", response.getCloseReadiness().getStatusLabel());
        appendBlank(csv);

        appendSection(csv, "Overview");
        appendHeader(csv, "Total targets", "Total assignments", "Submitted", "Pending", "Overdue", "Ready targets", "Privacy risk targets");
        appendRow(csv,
                response.getOverview().getTotalTargets(),
                response.getOverview().getTotalAssignments(),
                response.getOverview().getSubmittedCount(),
                response.getOverview().getPendingCount(),
                response.getOverview().getOverdueCount(),
                response.getOverview().getReadyToCloseTargetCount(),
                response.getOverview().getPrivacyRiskTargetCount());
        appendBlank(csv);

        appendSection(csv, "Close readiness checklist");
        appendHeader(csv, "Category", "Status", "Title", "Message", "Affected count", "Blocking");
        for (CloseReadinessChecklistItemDto item : response.getCloseReadiness().getChecklist()) {
            appendRow(csv, item.getCategory(), item.getStatus(), item.getTitle(), item.getMessage(), item.getAffectedCount(), item.getBlocking());
        }
        appendBlank(csv);

        appendSection(csv, "Relationship progress");
        appendHeader(csv, "Relationship", "Assigned", "Submitted", "Pending", "Overdue", "Completion %", "Protected", "Anonymity risk targets");
        for (RelationshipProgressDto item : response.getRelationships()) {
            appendRow(csv, item.getLabel(), item.getAssignedCount(), item.getSubmittedCount(), item.getPendingCount(), item.getOverdueCount(), item.getCompletionPercent(), item.getProtectedRelationship(), item.getTargetsFailingPrivacy());
        }
        appendBlank(csv);

        appendSection(csv, "Target health");
        appendHeader(csv, "Employee code", "Employee name", "Department", "Position", "Assigned", "Submitted", "Pending", "Overdue", "Required coverage %", "Privacy ready", "Health", "Recommended action");
        for (TargetHealthDto item : response.getTargets()) {
            appendRow(csv, item.getTargetEmployeeCode(), item.getTargetEmployeeName(), item.getDepartmentName(), item.getPositionName(), item.getAssignedCount(), item.getSubmittedCount(), item.getPendingCount(), item.getOverdueCount(), item.getRequiredCoveragePercent(), item.getPrivacyCoveragePassed(), item.getHealthStatus(), item.getRecommendedAction());
        }
        appendBlank(csv);

        appendSection(csv, "Evaluator workload");
        appendHeader(csv, "Evaluator code", "Evaluator name", "Position", "Assigned", "Submitted", "Pending", "Overdue", "Completion %", "Workload", "Targets");
        for (EvaluatorWorkloadDto item : response.getEvaluators()) {
            appendRow(csv, item.getEvaluatorEmployeeCode(), item.getEvaluatorEmployeeName(), item.getEvaluatorPositionName(), item.getAssignedCount(), item.getSubmittedCount(), item.getPendingCount(), item.getOverdueCount(), item.getCompletionPercent(), item.getWorkloadStatus(), String.join("; ", item.getTargetNames()));
        }
        appendBlank(csv);

        appendSection(csv, "Alerts");
        appendHeader(csv, "Severity", "Alert", "Message", "Affected count", "Action");
        for (MonitoringAlertDto item : response.getAlerts()) {
            appendRow(csv, item.getSeverity(), item.getTitle(), item.getMessage(), item.getAffectedCount(), item.getActionType());
        }
        appendBlank(csv);

        appendSection(csv, "Activity timeline");
        appendHeader(csv, "Occurred at", "Type", "Title", "Message", "Actor", "Role", "Metadata");
        for (MonitoringActivityItemDto item : response.getActivity()) {
            appendRow(csv, item.getOccurredAt(), item.getActivityType(), item.getTitle(), item.getMessage(), item.getActorName(), item.getActorRole(), item.getMetadata());
        }
        return csv.toString();
    }

    private void appendSection(StringBuilder csv, String title) {
        appendRow(csv, title);
    }

    private void appendHeader(StringBuilder csv, Object... values) {
        appendRow(csv, values);
    }

    private void appendBlank(StringBuilder csv) {
        csv.append('\n');
    }

    private void appendRow(StringBuilder csv, Object... values) {
        for (int index = 0; index < values.length; index++) {
            if (index > 0) {
                csv.append(',');
            }
            csv.append(csvCell(values[index]));
        }
        csv.append('\n');
    }

    private String csvCell(Object value) {
        if (value == null) {
            return "";
        }
        String clean = String.valueOf(value).replace("\r", " ").replace("\n", " ").trim();
        if (clean.contains(",") || clean.contains("\"") || clean.contains("\n")) {
            return "\"" + clean.replace("\"", "\"\"") + "\"";
        }
        return clean;
    }

    private String combineDateTime(LocalDate date, LocalTime time) {
        if (date == null && time == null) return null;
        if (date == null) return String.valueOf(time);
        if (time == null) return String.valueOf(date);
        return date + " " + time;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            if (notBlank(value)) {
                return value;
            }
        }
        return null;
    }

    private LocalDateTime toLocalDateTime(Date value) {
        if (value == null) return null;
        return LocalDateTime.ofInstant(value.toInstant(), ZoneId.systemDefault());
    }

    private record ActivityCopy(String title, String message, String severity) {
    }

    private List<MonitoringAlertDto> buildAlerts(
            CampaignRow campaign,
            Timing timing,
            MonitoringOverviewDto overview,
            List<RelationshipProgressDto> relationships,
            List<TargetHealthDto> targets,
            List<EvaluatorWorkloadDto> evaluators
    ) {
        List<MonitoringAlertDto> alerts = new ArrayList<>();

        if (overview.getTotalTargets() == 0) {
            alerts.add(alert(AlertType.NO_TARGETS, AlertSeverity.CRITICAL, "No targets selected", "This campaign has no target employees to monitor.", 0, "OPEN_TARGETS", "targets:none"));
        }
        if (overview.getTotalTargets() > 0 && overview.getTotalAssignments() == 0) {
            alerts.add(alert(AlertType.NO_ASSIGNMENTS, AlertSeverity.CRITICAL, "No evaluator assignments", "Generate evaluator assignments before campaign monitoring can become useful.", 0, "OPEN_EVALUATORS", "assignments:none"));
        }
        if (overview.getOverdueCount() > 0) {
            alerts.add(alert(AlertType.OVERDUE_ASSIGNMENTS, AlertSeverity.WARNING, "Overdue assignments", overview.getOverdueCount() + " assignment" + plural(overview.getOverdueCount()) + " are overdue.", overview.getOverdueCount(), "SEND_OVERDUE_REMINDER", "assignments:overdue"));
        }
        if (overview.getBlockedTargetCount() > 0) {
            alerts.add(alert(AlertType.TARGET_BLOCKED, AlertSeverity.CRITICAL, "Blocked targets", overview.getBlockedTargetCount() + " target" + plural(overview.getBlockedTargetCount()) + " cannot be closed until blocking issues are fixed.", overview.getBlockedTargetCount(), "OPEN_BLOCKED_TARGETS", "targets:blocked"));
        }
        if (overview.getAtRiskTargetCount() > 0) {
            alerts.add(alert(AlertType.TARGET_AT_RISK, AlertSeverity.WARNING, "Targets at risk", overview.getAtRiskTargetCount() + " target" + plural(overview.getAtRiskTargetCount()) + " need attention before the deadline.", overview.getAtRiskTargetCount(), "OPEN_AT_RISK_TARGETS", "targets:at-risk"));
        }
        relationships.stream()
                .filter(item -> "PEER".equals(item.getRelationshipType()) && item.getTargetsFailingPrivacy() > 0)
                .findFirst()
                .ifPresent(item -> alerts.add(alert(AlertType.PEER_PRIVACY_THRESHOLD_NOT_MET, AlertSeverity.WARNING, "Peer anonymity coverage not ready", item.getTargetsFailingPrivacy() + " target" + plural(item.getTargetsFailingPrivacy()) + " need at least " + MIN_PROTECTED_RESPONSES + " peer submissions.", item.getTargetsFailingPrivacy(), "OPEN_PEER_PRIVACY_RISKS", "relationship:peer:privacy")));
        relationships.stream()
                .filter(item -> "SUBORDINATE".equals(item.getRelationshipType()) && item.getTargetsFailingPrivacy() > 0)
                .findFirst()
                .ifPresent(item -> alerts.add(alert(AlertType.SUBORDINATE_PRIVACY_THRESHOLD_NOT_MET, AlertSeverity.WARNING, "Subordinate reviewer anonymity coverage not ready", item.getTargetsFailingPrivacy() + " target" + plural(item.getTargetsFailingPrivacy()) + " need enough subordinate reviewer submissions.", item.getTargetsFailingPrivacy(), "OPEN_SUBORDINATE_PRIVACY_RISKS", "relationship:subordinate:privacy")));

        int heavyEvaluatorCount = (int) evaluators.stream()
                .filter(item -> "HEAVY".equals(item.getWorkloadStatus()) || "OVERLOADED".equals(item.getWorkloadStatus()))
                .count();
        if (heavyEvaluatorCount > 0) {
            alerts.add(alert(AlertType.HEAVY_EVALUATOR_LOAD, AlertSeverity.WARNING, "Heavy evaluator workload", heavyEvaluatorCount + " evaluator" + plural(heavyEvaluatorCount) + " have a heavy pending workload.", heavyEvaluatorCount, "OPEN_EVALUATOR_WORKLOAD", "evaluators:heavy"));
        }

        double progressGap = percentValue(overview.getCompletionPercent()) - timing.expectedProgressPercent();
        if (progressGap <= EXPECTED_PROGRESS_WARNING_GAP && "ACTIVE".equals(campaign.status())) {
            alerts.add(alert(AlertType.CAMPAIGN_BEHIND_SCHEDULE, AlertSeverity.WARNING, "Campaign behind schedule", "Actual completion is " + Math.abs(round(progressGap)) + "% behind the expected progress for today.", 1, "SEND_REMINDER", "campaign:behind-schedule"));
        }

        boolean readyToClose = !targets.isEmpty() && targets.stream().allMatch(target -> Boolean.TRUE.equals(target.getReadyToClose()));
        if (readyToClose) {
            alerts.add(alert(AlertType.READY_TO_CLOSE, AlertSeverity.INFO, "Ready to close", "All monitored targets meet the required coverage checks.", targets.size(), "CLOSE_CAMPAIGN", "campaign:ready-to-close"));
        } else if ("ACTIVE".equals(campaign.status()) && overview.getTotalTargets() > 0) {
            alerts.add(alert(AlertType.NOT_READY_TO_CLOSE, AlertSeverity.WARNING, "Not ready to close", "Some targets still need required feedback, privacy coverage, or assignment fixes.", overview.getTotalTargets() - overview.getReadyToCloseTargetCount(), "OPEN_TARGETS", "campaign:not-ready-to-close"));
        }

        return alerts;
    }

    private MonitoringHealthStatus resolveCampaignHealth(MonitoringOverviewDto overview, List<TargetHealthDto> targets, Timing timing) {
        if (overview.getBlockedTargetCount() > 0) return MonitoringHealthStatus.BLOCKED;
        if (overview.getAtRiskTargetCount() > 0) return MonitoringHealthStatus.AT_RISK;
        if (overview.getNeedsAttentionTargetCount() > 0 || overview.getOverdueCount() > 0) return MonitoringHealthStatus.NEEDS_ATTENTION;
        if (!targets.isEmpty() && overview.getReadyToCloseTargetCount().equals(targets.size())) return MonitoringHealthStatus.READY;
        double gap = percentValue(overview.getCompletionPercent()) - timing.expectedProgressPercent();
        if (gap <= EXPECTED_PROGRESS_WARNING_GAP) return MonitoringHealthStatus.NEEDS_ATTENTION;
        return MonitoringHealthStatus.ON_TRACK;
    }

    private RelationshipCounts countAssignments(CampaignRow campaign, RequestRow request, List<AssignmentRow> assignments) {
        int submitted = 0;
        int inProgress = 0;
        int cancelled = 0;
        int declined = 0;
        int overdue = 0;
        int notStarted = 0;

        for (AssignmentRow assignment : assignments) {
            String status = effectiveAssignmentStatus(campaign, request, assignment.status());
            assignment.setMonitoringStatus(status);
            if ("SUBMITTED".equals(status)) submitted++;
            else if ("IN_PROGRESS".equals(status)) inProgress++;
            else if ("CANCELLED".equals(status) || "EXPIRED".equals(status)) cancelled++;
            else if ("DECLINED".equals(status)) declined++;
            else if ("OVERDUE".equals(status)) overdue++;
            else notStarted++;
        }

        int pending = assignments.size() - submitted - cancelled - declined;
        return new RelationshipCounts(assignments.size(), submitted, inProgress, cancelled, declined, overdue, notStarted, Math.max(0, pending));
    }

    private RelationshipCounts countAssignmentsForRelationship(CampaignRow campaign, Map<Long, RequestRow> requestById, List<AssignmentRow> assignments) {
        for (AssignmentRow assignment : assignments) {
            RequestRow request = requestById.get(assignment.requestId());
            if (request != null) {
                assignment.setMonitoringStatus(effectiveAssignmentStatus(campaign, request, assignment.status()));
            }
        }
        return countByMonitoringStatus(assignments);
    }

    private RelationshipCounts countAssignmentsForEvaluator(CampaignRow campaign, Map<Long, RequestRow> requestById, List<AssignmentRow> assignments) {
        for (AssignmentRow assignment : assignments) {
            RequestRow request = requestById.get(assignment.requestId());
            if (request != null) {
                assignment.setMonitoringStatus(effectiveAssignmentStatus(campaign, request, assignment.status()));
            }
        }
        return countByMonitoringStatus(assignments);
    }

    private RelationshipCounts countByMonitoringStatus(List<AssignmentRow> assignments) {
        int submitted = 0;
        int inProgress = 0;
        int cancelled = 0;
        int declined = 0;
        int overdue = 0;
        int notStarted = 0;

        for (AssignmentRow assignment : assignments) {
            String status = assignment.monitoringStatus();
            if ("SUBMITTED".equals(status)) submitted++;
            else if ("IN_PROGRESS".equals(status)) inProgress++;
            else if ("CANCELLED".equals(status) || "EXPIRED".equals(status)) cancelled++;
            else if ("DECLINED".equals(status)) declined++;
            else if ("OVERDUE".equals(status)) overdue++;
            else notStarted++;
        }

        int pending = assignments.size() - submitted - cancelled - declined;
        return new RelationshipCounts(assignments.size(), submitted, inProgress, cancelled, declined, overdue, notStarted, Math.max(0, pending));
    }

    private String effectiveAssignmentStatus(CampaignRow campaign, RequestRow request, String rawStatus) {
        String status = normalizeStatus(rawStatus, "PENDING");
        if (isTerminalStatus(status)) {
            return status;
        }

        LocalDate dueDate = request.dueAt() != null ? request.dueAt().toLocalDate() : campaign.endDate();
        if (dueDate != null && dueDate.isBefore(LocalDate.now())) {
            return "OVERDUE";
        }

        return status;
    }

    private boolean isTerminalStatus(String status) {
        return "SUBMITTED".equals(status) || "DECLINED".equals(status) || "CANCELLED".equals(status) || "EXPIRED".equals(status);
    }

    private MonitoringHealthStatus targetHealthStatus(
            boolean readyToClose,
            List<String> blockingReasons,
            List<String> warnings,
            boolean hasOverdue,
            double requiredCoverage,
            Timing timing,
            RelationshipCounts totalCounts
    ) {
        if (!blockingReasons.isEmpty()) {
            return MonitoringHealthStatus.BLOCKED;
        }
        if (readyToClose) {
            return MonitoringHealthStatus.READY;
        }
        if ((timing.daysRemaining() != null && timing.daysRemaining() <= DAYS_REMAINING_RISK_THRESHOLD && requiredCoverage < 100) || hasOverdue) {
            return MonitoringHealthStatus.AT_RISK;
        }
        if (!warnings.isEmpty() || requiredCoverage < 100 || totalCounts.pendingCount() > 0) {
            return MonitoringHealthStatus.NEEDS_ATTENTION;
        }
        return MonitoringHealthStatus.ON_TRACK;
    }

    private boolean isRequiredRelationship(String relationship, List<AssignmentRow> group) {
        if ("MANAGER".equals(relationship) || "PEER".equals(relationship) || "SELF".equals(relationship)) {
            return true;
        }
        return "SUBORDINATE".equals(relationship) && !group.isEmpty();
    }

    private boolean isProtectedRelationship(String relationship) {
        return PROTECTED_RELATIONSHIPS.contains(relationship);
    }

    private String relationshipStatus(boolean required, boolean completed, boolean privacyPassed, RelationshipCounts counts) {
        if (counts.assignedCount() <= 0) {
            return required ? "MISSING" : "NOT_APPLICABLE";
        }
        if (!privacyPassed) {
            return "PRIVACY_PENDING";
        }
        if (completed) {
            return "READY";
        }
        if (counts.overdueCount() > 0) {
            return "OVERDUE";
        }
        if (counts.inProgressCount() > 0) {
            return "IN_PROGRESS";
        }
        return "PENDING";
    }

    private String recommendedAction(
            boolean readyToClose,
            List<String> blockingReasons,
            List<String> warnings,
            boolean hasOverdue,
            List<TargetRelationshipStatusDto> relationshipStatuses
    ) {
        if (readyToClose) {
            return "No action needed. This target is ready to close.";
        }
        if (!blockingReasons.isEmpty()) {
            String first = blockingReasons.get(0).toLowerCase(Locale.ROOT);
            if (first.contains("manager")) return "Add or fix the manager evaluator.";
            if (first.contains("peer")) return "Add valid peer evaluators.";
            if (first.contains("self")) return "Add the self evaluator assignment.";
            return "Fix assignment blockers for this target.";
        }
        if (hasOverdue) {
            return "Send an overdue reminder to pending evaluators.";
        }
        for (TargetRelationshipStatusDto item : relationshipStatuses) {
            if ("PRIVACY_PENDING".equals(item.getStatus())) {
                return "Remind " + item.getLabel().toLowerCase(Locale.ROOT) + " evaluators or add replacements to meet anonymity coverage.";
            }
            if ("PENDING".equals(item.getStatus()) || "IN_PROGRESS".equals(item.getStatus())) {
                return "Remind pending " + item.getLabel().toLowerCase(Locale.ROOT) + " evaluators.";
            }
        }
        if (!warnings.isEmpty()) {
            return "Review warnings before closing this target.";
        }
        return "Review this target's feedback coverage.";
    }

    private String workloadStatus(int pendingCount) {
        if (pendingCount >= OVERLOADED_PENDING_THRESHOLD) return "OVERLOADED";
        if (pendingCount >= HEAVY_PENDING_THRESHOLD) return "HEAVY";
        return "NORMAL";
    }

    private Timing buildTiming(CampaignRow campaign) {
        LocalDate today = LocalDate.now();
        LocalDate start = campaign.startDate();
        LocalDate end = campaign.endDate();
        Integer daysRemaining = end == null ? null : Math.toIntExact(ChronoUnit.DAYS.between(today, end));
        int totalCampaignDays = 0;
        double expectedProgress = 0;

        if (start != null && end != null) {
            long total = Math.max(1, ChronoUnit.DAYS.between(start, end));
            long elapsed = Math.max(0, ChronoUnit.DAYS.between(start, today));
            totalCampaignDays = Math.toIntExact(total);
            expectedProgress = round(Math.min(100, Math.max(0, (elapsed * 100.0) / total)));
        }

        return new Timing(daysRemaining, totalCampaignDays, expectedProgress);
    }

    private LocalDateTime lastActivity(RequestRow request, List<AssignmentRow> assignments) {
        LocalDateTime last = request.updatedAt();
        for (AssignmentRow assignment : assignments) {
            if (assignment.updatedAt() != null && (last == null || assignment.updatedAt().isAfter(last))) {
                last = assignment.updatedAt();
            }
        }
        return last;
    }

    private MonitoringAlertDto alert(AlertType type, AlertSeverity severity, String title, String message, int affectedCount, String actionType, String filterKey) {
        return MonitoringAlertDto.builder()
                .alertType(type)
                .severity(severity)
                .title(title)
                .message(message)
                .affectedCount(affectedCount)
                .actionType(actionType)
                .filterKey(filterKey)
                .build();
    }

    private int countTargets(List<TargetHealthDto> targets, MonitoringHealthStatus status) {
        return (int) targets.stream().filter(target -> status.name().equals(target.getHealthStatus())).count();
    }

    private int healthRank(String status) {
        return switch (normalizeStatus(status, "ON_TRACK")) {
            case "BLOCKED" -> 0;
            case "AT_RISK" -> 1;
            case "NEEDS_ATTENTION" -> 2;
            case "ON_TRACK" -> 3;
            case "READY" -> 4;
            default -> 5;
        };
    }

    private String evaluatorKey(AssignmentRow assignment) {
        if (assignment.evaluatorEmployeeId() != null) return "employee:" + assignment.evaluatorEmployeeId();
        return "user:" + assignment.evaluatorUserId();
    }

    private String missingRelationshipMessage(String relationship) {
        return switch (relationship) {
            case "MANAGER" -> "Manager evaluator is missing.";
            case "PEER" -> "Peer evaluators are missing.";
            case "SELF" -> "Self evaluator assignment is missing.";
            case "SUBORDINATE" -> "Subordinate reviewer evaluators are missing.";
            default -> label(relationship) + " evaluator is missing.";
        };
    }

    private String pendingRelationshipMessage(String relationship) {
        return switch (relationship) {
            case "MANAGER" -> "Manager feedback is still pending.";
            case "PEER" -> "Peer feedback is still pending.";
            case "SELF" -> "Self feedback is still pending.";
            case "SUBORDINATE" -> "Subordinate reviewer feedback is still pending.";
            default -> label(relationship) + " feedback is still pending.";
        };
    }

    private String label(String relationship) {
        return switch (relationship) {
            case "MANAGER" -> "Manager";
            case "PEER" -> "Peer";
            case "SUBORDINATE" -> "Subordinate";
            case "SELF" -> "Self";
            default -> relationship == null ? "Unknown" : relationship.replace('_', ' ');
        };
    }

    private String plural(int count) {
        return count == 1 ? "" : "s";
    }

    private Double completionPercent(int submitted, int total) {
        if (total <= 0) return 0.0;
        return round((submitted * 100.0) / total);
    }

    private Double round(double value) {
        if (!Double.isFinite(value)) return 0.0;
        return BigDecimal.valueOf(value).setScale(2, RoundingMode.HALF_UP).doubleValue();
    }

    private double percentValue(Double value) {
        return value == null ? 0.0 : value;
    }

    private String normalizeStatus(Object value, String fallback) {
        if (value == null) return fallback;
        String clean = String.valueOf(value).trim();
        if (clean.isEmpty()) return fallback;
        return clean.toUpperCase(Locale.ROOT);
    }

    private String normalizeRelationship(Object value) {
        return normalizeStatus(value, "UNKNOWN");
    }

    private boolean notBlank(String value) {
        return value != null && !value.trim().isEmpty();
    }

    private String toText(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private Integer toInteger(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.intValue();
        return Integer.valueOf(String.valueOf(value));
    }

    private Long toLong(Object value) {
        if (value == null) return null;
        if (value instanceof Number number) return number.longValue();
        return Long.valueOf(String.valueOf(value));
    }

    private LocalDate toLocalDate(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDate localDate) return localDate;
        return LocalDate.parse(String.valueOf(value));
    }

    private LocalTime toLocalTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalTime localTime) return localTime;
        return LocalTime.parse(String.valueOf(value));
    }

    private LocalDateTime toLocalDateTime(Object value) {
        if (value == null) return null;
        if (value instanceof LocalDateTime localDateTime) return localDateTime;
        return LocalDateTime.parse(String.valueOf(value));
    }

    private record MonitoringSnapshot(FeedbackCampaignMonitoringResponse response) {
    }

    private record Timing(Integer daysRemaining, Integer totalCampaignDays, Double expectedProgressPercent) {
    }

    private record CampaignRow(
            Long id,
            String name,
            String status,
            Integer reviewYear,
            LocalDate startDate,
            LocalTime startTime,
            LocalDate endDate,
            LocalTime endTime
    ) {
    }

    private record RequestRow(
            Long id,
            String status,
            LocalDateTime dueAt,
            LocalDateTime updatedAt,
            Long targetEmployeeId,
            Long targetUserId,
            String targetEmployeeCode,
            String targetEmployeeEmail,
            String targetEmployeeName,
            Long departmentId,
            String departmentName,
            Long positionId,
            String positionName,
            Long managerEmployeeId,
            String managerName,
            String warningSnapshot
    ) {
    }

    private static class AssignmentRow {
        private final Long id;
        private final Long requestId;
        private final String status;
        private final String relationshipType;
        private final String selectionMethod;
        private final LocalDateTime updatedAt;
        private final Long evaluatorEmployeeId;
        private final Long evaluatorUserId;
        private final String evaluatorEmployeeCode;
        private final String evaluatorEmployeeEmail;
        private final String evaluatorEmployeeName;
        private final Long evaluatorDepartmentId;
        private final Long evaluatorPositionId;
        private final String evaluatorPositionName;
        private String monitoringStatus;

        private AssignmentRow(
                Long id,
                Long requestId,
                String status,
                String relationshipType,
                String selectionMethod,
                LocalDateTime updatedAt,
                Long evaluatorEmployeeId,
                Long evaluatorUserId,
                String evaluatorEmployeeCode,
                String evaluatorEmployeeEmail,
                String evaluatorEmployeeName,
                Long evaluatorDepartmentId,
                Long evaluatorPositionId,
                String evaluatorPositionName
        ) {
            this.id = id;
            this.requestId = requestId;
            this.status = status;
            this.relationshipType = relationshipType;
            this.selectionMethod = selectionMethod;
            this.updatedAt = updatedAt;
            this.evaluatorEmployeeId = evaluatorEmployeeId;
            this.evaluatorUserId = evaluatorUserId;
            this.evaluatorEmployeeCode = evaluatorEmployeeCode;
            this.evaluatorEmployeeEmail = evaluatorEmployeeEmail;
            this.evaluatorEmployeeName = evaluatorEmployeeName;
            this.evaluatorDepartmentId = evaluatorDepartmentId;
            this.evaluatorPositionId = evaluatorPositionId;
            this.evaluatorPositionName = evaluatorPositionName;
            this.monitoringStatus = status;
        }

        Long id() { return id; }
        Long requestId() { return requestId; }
        String status() { return status; }
        String relationshipType() { return relationshipType; }
        String selectionMethod() { return selectionMethod; }
        LocalDateTime updatedAt() { return updatedAt; }
        Long evaluatorEmployeeId() { return evaluatorEmployeeId; }
        Long evaluatorUserId() { return evaluatorUserId; }
        String evaluatorEmployeeCode() { return evaluatorEmployeeCode; }
        String evaluatorEmployeeEmail() { return evaluatorEmployeeEmail; }
        String evaluatorEmployeeName() { return evaluatorEmployeeName; }
        Long evaluatorDepartmentId() { return evaluatorDepartmentId; }
        Long evaluatorPositionId() { return evaluatorPositionId; }
        String evaluatorPositionName() { return evaluatorPositionName; }
        String monitoringStatus() { return monitoringStatus; }
        void setMonitoringStatus(String monitoringStatus) { this.monitoringStatus = monitoringStatus; }
    }

    private record RelationshipCounts(
            int assignedCount,
            int submittedCount,
            int inProgressCount,
            int cancelledCount,
            int declinedCount,
            int overdueCount,
            int notStartedCount,
            int pendingCount
    ) {
    }
}
