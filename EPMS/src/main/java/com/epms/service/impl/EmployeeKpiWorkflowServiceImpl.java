package com.epms.service.impl;

import com.epms.dto.*;
import com.epms.entity.*;
import com.epms.entity.enums.EmployeeKpiStatus;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.entity.enums.KpiGraceReason;
import com.epms.entity.enums.KpiPositionTransitionStatus;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.notification.NotificationEventKey;
import com.epms.repository.*;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.EmployeeKpiWorkflowService;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class EmployeeKpiWorkflowServiceImpl implements EmployeeKpiWorkflowService {

    public static final String TYPE_KPI_MANAGER_ASSIGNMENT = "KPI_MANAGER_ASSIGNMENT";
    public static final String TYPE_KPI_EMPLOYEE_ASSIGNMENT = "KPI_EMPLOYEE_ASSIGNMENT";
    public static final String TYPE_KPI_FINALIZED_EMPLOYEE = "KPI_FINALIZED_EMPLOYEE";
    public static final String TYPE_KPI_FINALIZED_HR = "KPI_FINALIZED_HR";
    public static final String TYPE_KPI_CYCLE_GRACE = "KPI_CYCLE_GRACE";
    public static final String TYPE_KPI_POSITION_CHANGE_GRACE = "KPI_POSITION_CHANGE_GRACE";

    private static final int KPI_GRACE_DAYS = 7;
    private static final List<String> MANAGER_ROLE_NAMES = List.of("MANAGER", "PROJECT_MANAGER", "TEAM_MANAGER");
    private static final List<String> DEPARTMENT_HEAD_ROLE_NAMES = List.of(
            "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT"
    );
    private static final List<String> HR_ROLE_NAMES = List.of("HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES", "HR_MANAGER", "HR_ADMIN");
    private static final List<String> EXECUTIVE_ROLE_NAMES = List.of("CEO", "EXECUTIVE");

    private final KpiFormRepository kpiFormRepository;
    private final KpiTemplateCycleRepository kpiTemplateCycleRepository;
    private final KpiTemplateCycleFormRepository kpiTemplateCycleFormRepository;
    private final KpiTemplateCyclePeriodRepository kpiTemplateCyclePeriodRepository;
    private final KpiPositionRepository kpiPositionRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeKpiFormRepository employeeKpiFormRepository;
    private final EmployeeKpiFormEvaluatorRepository employeeKpiFormEvaluatorRepository;
    private final EmployeeKpiPositionTransitionRepository employeeKpiPositionTransitionRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionRepository positionRepository;
    private final NotificationService notificationService;

    private static final List<KpiTemplateCyclePeriodStatus> ACTIVE_PERIOD_STATUSES =
            List.of(KpiTemplateCyclePeriodStatus.OPEN, KpiTemplateCyclePeriodStatus.CLOSING);

    @Override
    @Transactional
    public UseKpiTemplateResultDto useTemplateForDepartment(Integer kpiFormId, UseKpiDepartmentRequest request) {
        KpiForm form = kpiFormRepository.findDetailWithItemsById(kpiFormId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found."));

        if (form.getStatus() != KpiFormStatus.ACTIVE && form.getStatus() != KpiFormStatus.FINALIZED) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Only ACTIVE or FINALIZED KPI templates can be applied to a department."
            );
        }

        List<KpiPosition> links = kpiPositionRepository.findWithPositionByKpiForm_Id(kpiFormId);
        Set<Integer> positionIds = links.stream()
                .map(kp -> kp.getPosition().getId())
                .collect(Collectors.toSet());

        if (positionIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This KPI template has no linked positions.");
        }

        boolean allDepartments = Boolean.TRUE.equals(request.getApplyToAllDepartments());
        List<Integer> departmentIdsList = request.getDepartmentIds();
        boolean hasMulti = departmentIdsList != null && !departmentIdsList.isEmpty();

        List<Integer> targetDepartmentIds;
        NotifyPhraseKind phraseKind;

        if (allDepartments) {
            targetDepartmentIds = departmentRepository.findAll().stream()
                    .filter(d -> d.getStatus() == null || Boolean.TRUE.equals(d.getStatus()))
                    .sorted(Comparator.comparing(
                            d -> d.getDepartmentName() == null ? "" : d.getDepartmentName(),
                            String.CASE_INSENSITIVE_ORDER
                    ))
                    .map(Department::getId)
                    .toList();

            if (targetDepartmentIds.isEmpty()) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active departments are available.");
            }
            phraseKind = NotifyPhraseKind.ALL_ACTIVE;
        } else if (hasMulti) {
            targetDepartmentIds = departmentIdsList.stream().distinct().toList();
            for (Integer deptId : targetDepartmentIds) {
                departmentRepository.findById(deptId)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department not found: " + deptId));
            }
            phraseKind = targetDepartmentIds.size() == 1 ? NotifyPhraseKind.SINGLE_NAMED : NotifyPhraseKind.SELECTED_SET;
        } else if (request.getDepartmentId() != null) {
            Integer departmentId = request.getDepartmentId();
            departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department not found."));
            targetDepartmentIds = List.of(departmentId);
            phraseKind = NotifyPhraseKind.SINGLE_NAMED;
        } else {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Select one or more departments or choose all departments."
            );
        }

        AggregatedDeptApply aggregated = aggregateApplyAcrossDepartments(form, null, null, kpiFormId, positionIds, targetDepartmentIds);

        if (aggregated.departmentsWithMatches() == 0) {
            String msg = switch (phraseKind) {
                case ALL_ACTIVE -> "No active employees in any department match this template's positions.";
                case SELECTED_SET -> "No matching employees were found in the selected departments.";
                case SINGLE_NAMED -> "No active employees in this department match the template's positions.";
            };
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, msg);
        }

        employeeKpiFormRepository.flush();

        String notifyDetail = buildNotifyDetailPhrase(phraseKind, targetDepartmentIds);
        for (Integer mgrId : aggregated.managerIds()) {
            notificationService.sendEvent(
                    mgrId,
                    NotificationEventKey.KPI_SCORING_REQUESTED,
                    "KPI scoring requested",
                    "HR applied KPI template \"" + form.getTitle() + "\" " + notifyDetail
                            + ". Enter scores for assigned KPI accounts.",
                    TYPE_KPI_MANAGER_ASSIGNMENT,
                    form.getId()
            );
        }

        Integer deptCountForResponse = phraseKind == NotifyPhraseKind.SINGLE_NAMED ? null : aggregated.departmentsWithMatches();

        return UseKpiTemplateResultDto.builder()
                .assignmentsCreated(aggregated.created())
                .assignmentsSkippedExisting(aggregated.skipped())
                .managersNotified(aggregated.managerIds().size())
                .departmentsWithMatches(deptCountForResponse)
                .build();
    }

    private enum NotifyPhraseKind {
        ALL_ACTIVE,
        SELECTED_SET,
        SINGLE_NAMED
    }

    private String buildNotifyDetailPhrase(NotifyPhraseKind kind, List<Integer> targetDepartmentIds) {
        return switch (kind) {
            case ALL_ACTIVE -> "across all active departments";
            case SELECTED_SET -> "to the selected departments";
            case SINGLE_NAMED -> "to "
                    + departmentRepository.findById(targetDepartmentIds.get(0))
                    .map(Department::getDepartmentName)
                    .orElse("Department");
        };
    }

    private AggregatedDeptApply aggregateApplyAcrossDepartments(
            KpiForm form,
            KpiTemplateCycle cycle,
            KpiTemplateCyclePeriod cyclePeriod,
            Integer kpiFormId,
            Set<Integer> positionIds,
            List<Integer> departmentIds
    ) {
        int created = 0;
        int skipped = 0;
        int departmentsWithMatches = 0;
        LinkedHashSet<Integer> managers = new LinkedHashSet<>();

        for (Integer deptId : departmentIds) {
            DeptApplySlice slice = applyTemplateToDepartmentSlice(form, cycle, cyclePeriod, kpiFormId, deptId, positionIds);
            if (!slice.hadCandidates()) {
                continue;
            }
            departmentsWithMatches++;
            created += slice.created();
            skipped += slice.skipped();
            managers.addAll(slice.managerIds());
        }

        return new AggregatedDeptApply(created, skipped, departmentsWithMatches, managers);
    }

    private record AggregatedDeptApply(
            int created,
            int skipped,
            int departmentsWithMatches,
            LinkedHashSet<Integer> managerIds
    ) {
    }

    private DeptApplySlice applyTemplateToDepartmentSlice(
            KpiForm form,
            KpiTemplateCycle cycle,
            KpiTemplateCyclePeriod cyclePeriod,
            Integer kpiFormId,
            Integer departmentId,
            Set<Integer> positionIds
    ) {
        Map<Integer, Employee> activeDepartmentEmployees = activeDepartmentEmployees(departmentId);
        EvaluatorEmployeeRouting routing = evaluatorEmployeeRouting(departmentId, activeDepartmentEmployees);
        List<Employee> candidates = new ArrayList<>(activeDepartmentEmployees.values());

        if (candidates.isEmpty()) {
            log.info(
                    "KPI assignment diagnostics: templateId={}, cycleId={}, departmentId={} skipped because no active employees with active user accounts are linked to this department.",
                    kpiFormId,
                    cycle == null ? null : cycle.getId(),
                    departmentId
            );
            return DeptApplySlice.empty();
        }

        int created = 0;
        int skipped = 0;
        int skippedNoPosition = 0;
        int skippedPositionMismatch = 0;
        int matched = 0;
        Set<Integer> matchedEmployeeIds = new HashSet<>();

        for (Employee emp : candidates) {
            if (emp.getPosition() == null) {
                skippedNoPosition++;
                continue;
            }
            if (!positionIds.contains(emp.getPosition().getId())) {
                skippedPositionMismatch++;
                continue;
            }
            if (employeeKpiPositionTransitionRepository.existsByEmployee_IdAndStatus(
                    emp.getId(),
                    KpiPositionTransitionStatus.PENDING
            )) {
                skipped++;
                continue;
            }
            matched++;
            matchedEmployeeIds.add(emp.getId());

            if (hasExistingKpiAssignment(emp.getId(), kpiFormId, cycle, cyclePeriod)) {
                skipped++;
                continue;
            }

            EmployeeKpiForm ekf = EmployeeKpiForm.builder()
                    .employee(emp)
                    .kpiForm(form)
                    .kpiTemplateCycle(cycle)
                    .cyclePeriod(cyclePeriod)
                    .positionIdAtAssignment(emp.getPosition().getId())
                    .positionTitleAtAssignment(emp.getPosition().getPositionTitle())
                    .status(EmployeeKpiStatus.ASSIGNED)
                    .scores(new LinkedHashSet<>())
                    .evaluators(new LinkedHashSet<>())
                    .build();

            for (KpiFormItem item : form.getItems()) {
                EmployeeKpiScore row = EmployeeKpiScore.builder()
                        .kpiFormItem(item)
                        .build();
                ekf.addScore(row);
            }

            EmployeeKpiForm saved = employeeKpiFormRepository.save(ekf);
            notifyEmployeeKpiAssigned(emp, form, cycle, cyclePeriod, saved);
            for (Integer evaluatorId : routing.evaluatorIdsForEmployee(emp.getId())) {
                userRepository.findById(evaluatorId).ifPresent(evaluator -> {
                    if (!employeeKpiFormEvaluatorRepository.existsByEmployeeKpiForm_IdAndEvaluatorUser_Id(saved.getId(), evaluator.getId())) {
                        saved.addEvaluator(EmployeeKpiFormEvaluator.builder()
                                .employeeKpiForm(saved)
                                .evaluatorUser(evaluator)
                                .build());
                    }
                });
            }
            created++;
        }

        LinkedHashSet<Integer> managerIds = routing.evaluatorIdsWithAnyEmployee(matchedEmployeeIds);
        log.info(
                "KPI assignment diagnostics: templateId={}, cycleId={}, departmentId={}, routableCandidates={}, matchedByPosition={}, created={}, duplicateSkipped={}, noPositionSkipped={}, positionMismatchSkipped={}, managersWithMatches={}",
                kpiFormId,
                cycle == null ? null : cycle.getId(),
                departmentId,
                candidates.size(),
                matched,
                created,
                skipped,
                skippedNoPosition,
                skippedPositionMismatch,
                managerIds.size()
        );
        return new DeptApplySlice(matched > 0, created, skipped, managerIds);
    }

    private void notifyEmployeeKpiAssigned(
            Employee employee,
            KpiForm form,
            KpiTemplateCycle cycle,
            KpiTemplateCyclePeriod period,
            EmployeeKpiForm assignment
    ) {
        if (employee == null || employee.getId() == null || form == null || assignment == null || assignment.getId() == null) {
            return;
        }

        userRepository.findActiveByEmployeeId(employee.getId()).ifPresent(user -> {
            String cycleName = cycle == null || cycle.getCycleName() == null ? "the active KPI cycle" : cycle.getCycleName();
            String periodText = period == null || period.getPeriodNumber() == null ? "" : " period " + period.getPeriodNumber();
            notificationService.sendEventOnce(
                    user.getId(),
                    NotificationEventKey.KPI_EMPLOYEE_TARGET_ASSIGNED,
                    "KPI target assigned",
                    "A KPI target from template \"" + form.getTitle() + "\" was assigned to you for " + cycleName + periodText + ".",
                    TYPE_KPI_EMPLOYEE_ASSIGNMENT,
                    assignment.getId()
            );
        });
    }

    private boolean hasExistingKpiAssignment(
            Integer employeeId,
            Integer kpiFormId,
            KpiTemplateCycle cycle,
            KpiTemplateCyclePeriod cyclePeriod
    ) {
        if (cyclePeriod != null && cyclePeriod.getId() != null) {
            return employeeKpiFormRepository.findByEmployee_IdAndKpiForm_IdAndCyclePeriod_Id(
                    employeeId,
                    kpiFormId,
                    cyclePeriod.getId()
            ).isPresent();
        }
        if (cycle == null || cycle.getId() == null) {
            return employeeKpiFormRepository.findByEmployee_IdAndKpiForm_Id(employeeId, kpiFormId).isPresent();
        }
        return employeeKpiFormRepository.findByEmployee_IdAndKpiForm_IdAndKpiTemplateCycle_Id(
                employeeId,
                kpiFormId,
                cycle.getId()
        ).isPresent();
    }

    @Override
    @Transactional
    public UseKpiTemplateResultDto useCycleForAllActiveDepartments(Integer cycleId) {
        KpiTemplateCycle cycle = kpiTemplateCycleRepository.findById(cycleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template cycle not found."));
        List<Integer> targetDepartmentIds = activeDepartmentIds();
        if (targetDepartmentIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active departments are available.");
        }
        List<KpiTemplateCycleForm> links = kpiTemplateCycleFormRepository.findWithFormsByCycleId(cycleId);
        if (links.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This KPI cycle has no KPI templates.");
        }

        int created = 0;
        int skipped = 0;
        int departmentsWithMatches = 0;
        LinkedHashSet<Integer> managers = new LinkedHashSet<>();

        for (KpiTemplateCycleForm link : links) {
            KpiForm form = kpiFormRepository.findDetailWithItemsById(link.getKpiForm().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found."));
            List<KpiTemplateCyclePeriod> periods = ensureAllCycleFormPeriodsGenerated(cycle, form);
            KpiTemplateCyclePeriod period = pickActivePeriodForAssignment(periods, LocalDate.now());
            if (period == null) {
                continue;
            }
            AggregatedDeptApply aggregated = useCycleFormForDepartments(cycle, period, form, targetDepartmentIds);
            created += aggregated.created();
            skipped += aggregated.skipped();
            departmentsWithMatches += aggregated.departmentsWithMatches();
            managers.addAll(aggregated.managerIds());
        }

        employeeKpiFormRepository.flush();
        return UseKpiTemplateResultDto.builder()
                .assignmentsCreated(created)
                .assignmentsSkippedExisting(skipped)
                .managersNotified(managers.size())
                .departmentsWithMatches(departmentsWithMatches)
                .build();
    }

    @Override
    @Transactional
    public UseKpiTemplateResultDto useCyclePeriodForAllActiveDepartments(Integer cycleId, Integer cyclePeriodId) {
        KpiTemplateCycle cycle = kpiTemplateCycleRepository.findById(cycleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template cycle not found."));
        KpiTemplateCyclePeriod period = kpiTemplateCyclePeriodRepository.findById(cyclePeriodId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI cycle period not found."));

        List<Integer> targetDepartmentIds = activeDepartmentIds();
        if (targetDepartmentIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active departments are available.");
        }

        List<KpiTemplateCycleForm> links = kpiTemplateCycleFormRepository.findWithFormsByCycleId(cycleId);
        if (links.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This KPI cycle has no KPI templates.");
        }

        List<KpiForm> forms = period.getKpiForm() == null
                ? links.stream()
                .map(link -> link.getKpiForm())
                .toList()
                : List.of(period.getKpiForm());

        int created = 0;
        int skipped = 0;
        int departmentsWithMatches = 0;
        LinkedHashSet<Integer> managers = new LinkedHashSet<>();
        for (KpiForm linkForm : forms) {
            KpiForm form = kpiFormRepository.findDetailWithItemsById(linkForm.getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found."));
            AggregatedDeptApply aggregated = useCycleFormForDepartments(cycle, period, form, targetDepartmentIds);
            created += aggregated.created();
            skipped += aggregated.skipped();
            departmentsWithMatches += aggregated.departmentsWithMatches();
            managers.addAll(aggregated.managerIds());
        }

        employeeKpiFormRepository.flush();

        return UseKpiTemplateResultDto.builder()
                .assignmentsCreated(created)
                .assignmentsSkippedExisting(skipped)
                .managersNotified(managers.size())
                .departmentsWithMatches(departmentsWithMatches)
                .build();
    }

    private AggregatedDeptApply useCycleFormForDepartments(
            KpiTemplateCycle cycle,
            KpiTemplateCyclePeriod period,
            KpiForm form,
            List<Integer> targetDepartmentIds
    ) {
        List<KpiPosition> positionLinks = kpiPositionRepository.findWithPositionByKpiForm_Id(form.getId());
        Set<Integer> positionIds = positionLinks.stream()
                .filter(kp -> kp.getPosition() != null)
                .map(kp -> kp.getPosition().getId())
                .collect(Collectors.toSet());
        if (positionIds.isEmpty()) {
            log.info(
                    "KPI assignment diagnostics: cycleId={}, templateId={} skipped because the template has no linked positions.",
                    cycle.getId(),
                    form.getId()
            );
            return new AggregatedDeptApply(0, 0, 0, new LinkedHashSet<>());
        }

        AggregatedDeptApply aggregated = aggregateApplyAcrossDepartments(
                form,
                cycle,
                period,
                form.getId(),
                positionIds,
                targetDepartmentIds
        );
        for (Integer mgrId : aggregated.managerIds()) {
            notificationService.sendEvent(
                    mgrId,
                    NotificationEventKey.KPI_SCORING_REQUESTED,
                    "KPI scoring requested",
                    "HR activated KPI cycle \"" + cycle.getCycleName() + "\" with template \""
                            + form.getTitle()
                            + "\" for period " + period.getPeriodNumber()
                            + ". Enter scores for assigned KPI accounts.",
                    TYPE_KPI_MANAGER_ASSIGNMENT,
                    form.getId()
            );
        }
        return aggregated;
    }

    List<KpiTemplateCyclePeriod> ensureAllCycleFormPeriodsGenerated(KpiTemplateCycle cycle, KpiForm form) {
        if (cycle == null || cycle.getId() == null || form == null || form.getId() == null) {
            return List.of();
        }
        if (cycle.getStartDate() == null || cycle.getEndDate() == null || cycle.getStartDate().isAfter(cycle.getEndDate())) {
            return List.of();
        }

        List<KpiTemplateCyclePeriod> existing = new ArrayList<>(
                kpiTemplateCyclePeriodRepository.findByCycle_IdAndKpiForm_IdOrderByPeriodNumberAsc(cycle.getId(), form.getId())
        );
        Map<Integer, KpiTemplateCyclePeriod> byNumber = existing.stream()
                .filter(p -> p.getPeriodNumber() != null)
                .collect(Collectors.toMap(KpiTemplateCyclePeriod::getPeriodNumber, p -> p, (a, b) -> a, LinkedHashMap::new));

        int durationMonths = positionDurationMonths(form);
        LocalDate currentStart = cycle.getStartDate();
        int number = 1;
        List<KpiTemplateCyclePeriod> created = new ArrayList<>();

        while (currentStart != null && !currentStart.isAfter(cycle.getEndDate())) {
            LocalDate end = currentStart.plusMonths(durationMonths).minusDays(1);
            if (end.isAfter(cycle.getEndDate())) {
                end = cycle.getEndDate();
            }

            if (!byNumber.containsKey(number)) {
                KpiTemplateCyclePeriod period = KpiTemplateCyclePeriod.builder()
                        .cycle(cycle)
                        .kpiForm(form)
                        .periodNumber(number)
                        .startDate(currentStart)
                        .endDate(end)
                        .status(KpiTemplateCyclePeriodStatus.SCHEDULED)
                        .build();
                created.add(kpiTemplateCyclePeriodRepository.save(period));
            }

            if (end.equals(cycle.getEndDate())) {
                break;
            }
            currentStart = end.plusDays(1);
            number++;
        }

        if (!created.isEmpty()) {
            existing.addAll(created);
            existing.sort(Comparator.comparing(p -> p.getPeriodNumber() == null ? 0 : p.getPeriodNumber()));
        }

        boolean hasActive = existing.stream().anyMatch(p -> ACTIVE_PERIOD_STATUSES.contains(p.getStatus()));
        if (!hasActive) {
            KpiTemplateCyclePeriod toOpen = pickActivePeriodForAssignment(existing, LocalDate.now());
            if (toOpen != null && toOpen.getStatus() == KpiTemplateCyclePeriodStatus.SCHEDULED) {
                toOpen.setStatus(KpiTemplateCyclePeriodStatus.OPEN);
                kpiTemplateCyclePeriodRepository.save(toOpen);
            }
        }

        return existing;
    }

    private KpiTemplateCyclePeriod pickActivePeriodForAssignment(List<KpiTemplateCyclePeriod> periods, LocalDate today) {
        if (periods == null || periods.isEmpty()) {
            return null;
        }
        // Prefer an explicitly OPEN/CLOSING period if present.
        Optional<KpiTemplateCyclePeriod> open = periods.stream()
                .filter(p -> p.getStatus() == KpiTemplateCyclePeriodStatus.OPEN)
                .findFirst();
        if (open.isPresent()) {
            return open.get();
        }
        Optional<KpiTemplateCyclePeriod> closing = periods.stream()
                .filter(p -> p.getStatus() == KpiTemplateCyclePeriodStatus.CLOSING)
                .findFirst();
        if (closing.isPresent()) {
            return closing.get();
        }

        if (today == null) {
            return null;
        }

        // If activating before the cycle starts, use the first period.
        KpiTemplateCyclePeriod first = periods.stream()
                .filter(p -> p.getPeriodNumber() != null)
                .min(Comparator.comparing(KpiTemplateCyclePeriod::getPeriodNumber))
                .orElse(null);
        if (first != null && first.getStartDate() != null && today.isBefore(first.getStartDate())) {
            return first;
        }

        // Otherwise pick the period that contains today (scheduled/open/closing all ok).
        return periods.stream()
                .filter(p -> p.getStartDate() != null && p.getEndDate() != null)
                .filter(p -> !today.isBefore(p.getStartDate()) && !today.isAfter(p.getEndDate()))
                .findFirst()
                .orElse(null);
    }

    private int positionDurationMonths(KpiForm form) {
        return kpiPositionRepository.findWithPositionByKpiForm_Id(form.getId()).stream()
                .findFirst()
                .map(KpiPosition::getDurationMonths)
                .filter(months -> months != null && months >= 3 && months <= 12)
                .orElse(12);
    }

    private List<Integer> activeDepartmentIds() {
        return departmentRepository.findAll().stream()
                .filter(d -> d.getStatus() == null || Boolean.TRUE.equals(d.getStatus()))
                .sorted(Comparator.comparing(
                        d -> d.getDepartmentName() == null ? "" : d.getDepartmentName(),
                        String.CASE_INSENSITIVE_ORDER
                ))
                .map(Department::getId)
                .toList();
    }

    @Override
    @Transactional
    public void startCycleClosingGrace(Integer cycleId) {
        startCycleClosingGrace(cycleId, LocalDateTime.now().plusDays(KPI_GRACE_DAYS));
    }

    @Override
    @Transactional
    public void startCycleClosingGrace(Integer cycleId, LocalDateTime graceEnds) {
        KpiTemplateCycle cycle = kpiTemplateCycleRepository.findById(cycleId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template cycle not found."));
        LocalDateTime now = LocalDateTime.now();

        cycle.setStatus(KpiTemplateCycleStatus.CLOSING);
        cycle.setClosingRequestedAt(now);
        cycle.setGraceEndsAt(graceEnds);
        List<KpiTemplateCyclePeriod> periods = ensureAllPeriodsGeneratedForCycle(cycle);
        List<EmployeeKpiForm> openAssignments = new ArrayList<>();
        for (KpiTemplateCyclePeriod period : periods) {
            if (period.getStatus() == KpiTemplateCyclePeriodStatus.CLOSED) {
                continue;
            }
            period.setStatus(KpiTemplateCyclePeriodStatus.CLOSING);
            period.setClosingRequestedAt(now);
            period.setGraceEndsAt(graceEnds);
            openAssignments.addAll(employeeKpiFormRepository.findOpenByCyclePeriodIdWithDetail(
                    period.getId(),
                    List.of(EmployeeKpiStatus.FINALIZED, EmployeeKpiStatus.CLOSED)
            ));
            kpiTemplateCyclePeriodRepository.save(period);
        }
        for (EmployeeKpiForm assignment : openAssignments) {
            assignment.setGraceReason(KpiGraceReason.CYCLE_TERMINATION);
            assignment.setGraceEndsAt(graceEnds);
            employeeKpiFormRepository.save(assignment);
        }
        notifyEvaluatorsForAssignments(
                openAssignments,
                NotificationEventKey.KPI_CYCLE_WRAP_UP,
                "KPI cycle ending in 1 week",
                "The current KPI cycle \"" + cycle.getCycleName()
                        + "\" will officially end in one week. Please finalize actual scores before "
                        + graceEnds.toLocalDate() + ".",
                TYPE_KPI_CYCLE_GRACE
        );
        notifyExecutivesForCycleGrace(cycle, graceEnds);
        kpiTemplateCycleRepository.save(cycle);
    }

    private List<KpiTemplateCyclePeriod> ensureAllPeriodsGeneratedForCycle(KpiTemplateCycle cycle) {
        List<KpiTemplateCyclePeriod> all = new ArrayList<>();
        for (KpiTemplateCycleForm link : kpiTemplateCycleFormRepository.findWithFormsByCycleId(cycle.getId())) {
            KpiForm form = link.getKpiForm();
            if (form == null || form.getId() == null) {
                continue;
            }
            all.addAll(ensureAllCycleFormPeriodsGenerated(cycle, form));
        }
        return all;
    }

    private void notifyExecutivesForCycleGrace(KpiTemplateCycle cycle, LocalDateTime graceEnds) {
        for (User executive : activeUsersByRoles(EXECUTIVE_ROLE_NAMES)) {
            notificationService.sendEventOnce(
                    executive.getId(),
                    NotificationEventKey.KPI_CYCLE_WRAP_UP,
                    "KPI cycle wrapping up",
                    "KPI cycle \"" + cycle.getCycleName()
                            + "\" is being wrapped up. Pending KPI evaluations can continue until "
                            + graceEnds.toLocalDate()
                            + ". New evaluations can begin after HR launches the next KPI cycle.",
                    TYPE_KPI_CYCLE_GRACE,
                    cycle.getId()
            );
        }
    }

    @Override
    @Transactional
    public int runCycleMaintenance() {
        int processed = 0;
        LocalDate today = LocalDate.now();
        LocalDateTime now = LocalDateTime.now();

        processed += ensureActiveCyclePeriodSchedulesAndAssignments(today);

        for (KpiTemplateCyclePeriod period : kpiTemplateCyclePeriodRepository.findOpenPeriodsPastEnd(
                KpiTemplateCyclePeriodStatus.OPEN,
                today
        )) {
            KpiTemplateCycle cycle = period.getCycle();
            if (cycle.getStatus() != KpiTemplateCycleStatus.ACTIVE) {
                continue;
            }
            period.setStatus(KpiTemplateCyclePeriodStatus.CLOSED);
            period.setClosedAt(now);
            kpiTemplateCyclePeriodRepository.save(period);
            Optional<KpiTemplateCyclePeriod> nextPeriod = openNextScheduledPeriod(period);
            nextPeriod.ifPresent(next -> useCyclePeriodForAllActiveDepartments(cycle.getId(), next.getId()));
            if (nextPeriod.isEmpty()) {
                deactivateCycleIfComplete(cycle, now);
            }
            processed++;
        }

        for (KpiTemplateCyclePeriod period : kpiTemplateCyclePeriodRepository.findClosingPeriodsDue(
                KpiTemplateCyclePeriodStatus.CLOSING,
                now
        )) {
            closeCyclePeriodAfterGrace(period, now);
            processed++;
        }

        for (EmployeeKpiPositionTransition transition : employeeKpiPositionTransitionRepository.findDueTransitions(
                KpiPositionTransitionStatus.PENDING,
                now
        )) {
            closePositionTransitionAfterGrace(transition, now);
            processed++;
        }

        return processed;
    }

    private int ensureActiveCyclePeriodSchedulesAndAssignments(LocalDate today) {
        int processed = 0;
        for (KpiTemplateCycle cycle : kpiTemplateCycleRepository.findByStatus(KpiTemplateCycleStatus.ACTIVE)) {
            List<KpiTemplateCycleForm> links = kpiTemplateCycleFormRepository.findWithFormsByCycleId(cycle.getId());
            for (KpiTemplateCycleForm link : links) {
                if (link.getKpiForm() == null || link.getKpiForm().getId() == null) {
                    continue;
                }

                KpiForm form = kpiFormRepository.findDetailWithItemsById(link.getKpiForm().getId()).orElse(null);
                if (form == null) {
                    continue;
                }

                List<KpiTemplateCyclePeriod> periods = ensureAllCycleFormPeriodsGenerated(cycle, form);
                KpiTemplateCyclePeriod activePeriod = pickActivePeriodForAssignment(periods, today);
                if (activePeriod == null || activePeriod.getId() == null) {
                    continue;
                }

                if (!ACTIVE_PERIOD_STATUSES.contains(activePeriod.getStatus())) {
                    continue;
                }

                if (employeeKpiFormRepository.existsByCyclePeriod_Id(activePeriod.getId())) {
                    continue;
                }

                UseKpiTemplateResultDto result = useCyclePeriodForAllActiveDepartments(cycle.getId(), activePeriod.getId());
                if (result != null && result.getAssignmentsCreated() > 0) {
                    processed++;
                }
            }
        }
        return processed;
    }

    private Optional<KpiTemplateCyclePeriod> openNextScheduledPeriod(KpiTemplateCyclePeriod finished) {
        if (finished == null || finished.getCycle() == null || finished.getCycle().getId() == null) {
            return Optional.empty();
        }
        if (finished.getKpiForm() == null || finished.getKpiForm().getId() == null || finished.getPeriodNumber() == null) {
            return Optional.empty();
        }
        Integer cycleId = finished.getCycle().getId();
        Integer formId = finished.getKpiForm().getId();
        int nextNumber = finished.getPeriodNumber() + 1;
        Optional<KpiTemplateCyclePeriod> next = kpiTemplateCyclePeriodRepository
                .findByCycle_IdAndKpiForm_IdAndPeriodNumber(cycleId, formId, nextNumber);
        if (next.isEmpty()) {
            return Optional.empty();
        }
        KpiTemplateCyclePeriod p = next.get();
        if (p.getStatus() == KpiTemplateCyclePeriodStatus.SCHEDULED) {
            p.setStatus(KpiTemplateCyclePeriodStatus.OPEN);
            kpiTemplateCyclePeriodRepository.save(p);
        }
        return Optional.of(p);
    }

    private void closeCyclePeriodAfterGrace(KpiTemplateCyclePeriod period, LocalDateTime now) {
        List<EmployeeKpiForm> openAssignments = employeeKpiFormRepository.findOpenByCyclePeriodIdWithDetail(
                period.getId(),
                List.of(EmployeeKpiStatus.FINALIZED, EmployeeKpiStatus.CLOSED)
        );
        for (EmployeeKpiForm assignment : openAssignments) {
            finalizeIfCompleteOtherwiseClose(assignment, now);
        }
        KpiTemplateCycle cycle = period.getCycle();
        period.setStatus(KpiTemplateCyclePeriodStatus.CLOSED);
        period.setClosedAt(now);
        kpiTemplateCyclePeriodRepository.save(period);
        boolean hasOpenClosingPeriods = !kpiTemplateCyclePeriodRepository.findByCycle_IdAndStatusIn(
                cycle.getId(),
                List.of(KpiTemplateCyclePeriodStatus.OPEN, KpiTemplateCyclePeriodStatus.CLOSING)
        ).isEmpty();
        if (!hasOpenClosingPeriods) {
            cycle.setStatus(KpiTemplateCycleStatus.DEACTIVATED);
            cycle.setClosedAt(now);
            kpiTemplateCycleRepository.save(cycle);
        }
    }

    private void deactivateCycleIfComplete(KpiTemplateCycle cycle, LocalDateTime now) {
        boolean hasOpenPeriods = !kpiTemplateCyclePeriodRepository.findByCycle_IdAndStatusIn(
                cycle.getId(),
                List.of(KpiTemplateCyclePeriodStatus.SCHEDULED, KpiTemplateCyclePeriodStatus.OPEN, KpiTemplateCyclePeriodStatus.CLOSING)
        ).isEmpty();
        if (!hasOpenPeriods) {
            cycle.setStatus(KpiTemplateCycleStatus.DEACTIVATED);
            cycle.setClosedAt(now);
            kpiTemplateCycleRepository.save(cycle);
        }
    }

    private void closePositionTransitionAfterGrace(EmployeeKpiPositionTransition transition, LocalDateTime now) {
        EmployeeKpiForm oldAssignment = transition.getOldEmployeeKpiForm();
        if (oldAssignment != null && oldAssignment.getStatus() != EmployeeKpiStatus.FINALIZED) {
            finalizeIfCompleteOtherwiseClose(oldAssignment, now);
        }
        transition.setStatus(KpiPositionTransitionStatus.EXPIRED);
        transition.setCompletedAt(now);
        employeeKpiPositionTransitionRepository.save(transition);
        assignCurrentCycleKpiForEmployee(transition.getEmployee());
    }

    private void finalizeIfCompleteOtherwiseClose(EmployeeKpiForm assignment, LocalDateTime now) {
        if (assignment.getStatus() == EmployeeKpiStatus.FINALIZED || assignment.getStatus() == EmployeeKpiStatus.CLOSED) {
            return;
        }
        boolean complete = assignment.getScores() != null
                && !assignment.getScores().isEmpty()
                && assignment.getScores().stream().allMatch(score -> score.getScore() != null);
        if (complete) {
            assignment.calculateTotals();
            assignment.setStatus(EmployeeKpiStatus.FINALIZED);
            assignment.setFinalizedAt(now);
            assignment.setFinalizedBeforeEndDate(false);
            assignment.setSentAt(now);
        } else {
            assignment.setStatus(EmployeeKpiStatus.CLOSED);
            assignment.setClosedAt(now);
        }
        employeeKpiFormRepository.save(assignment);
    }

    @Override
    @Transactional
    public void handleEmployeePositionChanged(Integer employeeId, Integer oldPositionId, Integer newPositionId) {
        if (employeeId == null || Objects.equals(oldPositionId, newPositionId)) {
            return;
        }
        Employee employee = employeeRepository.findById(employeeId).orElse(null);
        if (employee == null || newPositionId == null) {
            return;
        }
        Position oldPosition = oldPositionId == null ? null : positionRepository.findById(oldPositionId).orElse(null);
        Position newPosition = positionRepository.findById(newPositionId).orElse(employee.getPosition());
        List<EmployeeKpiForm> openAssignments = employeeKpiFormRepository.findOpenByEmployeeIdWithDetail(
                        employeeId,
                        List.of(EmployeeKpiStatus.FINALIZED, EmployeeKpiStatus.CLOSED)
                ).stream()
                .filter(assignment -> assignment.getPositionIdAtAssignment() == null
                        || Objects.equals(assignment.getPositionIdAtAssignment(), oldPositionId))
                .toList();

        if (openAssignments.isEmpty()) {
            assignCurrentCycleKpiForEmployee(employee);
            return;
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime graceEnds = now.plusDays(KPI_GRACE_DAYS);
        for (EmployeeKpiForm oldAssignment : openAssignments) {
            oldAssignment.setGraceReason(KpiGraceReason.POSITION_CHANGE);
            oldAssignment.setGraceEndsAt(graceEnds);
            employeeKpiFormRepository.save(oldAssignment);

            boolean alreadyPending = employeeKpiPositionTransitionRepository
                    .existsByEmployee_IdAndStatus(employeeId, KpiPositionTransitionStatus.PENDING);
            if (!alreadyPending) {
                employeeKpiPositionTransitionRepository.save(EmployeeKpiPositionTransition.builder()
                        .employee(employee)
                        .oldPosition(oldPosition)
                        .newPosition(newPosition)
                        .oldEmployeeKpiForm(oldAssignment)
                        .requestedAt(now)
                        .graceEndsAt(graceEnds)
                        .status(KpiPositionTransitionStatus.PENDING)
                        .build());
            }
        }

        notifyEvaluatorsForAssignments(
                openAssignments,
                NotificationEventKey.KPI_POSITION_CHANGE_SCORING_REQUIRED,
                "KPI scoring required before position change closes",
                "Please compute and submit the scores within 1 week before the cycle closes.",
                TYPE_KPI_POSITION_CHANGE_GRACE
        );
    }

    private void completePendingTransitionsForFinalizedAssignments(List<Integer> assignmentIds, boolean expired) {
        if (assignmentIds == null || assignmentIds.isEmpty()) {
            return;
        }
        List<EmployeeKpiPositionTransition> transitions =
                employeeKpiPositionTransitionRepository.findByOldEmployeeKpiFormIdsAndStatus(
                        assignmentIds,
                        KpiPositionTransitionStatus.PENDING
                );
        LocalDateTime now = LocalDateTime.now();
        for (EmployeeKpiPositionTransition transition : transitions) {
            transition.setStatus(expired ? KpiPositionTransitionStatus.EXPIRED : KpiPositionTransitionStatus.COMPLETED);
            transition.setCompletedAt(now);
            employeeKpiPositionTransitionRepository.save(transition);
            assignCurrentCycleKpiForEmployee(transition.getEmployee());
        }
    }

    private void assignCurrentCycleKpiForEmployee(Employee employee) {
        if (employee == null || employee.getId() == null || employee.getPosition() == null) {
            return;
        }
        employee = employeeRepository.findWithDepartmentsById(employee.getId()).orElse(employee);
        if (employee.getPosition() == null) {
            return;
        }
        if (employeeKpiPositionTransitionRepository.existsByEmployee_IdAndStatus(
                employee.getId(),
                KpiPositionTransitionStatus.PENDING
        )) {
            return;
        }
        Integer workingDepartmentId = workingDepartmentId(employee);
        if (workingDepartmentId == null) {
            return;
        }

        Map<Integer, Employee> employeeMap = Map.of(employee.getId(), employee);
        EvaluatorEmployeeRouting routing = evaluatorEmployeeRouting(workingDepartmentId, employeeMap);
        for (KpiTemplateCycle cycle : kpiTemplateCycleRepository.findByStatus(KpiTemplateCycleStatus.ACTIVE)) {
            List<KpiTemplateCycleForm> links = kpiTemplateCycleFormRepository.findWithFormsByCycleId(cycle.getId());
            for (KpiTemplateCycleForm link : links) {
                KpiForm form = kpiFormRepository.findDetailWithItemsById(link.getKpiForm().getId()).orElse(null);
                if (form == null || !formMatchesPosition(form.getId(), employee.getPosition().getId())) {
                    continue;
                }
                List<KpiTemplateCyclePeriod> periods = ensureAllCycleFormPeriodsGenerated(cycle, form);
                KpiTemplateCyclePeriod period = pickActivePeriodForAssignment(periods, LocalDate.now());
                if (period == null) {
                    continue;
                }
                if (hasExistingKpiAssignment(employee.getId(), form.getId(), cycle, period)) {
                    continue;
                }
                EmployeeKpiForm assignment = EmployeeKpiForm.builder()
                        .employee(employee)
                        .kpiForm(form)
                        .kpiTemplateCycle(cycle)
                        .cyclePeriod(period)
                        .positionIdAtAssignment(employee.getPosition().getId())
                        .positionTitleAtAssignment(employee.getPosition().getPositionTitle())
                        .status(EmployeeKpiStatus.ASSIGNED)
                        .scores(new LinkedHashSet<>())
                        .evaluators(new LinkedHashSet<>())
                        .build();
                for (KpiFormItem item : form.getItems()) {
                    assignment.addScore(EmployeeKpiScore.builder().kpiFormItem(item).build());
                }
                EmployeeKpiForm saved = employeeKpiFormRepository.save(assignment);
                for (Integer evaluatorId : routing.evaluatorIdsForEmployee(employee.getId())) {
                    userRepository.findById(evaluatorId).ifPresent(evaluator ->
                            saved.addEvaluator(EmployeeKpiFormEvaluator.builder()
                                    .employeeKpiForm(saved)
                                    .evaluatorUser(evaluator)
                                    .build()));
                }
            }
        }
    }

    private boolean formMatchesPosition(Integer kpiFormId, Integer positionId) {
        return kpiPositionRepository.findWithPositionByKpiForm_Id(kpiFormId).stream()
                .anyMatch(link -> link.getPosition() != null && Objects.equals(link.getPosition().getId(), positionId));
    }

    private Integer workingDepartmentId(Employee employee) {
        if (employee == null || employee.getEmployeeDepartments() == null) {
            return null;
        }
        return employee.getEmployeeDepartments().stream()
                .filter(Objects::nonNull)
                .filter(row -> row.getEnddate() == null)
                .max(Comparator.comparing(row -> row.getStartdate() == null ? new Date(0) : row.getStartdate()))
                .map(row -> row.getParentDepartment() != null ? row.getParentDepartment() : row.getCurrentDepartment())
                .map(Department::getId)
                .orElse(null);
    }

    private void notifyEvaluatorsForAssignments(
            List<EmployeeKpiForm> assignments,
            String eventKey,
            String title,
            String message,
            String type
    ) {
        if (assignments == null || assignments.isEmpty()) {
            return;
        }
        List<Integer> evaluatorIds = employeeKpiFormEvaluatorRepository.findEvaluatorUserIdsByEmployeeKpiFormIdIn(
                assignments.stream().map(EmployeeKpiForm::getId).toList()
        );
        for (Integer evaluatorId : evaluatorIds) {
            notificationService.sendEventOnce(evaluatorId, eventKey, title, message, type);
        }
    }

    private record DeptApplySlice(boolean hadCandidates, int created, int skipped, LinkedHashSet<Integer> managerIds) {
        static DeptApplySlice empty() {
            return new DeptApplySlice(false, 0, 0, new LinkedHashSet<>());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManagerKpiTemplateSummaryDto> listKpiTemplatesForManagerDepartment() {
        List<Integer> employeeIds = currentEvaluatorScopedEmployeeIds();
        if (employeeIds.isEmpty()) {
            return List.of();
        }
        return employeeKpiFormRepository.summarizeByDepartmentEmployees(employeeIds);
    }

    @Override
    @Transactional
    public List<ManagerKpiAssignmentDto> listDepartmentAssignmentsForManager(Integer kpiFormId) {
        return listDepartmentAssignmentsForManager(kpiFormId, null);
    }

    @Override
    @Transactional
    public List<ManagerKpiAssignmentDto> listDepartmentAssignmentsForManager(Integer kpiFormId, Integer cyclePeriodId) {
        List<Integer> employeeIds = currentEvaluatorScopedEmployeeIds();
        if (employeeIds.isEmpty()) {
            return List.of();
        }

        KpiForm form = kpiFormRepository.findDetailWithItemsById(kpiFormId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found."));

        List<EmployeeKpiForm> forms = cyclePeriodId == null
                ? employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(kpiFormId, employeeIds)
                : employeeKpiFormRepository.findByKpiFormIdAndCyclePeriodIdAndEmployeeIdIn(kpiFormId, cyclePeriodId, employeeIds);
        reconcileMissingScoreRows(form, forms);
        return forms.stream().sorted(Comparator.comparing(ekf -> fullName(ekf.getEmployee()))).map(this::toManagerDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManagerKpiAssignmentDto> listFinalizedHistoryForManagerDepartment() {
        List<Integer> employeeIds = currentEvaluatorScopedEmployeeIds();
        if (employeeIds.isEmpty()) {
            return List.of();
        }
        return employeeKpiFormRepository.findByEmployeeIdInAndStatusWithDetail(
                        employeeIds,
                        EmployeeKpiStatus.FINALIZED
                )
                .stream()
                .map(this::toManagerDto)
                .toList();
    }

    @Override
    @Transactional
    public ManagerKpiAssignmentDto updateScores(Integer employeeKpiFormId, UpdateEmployeeKpiScoresRequest request) {
        Set<Integer> allowedEmployees = new HashSet<>(currentEvaluatorScopedEmployeeIds());

        EmployeeKpiForm ekf = employeeKpiFormRepository.findWithScoresForUpdate(employeeKpiFormId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI assignment not found."));

        if (!allowedEmployees.contains(ekf.getEmployee().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This assignment is outside your KPI evaluator scope.");
        }
        ensureActiveEmployeeAccount(ekf.getEmployee());

        if (ekf.getScores() == null) {
            ekf.setScores(new LinkedHashSet<>());
        }

        if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED || ekf.getStatus() == EmployeeKpiStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Scores cannot be changed after finalization.");
        }

        UserPrincipal principal = SecurityUtils.currentUser();
        User managerUser = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));

        Map<Integer, EmployeeKpiScore> byItemId = ekf.getScores().stream()
                .collect(Collectors.toMap(s -> s.getKpiFormItem().getId(), s -> s));

        for (UpdateEmployeeKpiScoresRequest.EmployeeKpiScoreUpdateDto row : request.getScores()) {
            if (row.getKpiFormItemId() == null) {
                continue;
            }
            EmployeeKpiScore sc = byItemId.get(row.getKpiFormItemId());
            if (sc == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown KPI row id: " + row.getKpiFormItemId());
            }

            boolean cleared =
                    row.getActualValue() == null
                            && row.getScore() == null;

            if (cleared) {
                sc.setActualValue(null);
                sc.setScore(null);
                sc.setWeightedScore(null);
                sc.setEvaluatedByUser(null);
                sc.setEvaluatedAt(null);
                continue;
            }

            KpiFormItem item = sc.getKpiFormItem();
            if (row.getActualValue() != null) {
                double actual = row.getActualValue();
                if (actual < 1 || actual > 100 || Double.isNaN(actual) || Double.isInfinite(actual)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actual value must be between 1 and 100.");
                }
                Double target = item != null ? item.getTarget() : null;
                if (target == null || target <= 0) {
                    String rowLabel = item == null
                            ? ("#" + row.getKpiFormItemId())
                            : Optional.ofNullable(item.getKpiItem()).map(KpiItem::getName).filter(s -> !s.isBlank())
                            .orElse(Optional.ofNullable(item.getKpiLabel()).filter(s -> !s.isBlank()).orElse("#" + item.getId()));
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "KPI row \"" + rowLabel + "\" has no valid target for (actual/target)×100."
                    );
                }
                if (actual > target) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Row " + rowNumber(ekf, sc) + ": Actual % must be less than or equal to Target %."
                    );
                }
                double achievementPct = (actual / target) * 100.0;
                sc.setActualValue(actual);
                sc.setScore(achievementPct);
                sc.calculateWeightedScore();
            } else if (row.getScore() != null) {
                double v = row.getScore();
                if (v < 0 || v > 100) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scores must be between 0 and 100.");
                }
                sc.setActualValue(null);
                sc.setScore(v);
                sc.calculateWeightedScore();
            }
            validateWeightScoreWithinWeight(ekf, sc);

            sc.setEvaluatedByUser(managerUser);
            sc.setEvaluatedAt(LocalDateTime.now());
        }

        ekf.calculateTotals();

        if (ekf.getStatus() == EmployeeKpiStatus.ASSIGNED) {
            ekf.setStatus(EmployeeKpiStatus.IN_PROGRESS);
        }

        employeeKpiFormRepository.save(ekf);
        return toManagerDto(ekf);
    }

    private void validateWeightScoreWithinWeight(EmployeeKpiForm ekf, EmployeeKpiScore score) {
        Double weightScore = score.getWeightedScore();
        KpiFormItem item = score.getKpiFormItem();
        Integer weight = item == null ? null : item.getWeight();
        if (weightScore != null && weight != null && weightScore > weight) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Row " + rowNumber(ekf, score) + ": Weight Score must be less than or equal to Weight %."
            );
        }
    }

    private int rowNumber(EmployeeKpiForm ekf, EmployeeKpiScore score) {
        if (ekf == null || ekf.getScores() == null || score == null || score.getKpiFormItem() == null) {
            return 1;
        }
        List<EmployeeKpiScore> ordered = ekf.getScores().stream()
                .sorted(Comparator.comparing(s -> {
                    KpiFormItem item = s.getKpiFormItem();
                    return item == null || item.getSortOrder() == null ? 0 : item.getSortOrder();
                }))
                .toList();
        for (int i = 0; i < ordered.size(); i++) {
            KpiFormItem item = ordered.get(i).getKpiFormItem();
            if (item != null && item.getId() != null && item.getId().equals(score.getKpiFormItem().getId())) {
                return i + 1;
            }
        }
        return 1;
    }

    @Override
    @Transactional
    public UseKpiTemplateResultDto finalizeDepartmentKpi(Integer kpiFormId) {
        return finalizeDepartmentKpi(kpiFormId, null);
    }

    @Override
    @Transactional
    public UseKpiTemplateResultDto finalizeDepartmentKpi(Integer kpiFormId, Integer cyclePeriodId) {
        List<Integer> employeeIds = currentEvaluatorScopedEmployeeIds();
        if (employeeIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No active employees found for your KPI evaluator scope.");
        }

        KpiForm form = kpiFormRepository.findById(kpiFormId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found."));

        List<EmployeeKpiForm> forms = cyclePeriodId == null
                ? employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(kpiFormId, employeeIds)
                : employeeKpiFormRepository.findByKpiFormIdAndCyclePeriodIdAndEmployeeIdIn(kpiFormId, cyclePeriodId, employeeIds);
        if (forms.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No KPI assignments for this template in your department.");
        }

        for (EmployeeKpiForm ekf : forms) {
            if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED || ekf.getStatus() == EmployeeKpiStatus.CLOSED) {
                continue;
            }
            for (EmployeeKpiScore sc : ekf.getScores()) {
                if (sc.getScore() == null) {
                    throw new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "Complete all KPI rows before finalizing (employee: " + fullName(ekf.getEmployee()) + ")."
                    );
                }
            }
        }

        List<EmployeeKpiForm> finalizedThisRun = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();
        User managerUser = currentUserEntity();

        for (EmployeeKpiForm ekf : forms) {
            if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED || ekf.getStatus() == EmployeeKpiStatus.CLOSED) {
                continue;
            }
            ekf.calculateTotals();
            ekf.setStatus(EmployeeKpiStatus.FINALIZED);
            ekf.setFinalizedAt(now);
            ekf.setFinalizedByUser(managerUser);
            ekf.setFinalizedBeforeEndDate(isBeforeOrOnPeriodEnd(ekf));
            ekf.setSentAt(now);
            employeeKpiFormRepository.save(ekf);
            finalizedThisRun.add(ekf);
        }

        employeeKpiFormRepository.flush();

        notifyEmployeesAndHrAfterFinalization(form, finalizedThisRun, false);
        completePendingTransitionsForFinalizedAssignments(
                finalizedThisRun.stream().map(EmployeeKpiForm::getId).toList(),
                false
        );

        return UseKpiTemplateResultDto.builder()
                .assignmentsCreated(finalizedThisRun.size())
                .assignmentsSkippedExisting(0)
                .managersNotified(0)
                .build();
    }

    @Override
    @Transactional
    public ManagerKpiAssignmentDto finalizeEmployeeKpi(Integer employeeKpiFormId, FinalizeEmployeeKpiRequest request) {
        Set<Integer> allowedEmployees = new HashSet<>(currentEvaluatorScopedEmployeeIds());

        EmployeeKpiForm ekf = employeeKpiFormRepository.findWithScoresForUpdate(employeeKpiFormId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI assignment not found."));

        if (!allowedEmployees.contains(ekf.getEmployee().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This assignment is outside your KPI evaluator scope.");
        }
        ensureActiveEmployeeAccount(ekf.getEmployee());
        if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED || ekf.getStatus() == EmployeeKpiStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "This KPI assignment is already finalized.");
        }
        if (ekf.getScores() == null || ekf.getScores().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No KPI rows are available to finalize.");
        }
        for (EmployeeKpiScore sc : ekf.getScores()) {
            if (sc.getScore() == null) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Complete all KPI rows before finalizing this employee."
                );
            }
        }

        String reason = request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Finalization reason is required.");
        }

        LocalDateTime now = LocalDateTime.now();
        ekf.calculateTotals();
        ekf.setStatus(EmployeeKpiStatus.FINALIZED);
        ekf.setFinalizedAt(now);
        ekf.setSentAt(now);
        ekf.setFinalizedByUser(currentUserEntity());
        ekf.setFinalizedBeforeEndDate(isBeforeOrOnPeriodEnd(ekf));
        ekf.setEarlyFinalizedReason(reason);
        employeeKpiFormRepository.saveAndFlush(ekf);

        notifyEmployeesAndHrAfterFinalization(ekf.getKpiForm(), List.of(ekf), false);
        completePendingTransitionsForFinalizedAssignments(List.of(ekf.getId()), false);
        return toManagerDto(ekf);
    }

    @Override
    @Transactional
    public int runAutoFinalizePastDueAssignments() {
        LocalDate today = LocalDate.now();
        List<EmployeeKpiForm> candidates = employeeKpiFormRepository.findNonFinalizedPastPeriodEnd(
                today,
                EmployeeKpiStatus.FINALIZED
        );

        List<EmployeeKpiForm> finalizedThisRun = new ArrayList<>();
        LocalDateTime now = LocalDateTime.now();

        for (EmployeeKpiForm ekf : candidates) {
            if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED || ekf.getStatus() == EmployeeKpiStatus.CLOSED) {
                continue;
            }
            if (ekf.getScores() == null || ekf.getScores().isEmpty()) {
                continue;
            }
            boolean complete = ekf.getScores().stream().allMatch(s -> s.getScore() != null);
            if (!complete) {
                continue;
            }

            ekf.calculateTotals();
            ekf.setStatus(EmployeeKpiStatus.FINALIZED);
            ekf.setFinalizedAt(now);
            ekf.setFinalizedBeforeEndDate(false);
            ekf.setSentAt(now);
            employeeKpiFormRepository.save(ekf);
            finalizedThisRun.add(ekf);
        }

        employeeKpiFormRepository.flush();

        if (!finalizedThisRun.isEmpty()) {
            Map<Integer, List<EmployeeKpiForm>> byFormId = finalizedThisRun.stream()
                    .collect(Collectors.groupingBy(ekf -> ekf.getKpiForm().getId()));
            for (List<EmployeeKpiForm> group : byFormId.values()) {
                KpiForm form = group.get(0).getKpiForm();
                notifyEmployeesAndHrAfterFinalization(form, group, true);
            }
            completePendingTransitionsForFinalizedAssignments(
                    finalizedThisRun.stream().map(EmployeeKpiForm::getId).toList(),
                    false
            );
        }

        return finalizedThisRun.size();
    }

    @Override
    @Transactional(readOnly = true)
    public List<HrEmployeeKpiRowDto> listFinalizedForHr() {
        return employeeKpiFormRepository.findAllByStatusWithDetail(EmployeeKpiStatus.FINALIZED).stream()
                .map(this::toHrRowDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<HrEmployeeKpiRowDto> listInProgressForHr() {
        List<EmployeeKpiStatus> statuses = List.of(EmployeeKpiStatus.ASSIGNED, EmployeeKpiStatus.IN_PROGRESS, EmployeeKpiStatus.CLOSED);
        return employeeKpiFormRepository.findAllWithDetailByStatusIn(statuses).stream()
                .sorted(
                        Comparator.comparing(
                                        (EmployeeKpiForm ekf) ->
                                                ekf.getKpiForm() != null && ekf.getKpiForm().getTitle() != null
                                                        ? ekf.getKpiForm().getTitle()
                                                        : "",
                                        String.CASE_INSENSITIVE_ORDER)
                                .thenComparing(ekf -> fullName(ekf.getEmployee()), String.CASE_INSENSITIVE_ORDER))
                .map(this::toHrRowDto)
                .toList();
    }

    private HrEmployeeKpiRowDto toHrRowDto(EmployeeKpiForm ekf) {
        Employee e = ekf.getEmployee();
        return HrEmployeeKpiRowDto.builder()
                .employeeKpiFormId(ekf.getId())
                .employeeId(e.getId())
                .employeeName(fullName(e))
                .departmentName(workingDepartmentName(e))
                .positionTitle(positionTitleForAssignment(ekf))
                .kpiFormId(ekf.getKpiForm().getId())
                .cyclePeriodId(ekf.getCyclePeriod() != null ? ekf.getCyclePeriod().getId() : null)
                .kpiTitle(ekf.getKpiForm().getTitle())
                .status(ekf.getStatus())
                .totalScore(ekf.getTotalScore())
                .totalWeightedScore(ekf.getTotalWeightedScore())
                .finalizedAt(ekf.getFinalizedAt())
                .earlyFinalizedReason(ekf.getEarlyFinalizedReason())
                .finalizedBeforeEndDate(ekf.getFinalizedBeforeEndDate())
                .periodStartDate(periodStartDate(ekf))
                .periodEndDate(periodEndDate(ekf))
                .graceReason(ekf.getGraceReason() != null ? ekf.getGraceReason().name() : null)
                .graceEndsAt(ekf.getGraceEndsAt())
                .lines(scoreLines(ekf))
                .build();
    }

    private static String workingDepartmentName(Employee e) {
        if (e == null || e.getEmployeeDepartments() == null) {
            return null;
        }
        for (EmployeeDepartment ed : e.getEmployeeDepartments()) {
            if (ed.getEnddate() != null) {
                continue;
            }
            Department d = ed.getParentDepartment() != null ? ed.getParentDepartment() : ed.getCurrentDepartment();
            if (d != null) {
                return d.getDepartmentName();
            }
        }
        return null;
    }

    private void notifyEmployeesAndHrAfterFinalization(KpiForm form, List<EmployeeKpiForm> finalizedThisRun, boolean periodEndAuto) {
        for (EmployeeKpiForm ekf : finalizedThisRun) {
            String weighted = ekf.getTotalWeightedScore() != null ? String.format("%.2f", ekf.getTotalWeightedScore()) : "—";
            String reason = ekf.getEarlyFinalizedReason() == null || ekf.getEarlyFinalizedReason().isBlank()
                    ? ""
                    : " Reason: " + ekf.getEarlyFinalizedReason().trim();
            String empDetail = periodEndAuto
                    ? ("KPI \"" + form.getTitle() + "\" was finalized after the scoring period ended. Weighted score: " + weighted + ".")
                    : ("Your manager finalized KPI \"" + form.getTitle() + "\". Weighted score: " + weighted + "." + reason);
            userRepository.findActiveByEmployeeId(ekf.getEmployee().getId()).ifPresent(u ->
                    notificationService.sendEvent(
                            u.getId(),
                            NotificationEventKey.KPI_RESULT_FINALIZED,
                            "KPI results finalized",
                            empDetail,
                            TYPE_KPI_FINALIZED_EMPLOYEE,
                            form.getId()
                    )
            );
        }

        if (!finalizedThisRun.isEmpty()) {
            List<User> hrUsers = userRepository.findActiveUsersByNormalizedRoleNames(
                    List.of("HR", "HRADMIN", "HR_MANAGER", "HR_ADMIN")
            );
            String summary = finalizedThisRun.stream()
                    .map(ekf -> fullName(ekf.getEmployee()) + " (" + (ekf.getTotalWeightedScore() != null
                            ? String.format("%.2f", ekf.getTotalWeightedScore())
                            : "—") + ")")
                    .collect(Collectors.joining(", "));
            String hrMessage = periodEndAuto
                    ? ("KPI \"" + form.getTitle() + "\" auto-finalized after period end for "
                    + finalizedThisRun.size() + " employee(s): " + summary + ".")
                    : ("KPI \"" + form.getTitle() + "\" finalized for "
                    + finalizedThisRun.size() + " employee(s): " + summary + "."
                    + firstReasonSummary(finalizedThisRun));
            for (User hr : hrUsers) {
                notificationService.sendEvent(hr.getId(), NotificationEventKey.KPI_HR_SUMMARY, "KPI finalized", hrMessage, TYPE_KPI_FINALIZED_HR, form.getId());
            }
        }
    }

    private String firstReasonSummary(List<EmployeeKpiForm> finalizedForms) {
        return finalizedForms.stream()
                .map(EmployeeKpiForm::getEarlyFinalizedReason)
                .filter(Objects::nonNull)
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .findFirst()
                .map(reason -> " Reason: " + reason)
                .orElse("");
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeKpiResultDto> listFinalizedForCurrentEmployee() {
        UserPrincipal principal = SecurityUtils.currentUser();
        User user = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
        if (user.getEmployeeId() == null) {
            return List.of();
        }

        Integer employeeId = user.getEmployeeId();

        List<EmployeeKpiForm> forms = new ArrayList<>(
                employeeKpiFormRepository.findDetailedByEmployeeAndStatus(employeeId, EmployeeKpiStatus.FINALIZED)
        );

        Set<Integer> seen = forms.stream().map(EmployeeKpiForm::getId).collect(Collectors.toCollection(LinkedHashSet::new));

        List<EmployeeKpiStatus> closedStatuses = List.of(EmployeeKpiStatus.CLOSED);
        employeeKpiFormRepository.findOpenByEmployeeIdWithDetail(employeeId, closedStatuses).stream()
                .filter(form -> !seen.contains(form.getId()))
                .filter(this::hasRecordedActualScores)
                .forEach(form -> {
                    forms.add(form);
                    seen.add(form.getId());
                });

        return forms.stream()
                .sorted(Comparator.comparing((EmployeeKpiForm ekf) -> ekf.getKpiForm().getTitle()))
                .map(this::toEmployeeResultDto)
                .toList();
    }

    private boolean hasRecordedActualScores(EmployeeKpiForm form) {
        if (form.getScores() == null || form.getScores().isEmpty()) {
            return false;
        }
        return form.getScores().stream().anyMatch(score -> score.getActualValue() != null);
    }

    private EmployeeKpiResultDto toEmployeeResultDto(EmployeeKpiForm ekf) {
        return EmployeeKpiResultDto.builder()
                .employeeKpiFormId(ekf.getId())
                .kpiFormId(ekf.getKpiForm().getId())
                .cyclePeriodId(ekf.getCyclePeriod() != null ? ekf.getCyclePeriod().getId() : null)
                .kpiTitle(ekf.getKpiForm().getTitle())
                .positionTitle(positionTitleForAssignment(ekf))
                .status(ekf.getStatus())
                .totalScore(ekf.getTotalScore())
                .totalWeightedScore(ekf.getTotalWeightedScore())
                .finalizedAt(ekf.getFinalizedAt())
                .earlyFinalizedReason(ekf.getEarlyFinalizedReason())
                .finalizedBeforeEndDate(ekf.getFinalizedBeforeEndDate())
                .lines(scoreLines(ekf))
                .build();
    }

    private ManagerKpiAssignmentDto toManagerDto(EmployeeKpiForm ekf) {
        return ManagerKpiAssignmentDto.builder()
                .employeeKpiFormId(ekf.getId())
                .employeeId(ekf.getEmployee().getId())
                .employeeName(fullName(ekf.getEmployee()))
                .departmentName(workingDepartmentName(ekf.getEmployee()))
                .positionTitle(positionTitleForAssignment(ekf))
                .kpiFormId(ekf.getKpiForm().getId())
                .cyclePeriodId(ekf.getCyclePeriod() != null ? ekf.getCyclePeriod().getId() : null)
                .kpiTitle(ekf.getKpiForm().getTitle())
                .status(ekf.getStatus())
                .totalScore(ekf.getTotalScore())
                .totalWeightedScore(ekf.getTotalWeightedScore())
                .finalizedAt(ekf.getFinalizedAt())
                .earlyFinalizedReason(ekf.getEarlyFinalizedReason())
                .finalizedBeforeEndDate(ekf.getFinalizedBeforeEndDate())
                .periodStartDate(periodStartDate(ekf))
                .periodEndDate(periodEndDate(ekf))
                .graceReason(ekf.getGraceReason() != null ? ekf.getGraceReason().name() : null)
                .graceEndsAt(ekf.getGraceEndsAt())
                .lines(scoreLines(ekf))
                .build();
    }

    private LocalDate periodStartDate(EmployeeKpiForm ekf) {
        if (ekf.getCyclePeriod() != null && ekf.getCyclePeriod().getStartDate() != null) {
            return ekf.getCyclePeriod().getStartDate();
        }
        if (ekf.getKpiTemplateCycle() != null && ekf.getKpiTemplateCycle().getStartDate() != null) {
            return ekf.getKpiTemplateCycle().getStartDate();
        }
        return ekf.getKpiForm() != null ? ekf.getKpiForm().getStartDate() : null;
    }

    private LocalDate periodEndDate(EmployeeKpiForm ekf) {
        if (ekf.getCyclePeriod() != null && ekf.getCyclePeriod().getEndDate() != null) {
            return ekf.getCyclePeriod().getEndDate();
        }
        if (ekf.getKpiTemplateCycle() != null && ekf.getKpiTemplateCycle().getEndDate() != null) {
            return ekf.getKpiTemplateCycle().getEndDate();
        }
        return ekf.getKpiForm() != null ? ekf.getKpiForm().getEndDate() : null;
    }

    private boolean isBeforeOrOnPeriodEnd(EmployeeKpiForm ekf) {
        LocalDate endDate = periodEndDate(ekf);
        return endDate != null && !LocalDate.now().isAfter(endDate);
    }

    private User currentUserEntity() {
        UserPrincipal principal = SecurityUtils.currentUser();
        return userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
    }

    private List<ManagerKpiScoreLineDto> scoreLines(EmployeeKpiForm ekf) {
        return ekf.getScores().stream()
                .sorted(Comparator.comparing(s -> s.getKpiFormItem().getSortOrder() == null
                        ? 0
                        : s.getKpiFormItem().getSortOrder()))
                .map(sc -> {
                    KpiFormItem item = sc.getKpiFormItem();
                    String label = item.getKpiItem() != null ? item.getKpiItem().getName() : item.getKpiLabel();
                    String category = item.getKpiCategory() != null ? item.getKpiCategory().getName() : item.getKpiCategoryLabel();
                    String unit = item.getKpiUnit() != null ? item.getKpiUnit().getName() : item.getKpiUnitLabel();
                    return ManagerKpiScoreLineDto.builder()
                            .kpiFormItemId(item.getId())
                            .kpiLabel(label)
                            .kpiCategoryName(category)
                            .weight(item.getWeight())
                            .target(item.getTarget())
                            .unitName(unit)
                            .actualValue(sc.getActualValue())
                            .score(sc.getScore())
                            .weightedScore(sc.getWeightedScore())
                            .build();
                })
                .toList();
    }

    private String positionTitleForAssignment(EmployeeKpiForm ekf) {
        if (ekf.getPositionTitleAtAssignment() != null && !ekf.getPositionTitleAtAssignment().isBlank()) {
            return ekf.getPositionTitleAtAssignment();
        }
        return ekf.getEmployee().getPosition() != null ? ekf.getEmployee().getPosition().getPositionTitle() : null;
    }

    private void reconcileMissingScoreRows(KpiForm form, Collection<EmployeeKpiForm> assignments) {
        if (form == null || form.getItems() == null || form.getItems().isEmpty() || assignments == null || assignments.isEmpty()) {
            return;
        }

        List<KpiFormItem> currentItems = form.getItems().stream()
                .filter(item -> item.getId() != null)
                .sorted(Comparator.comparing(item -> item.getSortOrder() == null ? 0 : item.getSortOrder()))
                .toList();
        if (currentItems.isEmpty()) {
            return;
        }

        for (EmployeeKpiForm assignment : assignments) {
            if (assignment == null || assignment.getStatus() == EmployeeKpiStatus.FINALIZED) {
                continue;
            }
            if (assignment.getScores() == null) {
                assignment.setScores(new LinkedHashSet<>());
            }

            Set<Integer> existingItemIds = assignment.getScores().stream()
                    .filter(score -> score.getKpiFormItem() != null && score.getKpiFormItem().getId() != null)
                    .map(score -> score.getKpiFormItem().getId())
                    .collect(Collectors.toCollection(HashSet::new));

            int added = 0;
            for (KpiFormItem item : currentItems) {
                if (existingItemIds.add(item.getId())) {
                    assignment.addScore(EmployeeKpiScore.builder()
                            .kpiFormItem(item)
                            .build());
                    added++;
                }
            }

            if (added > 0) {
                employeeKpiFormRepository.save(assignment);
                log.info(
                        "KPI score row reconciliation: employeeKpiFormId={}, kpiFormId={}, rowsAdded={}",
                        assignment.getId(),
                        form.getId(),
                        added
                );
            }
        }
    }

    private List<Integer> currentEvaluatorScopedEmployeeIds() {
        UserPrincipal principal = SecurityUtils.currentUser();
        User evaluator = userRepository.findById(principal.getId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
        List<Integer> storedEmployeeIds = employeeKpiFormEvaluatorRepository.findEmployeeIdsByEvaluatorUserId(evaluator.getId());
        LinkedHashSet<Integer> scoped = new LinkedHashSet<>(storedEmployeeIds == null ? List.of() : storedEmployeeIds);

        if (hasExecutiveScope(principal)) {
            scoped.addAll(executiveScopedEmployeeIds(evaluator.getId()));
            return scoped.stream().toList();
        }

        Integer deptId = requireManagerDepartmentId();
        if (hasDepartmentHeadScope(principal)) {
            scoped.addAll(departmentHeadScopedEmployeeIds(deptId, evaluator.getId()));
            return scoped.stream().toList();
        }
        if (hasManagerScope(principal)) {
            ManagerEmployeeRouting routing = managerEmployeeRouting(deptId);
            scoped.addAll(routing.employeeIdsForManager(evaluator.getId()));
            return scoped.stream().toList();
        }

        throw new ResponseStatusException(
                HttpStatus.FORBIDDEN,
                "Your account cannot calculate KPI scores."
        );
    }

    private Integer requireManagerDepartmentId() {
        Integer deptId = SecurityUtils.currentUser().getDepartmentId();
        if (deptId == null) {
            throw new ResponseStatusException(
                    HttpStatus.FORBIDDEN,
                    "Your account has no department assigned; KPI scoring is unavailable."
            );
        }
        return deptId;
    }

    private EvaluatorEmployeeRouting evaluatorEmployeeRouting(
            Integer departmentId,
            Map<Integer, Employee> activeDepartmentEmployees
    ) {
        Map<Integer, LinkedHashSet<Integer>> evaluatorEmployeeIds = new LinkedHashMap<>();
        ManagerEmployeeRouting managerRouting = managerEmployeeRouting(departmentId, activeDepartmentEmployees);
        evaluatorEmployeeIds.putAll(managerRouting.managerEmployeeIds());

        for (User departmentHead : userRepository.findActiveDepartmentHeadsByDepartmentId(departmentId)) {
            if (!isActiveUser(departmentHead)) {
                continue;
            }
            evaluatorEmployeeIds
                    .computeIfAbsent(departmentHead.getId(), ignored -> new LinkedHashSet<>())
                    .addAll(departmentHeadScopedEmployeeIds(departmentId, departmentHead.getId()));
        }

        LinkedHashSet<Integer> executiveTargetIds = executiveScopedEmployeeIds(null).stream()
                .filter(activeDepartmentEmployees::containsKey)
                .collect(Collectors.toCollection(LinkedHashSet::new));
        if (!executiveTargetIds.isEmpty()) {
            for (User executive : activeUsersByRoles(EXECUTIVE_ROLE_NAMES)) {
                if (isActiveUser(executive)) {
                    evaluatorEmployeeIds
                            .computeIfAbsent(executive.getId(), ignored -> new LinkedHashSet<>())
                            .addAll(executiveTargetIds);
                }
            }
        }

        return new EvaluatorEmployeeRouting(evaluatorEmployeeIds);
    }

    private ManagerEmployeeRouting managerEmployeeRouting(Integer departmentId) {
        return managerEmployeeRouting(departmentId, activeDepartmentEmployees(departmentId));
    }

    private ManagerEmployeeRouting managerEmployeeRouting(Integer departmentId, Map<Integer, Employee> activeDepartmentEmployees) {
        Map<Integer, LinkedHashSet<Integer>> managerEmployeeIds = new LinkedHashMap<>();
        Set<Integer> activeProjectManagerTeamEmployeeIds = new HashSet<>();
        Set<Integer> activeTeamLeaderEmployeeIds = new HashSet<>();
        Set<Integer> managersWithActiveTeams = new HashSet<>();
        Set<Integer> nonEmployeeTargetIds = privilegedTargetEmployeeIds();
        Map<Integer, Employee> managerAssignableEmployees = activeDepartmentEmployees.entrySet().stream()
                .filter(entry -> !nonEmployeeTargetIds.contains(entry.getKey()))
                .collect(Collectors.toMap(Map.Entry::getKey, Map.Entry::getValue, (left, right) -> left, LinkedHashMap::new));

        for (Team team : teamRepository.findByDepartmentIdAndStatusIgnoreCase(departmentId, "Active")) {
            User teamLeader = team.getTeamLeader();
            Integer teamLeaderEmployeeId = teamLeader == null ? null : teamLeader.getEmployeeId();
            if (isActiveUser(teamLeader)
                    && teamLeaderEmployeeId != null
                    && managerAssignableEmployees.containsKey(teamLeaderEmployeeId)) {
                activeTeamLeaderEmployeeIds.add(teamLeaderEmployeeId);
                activeProjectManagerTeamEmployeeIds.add(teamLeaderEmployeeId);
            }

            User manager = team.getProjectManager();
            if (!isActiveUser(manager)) {
                continue;
            }
            managersWithActiveTeams.add(manager.getId());
            LinkedHashSet<Integer> scopedIds = managerEmployeeIds.computeIfAbsent(manager.getId(), ignored -> new LinkedHashSet<>());
            if (team.getTeamMembers() == null) {
                continue;
            }
            for (TeamMember member : team.getTeamMembers()) {
                User memberUser = member == null ? null : member.getMemberUser();
                Integer employeeId = memberUser == null ? null : memberUser.getEmployeeId();
                if (member == null
                        || member.getEndedDate() != null
                        || !isActiveUser(memberUser)
                        || employeeId == null
                        || !managerAssignableEmployees.containsKey(employeeId)
                        || Objects.equals(employeeId, manager.getEmployeeId())) {
                    continue;
                }
                scopedIds.add(employeeId);
                activeProjectManagerTeamEmployeeIds.add(employeeId);
            }
        }

        List<User> departmentManagers = userRepository.findActiveManagersByDepartmentId(departmentId);
        List<Integer> teamlessEmployeeIds = managerAssignableEmployees.keySet().stream()
                .filter(employeeId -> !activeProjectManagerTeamEmployeeIds.contains(employeeId))
                .toList();
        for (User manager : departmentManagers) {
            if (!isActiveUser(manager)) {
                continue;
            }
            LinkedHashSet<Integer> scopedIds = managerEmployeeIds.computeIfAbsent(manager.getId(), ignored -> new LinkedHashSet<>());
            scopedIds.addAll(activeTeamLeaderEmployeeIds.stream()
                    .filter(employeeId -> !Objects.equals(employeeId, manager.getEmployeeId()))
                    .toList());

            if (managersWithActiveTeams.contains(manager.getId())) {
                continue;
            }
            managerEmployeeIds
                    .computeIfAbsent(manager.getId(), ignored -> new LinkedHashSet<>())
                    .addAll(teamlessEmployeeIds.stream()
                            .filter(employeeId -> !Objects.equals(employeeId, manager.getEmployeeId()))
                            .toList());
        }

        Map<Integer, Employee> routableEmployees = managerEmployeeIds.values().stream()
                .flatMap(Collection::stream)
                .distinct()
                .map(managerAssignableEmployees::get)
                .filter(Objects::nonNull)
                .collect(Collectors.toMap(Employee::getId, e -> e, (left, right) -> left, LinkedHashMap::new));

        return new ManagerEmployeeRouting(managerEmployeeIds, routableEmployees);
    }

    private Map<Integer, Employee> activeDepartmentEmployees(Integer departmentId) {
        return employeeRepository
                .findCurrentByWorkingDepartmentId(departmentId, false)
                .stream()
                .filter(this::hasActiveEmployeeAccount)
                .collect(Collectors.toMap(Employee::getId, e -> e, (left, right) -> left, LinkedHashMap::new));
    }

    private LinkedHashSet<Integer> departmentHeadScopedEmployeeIds(Integer departmentId, Integer evaluatorUserId) {
        return userRepository.findActiveManagersByDepartmentId(departmentId).stream()
                .filter(this::isActiveUser)
                .filter(user -> !Objects.equals(user.getId(), evaluatorUserId))
                .filter(user -> user.getEmployeeId() != null)
                .filter(user -> hasActiveEmployeeAccount(user.getEmployeeId()))
                .map(User::getEmployeeId)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private LinkedHashSet<Integer> executiveScopedEmployeeIds(Integer evaluatorUserId) {
        LinkedHashSet<Integer> ids = new LinkedHashSet<>();
        activeUsersByRoles(DEPARTMENT_HEAD_ROLE_NAMES).stream()
                .filter(user -> !Objects.equals(user.getId(), evaluatorUserId))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .filter(this::hasActiveEmployeeAccount)
                .forEach(ids::add);
        activeUsersByRoles(HR_ROLE_NAMES).stream()
                .filter(user -> !Objects.equals(user.getId(), evaluatorUserId))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .filter(this::hasActiveEmployeeAccount)
                .forEach(ids::add);
        return ids;
    }

    private Set<Integer> privilegedTargetEmployeeIds() {
        LinkedHashSet<Integer> ids = new LinkedHashSet<>();
        activeUsersByRoles(MANAGER_ROLE_NAMES).stream().map(User::getEmployeeId).filter(Objects::nonNull).forEach(ids::add);
        activeUsersByRoles(DEPARTMENT_HEAD_ROLE_NAMES).stream().map(User::getEmployeeId).filter(Objects::nonNull).forEach(ids::add);
        activeUsersByRoles(HR_ROLE_NAMES).stream().map(User::getEmployeeId).filter(Objects::nonNull).forEach(ids::add);
        activeUsersByRoles(EXECUTIVE_ROLE_NAMES).stream().map(User::getEmployeeId).filter(Objects::nonNull).forEach(ids::add);
        return ids;
    }

    private List<User> activeUsersByRoles(Collection<String> roleNames) {
        return userRepository.findActiveUsersByNormalizedRoleNames(roleNames).stream()
                .filter(this::isActiveUser)
                .toList();
    }

    private void ensureActiveEmployeeAccount(Employee employee) {
        if (!hasActiveEmployeeAccount(employee)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Scores can be calculated only for active team member accounts."
            );
        }
    }

    private boolean hasActiveEmployeeAccount(Employee employee) {
        return employee != null
                && activeFlag(employee.getActive())
                && employee.getId() != null
                && userRepository.findActiveByEmployeeId(employee.getId()).isPresent();
    }

    private boolean hasActiveEmployeeAccount(Integer employeeId) {
        return employeeId != null
                && employeeRepository.findById(employeeId)
                .filter(this::hasActiveEmployeeAccount)
                .isPresent();
    }

    private boolean isActiveUser(User user) {
        return user != null && user.getId() != null && activeFlag(user.getActive());
    }

    private boolean activeFlag(Boolean value) {
        return value == null || Boolean.TRUE.equals(value);
    }

    private boolean hasManagerScope(UserPrincipal principal) {
        return hasAnyAuthority(principal, MANAGER_ROLE_NAMES, Set.of("MANAGER_DASHBOARD"));
    }

    private boolean hasDepartmentHeadScope(UserPrincipal principal) {
        return hasAnyAuthority(
                principal,
                DEPARTMENT_HEAD_ROLE_NAMES,
                Set.of("DEPARTMENT_HEAD_DASHBOARD", "DEPARTMENTHEAD_DASHBOARD", "DEPT_HEAD_DASHBOARD")
        );
    }

    private boolean hasExecutiveScope(UserPrincipal principal) {
        return hasAnyAuthority(principal, EXECUTIVE_ROLE_NAMES, Set.of("EXECUTIVE_DASHBOARD", "CEO_DASHBOARD"));
    }

    private boolean hasAnyAuthority(UserPrincipal principal, Collection<String> roleNames, Collection<String> dashboardNames) {
        Set<String> roles = roleNames.stream().map(this::normalizeAuthorityName).collect(Collectors.toSet());
        Set<String> dashboards = dashboardNames.stream().map(this::normalizeAuthorityName).collect(Collectors.toSet());
        if (dashboards.contains(normalizeAuthorityName(principal.getDashboard()))) {
            return true;
        }
        if (principal.getRoles() != null && principal.getRoles().stream().map(this::normalizeAuthorityName).anyMatch(roles::contains)) {
            return true;
        }
        String position = normalizeAuthorityName(principal.getPosition());
        return roles.stream().anyMatch(position::contains);
    }

    private String normalizeAuthorityName(String value) {
        if (value == null) {
            return "";
        }
        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }

    private record EvaluatorEmployeeRouting(Map<Integer, LinkedHashSet<Integer>> evaluatorEmployeeIds) {
        LinkedHashSet<Integer> evaluatorIdsWithAnyEmployee(Set<Integer> employeeIds) {
            LinkedHashSet<Integer> ids = new LinkedHashSet<>();
            if (employeeIds == null || employeeIds.isEmpty()) {
                return ids;
            }
            for (Map.Entry<Integer, LinkedHashSet<Integer>> entry : evaluatorEmployeeIds.entrySet()) {
                if (entry.getValue().stream().anyMatch(employeeIds::contains)) {
                    ids.add(entry.getKey());
                }
            }
            return ids;
        }

        LinkedHashSet<Integer> evaluatorIdsForEmployee(Integer employeeId) {
            LinkedHashSet<Integer> ids = new LinkedHashSet<>();
            if (employeeId == null) {
                return ids;
            }
            for (Map.Entry<Integer, LinkedHashSet<Integer>> entry : evaluatorEmployeeIds.entrySet()) {
                if (entry.getValue().contains(employeeId)) {
                    ids.add(entry.getKey());
                }
            }
            return ids;
        }
    }

    private record ManagerEmployeeRouting(
            Map<Integer, LinkedHashSet<Integer>> managerEmployeeIds,
            Map<Integer, Employee> routableEmployeesById
    ) {
        LinkedHashSet<Integer> managerIds() {
            return new LinkedHashSet<>(managerEmployeeIds.keySet());
        }

        LinkedHashSet<Integer> employeeIdsForManager(Integer managerId) {
            return new LinkedHashSet<>(managerEmployeeIds.getOrDefault(managerId, new LinkedHashSet<>()));
        }

        LinkedHashSet<Integer> managerIdsWithAnyEmployee(Set<Integer> employeeIds) {
            LinkedHashSet<Integer> ids = new LinkedHashSet<>();
            if (employeeIds == null || employeeIds.isEmpty()) {
                return ids;
            }
            for (Map.Entry<Integer, LinkedHashSet<Integer>> entry : managerEmployeeIds.entrySet()) {
                if (entry.getValue().stream().anyMatch(employeeIds::contains)) {
                    ids.add(entry.getKey());
                }
            }
            return ids;
        }
    }

    private static String fullName(Employee e) {
        String fn = e.getFirstName() != null ? e.getFirstName() : "";
        String ln = e.getLastName() != null ? e.getLastName() : "";
        String s = (fn + " " + ln).trim();
        return s.isEmpty() ? ("Employee #" + e.getId()) : s;
    }
}
