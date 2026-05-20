package com.epms.service.impl;

import com.epms.dto.*;
import com.epms.entity.*;
import com.epms.entity.enums.EmployeeKpiStatus;
import com.epms.entity.enums.KpiFormStatus;
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
    public static final String TYPE_KPI_FINALIZED_EMPLOYEE = "KPI_FINALIZED_EMPLOYEE";
    public static final String TYPE_KPI_FINALIZED_HR = "KPI_FINALIZED_HR";

    private final KpiFormRepository kpiFormRepository;
    private final KpiTemplateCycleRepository kpiTemplateCycleRepository;
    private final KpiTemplateCycleFormRepository kpiTemplateCycleFormRepository;
    private final KpiPositionRepository kpiPositionRepository;
    private final EmployeeRepository employeeRepository;
    private final EmployeeKpiFormRepository employeeKpiFormRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final DepartmentRepository departmentRepository;
    private final NotificationService notificationService;

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

        AggregatedDeptApply aggregated = aggregateApplyAcrossDepartments(form, null, kpiFormId, positionIds, targetDepartmentIds);

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
            notificationService.send(
                    mgrId,
                    "KPI scoring requested",
                    "HR applied KPI template \"" + form.getTitle() + "\" " + notifyDetail
                            + ". Enter scores for assigned employees in your department.",
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
            Integer kpiFormId,
            Set<Integer> positionIds,
            List<Integer> departmentIds
    ) {
        int created = 0;
        int skipped = 0;
        int departmentsWithMatches = 0;
        LinkedHashSet<Integer> managers = new LinkedHashSet<>();

        for (Integer deptId : departmentIds) {
            DeptApplySlice slice = applyTemplateToDepartmentSlice(form, cycle, kpiFormId, deptId, positionIds);
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
            Integer kpiFormId,
            Integer departmentId,
            Set<Integer> positionIds
    ) {
        List<Employee> candidates = employeeRepository.findCurrentByWorkingDepartmentId(departmentId, false);

        if (candidates.isEmpty()) {
            log.info(
                    "KPI assignment diagnostics: templateId={}, cycleId={}, departmentId={} skipped because no active employees are linked to this department.",
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

        for (Employee emp : candidates) {
            if (emp.getPosition() == null) {
                skippedNoPosition++;
                continue;
            }
            if (!positionIds.contains(emp.getPosition().getId())) {
                skippedPositionMismatch++;
                continue;
            }
            matched++;

            if (hasExistingKpiAssignment(emp.getId(), kpiFormId, cycle)) {
                skipped++;
                continue;
            }

            EmployeeKpiForm ekf = EmployeeKpiForm.builder()
                    .employee(emp)
                    .kpiForm(form)
                    .kpiTemplateCycle(cycle)
                    .status(EmployeeKpiStatus.ASSIGNED)
                    .scores(new LinkedHashSet<>())
                    .build();

            for (KpiFormItem item : form.getItems()) {
                EmployeeKpiScore row = EmployeeKpiScore.builder()
                        .kpiFormItem(item)
                        .build();
                ekf.addScore(row);
            }

            employeeKpiFormRepository.save(ekf);
            created++;
        }

        LinkedHashSet<Integer> managerIds = resolveManagerUserIds(departmentId);
        log.info(
                "KPI assignment diagnostics: templateId={}, cycleId={}, departmentId={}, candidates={}, matchedByPosition={}, created={}, duplicateSkipped={}, noPositionSkipped={}, positionMismatchSkipped={}, managers={}",
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

    private boolean hasExistingKpiAssignment(Integer employeeId, Integer kpiFormId, KpiTemplateCycle cycle) {
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

        int created = 0;
        int skipped = 0;
        int departmentsWithMatches = 0;
        LinkedHashSet<Integer> managers = new LinkedHashSet<>();

        List<KpiTemplateCycleForm> links = kpiTemplateCycleFormRepository.findWithFormsByCycleId(cycleId);
        if (links.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This KPI cycle has no KPI templates.");
        }

        for (KpiTemplateCycleForm link : links) {
            KpiForm form = kpiFormRepository.findDetailWithItemsById(link.getKpiForm().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found."));
            List<KpiPosition> positionLinks = kpiPositionRepository.findWithPositionByKpiForm_Id(form.getId());
            Set<Integer> positionIds = positionLinks.stream()
                    .map(kp -> kp.getPosition().getId())
                    .collect(Collectors.toSet());
            if (positionIds.isEmpty()) {
                log.info(
                        "KPI assignment diagnostics: cycleId={}, templateId={} skipped because the template has no linked positions.",
                        cycleId,
                        form.getId()
                );
                continue;
            }

            AggregatedDeptApply aggregated = aggregateApplyAcrossDepartments(
                    form,
                    cycle,
                    form.getId(),
                    positionIds,
                    targetDepartmentIds
            );
            created += aggregated.created();
            skipped += aggregated.skipped();
            departmentsWithMatches += aggregated.departmentsWithMatches();
            managers.addAll(aggregated.managerIds());

            for (Integer mgrId : aggregated.managerIds()) {
                notificationService.send(
                        mgrId,
                        "KPI scoring requested",
                        "HR activated KPI cycle \"" + cycle.getCycleName() + "\" with template \""
                                + form.getTitle()
                                + "\". Enter scores for assigned employees in your department.",
                        TYPE_KPI_MANAGER_ASSIGNMENT,
                        form.getId()
                );
            }
        }

        employeeKpiFormRepository.flush();

        return UseKpiTemplateResultDto.builder()
                .assignmentsCreated(created)
                .assignmentsSkippedExisting(skipped)
                .managersNotified(managers.size())
                .departmentsWithMatches(departmentsWithMatches)
                .build();
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

    private record DeptApplySlice(boolean hadCandidates, int created, int skipped, LinkedHashSet<Integer> managerIds) {
        static DeptApplySlice empty() {
            return new DeptApplySlice(false, 0, 0, new LinkedHashSet<>());
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManagerKpiTemplateSummaryDto> listKpiTemplatesForManagerDepartment() {
        Integer deptId = requireManagerDepartmentId();
        List<Integer> employeeIds = departmentEmployeeIds(deptId);
        if (employeeIds.isEmpty()) {
            return List.of();
        }
        return employeeKpiFormRepository.summarizeByDepartmentEmployees(employeeIds);
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManagerKpiAssignmentDto> listDepartmentAssignmentsForManager(Integer kpiFormId) {
        Integer deptId = requireManagerDepartmentId();
        List<Integer> employeeIds = departmentEmployeeIds(deptId);
        if (employeeIds.isEmpty()) {
            return List.of();
        }

        kpiFormRepository.findById(kpiFormId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found."));

        List<EmployeeKpiForm> forms = employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(kpiFormId, employeeIds);
        return forms.stream().sorted(Comparator.comparing(ekf -> fullName(ekf.getEmployee()))).map(this::toManagerDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<ManagerKpiAssignmentDto> listFinalizedHistoryForManagerDepartment() {
        Integer deptId = requireManagerDepartmentId();
        List<Integer> employeeIds = departmentEmployeeIds(deptId);
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
        Integer deptId = requireManagerDepartmentId();
        Set<Integer> allowedEmployees = new HashSet<>(departmentEmployeeIds(deptId));

        EmployeeKpiForm ekf = employeeKpiFormRepository.findWithScoresForUpdate(employeeKpiFormId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI assignment not found."));

        if (!allowedEmployees.contains(ekf.getEmployee().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This assignment is outside your department.");
        }

        if (ekf.getScores() == null) {
            ekf.setScores(new LinkedHashSet<>());
        }

        if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED) {
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
                if (actual < 0 || Double.isNaN(actual) || Double.isInfinite(actual)) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actual value must be a non‑negative number.");
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

    @Override
    @Transactional
    public UseKpiTemplateResultDto finalizeDepartmentKpi(Integer kpiFormId) {
        Integer deptId = requireManagerDepartmentId();
        List<Integer> employeeIds = departmentEmployeeIds(deptId);
        if (employeeIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No employees found for your department.");
        }

        KpiForm form = kpiFormRepository.findById(kpiFormId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found."));

        List<EmployeeKpiForm> forms = employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(kpiFormId, employeeIds);
        if (forms.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No KPI assignments for this template in your department.");
        }

        for (EmployeeKpiForm ekf : forms) {
            if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED) {
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
            if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED) {
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

        return UseKpiTemplateResultDto.builder()
                .assignmentsCreated(finalizedThisRun.size())
                .assignmentsSkippedExisting(0)
                .managersNotified(0)
                .build();
    }

    @Override
    @Transactional
    public ManagerKpiAssignmentDto finalizeEmployeeKpi(Integer employeeKpiFormId, FinalizeEmployeeKpiRequest request) {
        Integer deptId = requireManagerDepartmentId();
        Set<Integer> allowedEmployees = new HashSet<>(departmentEmployeeIds(deptId));

        EmployeeKpiForm ekf = employeeKpiFormRepository.findWithScoresForUpdate(employeeKpiFormId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI assignment not found."));

        if (!allowedEmployees.contains(ekf.getEmployee().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This assignment is outside your department.");
        }
        if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED) {
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
            if (ekf.getStatus() == EmployeeKpiStatus.FINALIZED) {
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
        List<EmployeeKpiStatus> statuses = List.of(EmployeeKpiStatus.ASSIGNED, EmployeeKpiStatus.IN_PROGRESS);
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
                .positionTitle(e.getPosition() != null ? e.getPosition().getPositionTitle() : null)
                .kpiFormId(ekf.getKpiForm().getId())
                .kpiTitle(ekf.getKpiForm().getTitle())
                .status(ekf.getStatus())
                .totalScore(ekf.getTotalScore())
                .totalWeightedScore(ekf.getTotalWeightedScore())
                .finalizedAt(ekf.getFinalizedAt())
                .earlyFinalizedReason(ekf.getEarlyFinalizedReason())
                .finalizedBeforeEndDate(ekf.getFinalizedBeforeEndDate())
                .periodStartDate(periodStartDate(ekf))
                .periodEndDate(periodEndDate(ekf))
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
                    notificationService.send(
                            u.getId(),
                            "KPI results finalized",
                            empDetail,
                            TYPE_KPI_FINALIZED_EMPLOYEE,
                            form.getId()
                    )
            );
        }

        if (!finalizedThisRun.isEmpty()) {
            List<User> hrUsers = userRepository.findActiveUsersByNormalizedRoleNames(
                    List.of("HR", "ADMIN", "HR_MANAGER", "HR_ADMIN")
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
                notificationService.send(hr.getId(), "KPI finalized", hrMessage, TYPE_KPI_FINALIZED_HR, form.getId());
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

        List<EmployeeKpiForm> forms = employeeKpiFormRepository.findDetailedByEmployeeAndStatus(
                user.getEmployeeId(),
                EmployeeKpiStatus.FINALIZED
        );

        return forms.stream()
                .sorted(Comparator.comparing((EmployeeKpiForm ekf) -> ekf.getKpiForm().getTitle()))
                .map(this::toEmployeeResultDto)
                .toList();
    }

    private EmployeeKpiResultDto toEmployeeResultDto(EmployeeKpiForm ekf) {
        return EmployeeKpiResultDto.builder()
                .employeeKpiFormId(ekf.getId())
                .kpiFormId(ekf.getKpiForm().getId())
                .kpiTitle(ekf.getKpiForm().getTitle())
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
                .positionTitle(ekf.getEmployee().getPosition() != null ? ekf.getEmployee().getPosition().getPositionTitle() : null)
                .kpiFormId(ekf.getKpiForm().getId())
                .kpiTitle(ekf.getKpiForm().getTitle())
                .status(ekf.getStatus())
                .totalScore(ekf.getTotalScore())
                .totalWeightedScore(ekf.getTotalWeightedScore())
                .finalizedAt(ekf.getFinalizedAt())
                .earlyFinalizedReason(ekf.getEarlyFinalizedReason())
                .finalizedBeforeEndDate(ekf.getFinalizedBeforeEndDate())
                .periodStartDate(periodStartDate(ekf))
                .periodEndDate(periodEndDate(ekf))
                .lines(scoreLines(ekf))
                .build();
    }

    private LocalDate periodStartDate(EmployeeKpiForm ekf) {
        if (ekf.getKpiTemplateCycle() != null && ekf.getKpiTemplateCycle().getStartDate() != null) {
            return ekf.getKpiTemplateCycle().getStartDate();
        }
        return ekf.getKpiForm() != null ? ekf.getKpiForm().getStartDate() : null;
    }

    private LocalDate periodEndDate(EmployeeKpiForm ekf) {
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
                    String unit = item.getKpiUnit() != null ? item.getKpiUnit().getName() : null;
                    return ManagerKpiScoreLineDto.builder()
                            .kpiFormItemId(item.getId())
                            .kpiLabel(label)
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

    private List<Integer> departmentEmployeeIds(Integer departmentId) {
        return employeeRepository.findCurrentByWorkingDepartmentId(departmentId, false).stream()
                .map(Employee::getId)
                .toList();
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

    private LinkedHashSet<Integer> resolveManagerUserIds(Integer departmentId) {
        LinkedHashSet<Integer> ids = new LinkedHashSet<>();
        for (Team team : teamRepository.findByDepartmentIdAndStatusIgnoreCase(departmentId, "Active")) {
            if (team.getProjectManager() != null) {
                ids.add(team.getProjectManager().getId());
            }
        }
        for (User u : userRepository.findActiveManagersByDepartmentId(departmentId)) {
            ids.add(u.getId());
        }
        return ids;
    }

    private static String fullName(Employee e) {
        String fn = e.getFirstName() != null ? e.getFirstName() : "";
        String ln = e.getLastName() != null ? e.getLastName() : "";
        String s = (fn + " " + ln).trim();
        return s.isEmpty() ? ("Employee #" + e.getId()) : s;
    }
}
