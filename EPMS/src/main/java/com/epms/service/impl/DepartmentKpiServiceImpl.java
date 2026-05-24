package com.epms.service.impl;

import com.epms.dto.*;
import com.epms.entity.*;
import com.epms.entity.enums.DepartmentKpiResultStatus;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.repository.*;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.DepartmentKpiService;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
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
public class DepartmentKpiServiceImpl implements DepartmentKpiService {
    private static final Set<Integer> ALLOWED_DURATION_MONTHS = Set.of(3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
    private static final String TYPE_DEPARTMENT_KPI_FINALIZED = "DEPARTMENT_KPI_FINALIZED";

    private final DepartmentKpiTemplateRepository templateRepository;
    private final DepartmentKpiCycleRepository cycleRepository;
    private final DepartmentKpiCycleTemplateRepository cycleTemplateRepository;
    private final DepartmentKpiCyclePeriodRepository cyclePeriodRepository;
    private final DepartmentKpiResultRepository resultRepository;
    private final DepartmentRepository departmentRepository;
    private final KpiCategoryRepository kpiCategoryRepository;
    private final KpiUnitRepository kpiUnitRepository;
    private final KpiItemRepository kpiItemRepository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public DepartmentKpiTemplateResponseDto createTemplate(DepartmentKpiTemplateRequestDto request) {
        validateTemplateRequest(request);
        User user = currentUser();
        DepartmentKpiTemplate template = DepartmentKpiTemplate.builder()
                .title(request.getTitle().trim())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .status(request.getStatus() == null ? KpiFormStatus.DRAFT : request.getStatus())
                .createdByUser(user)
                .build();
        applyTemplateRows(template, request.getItems());
        applyTemplateDepartments(template, request.getDepartmentIds());
        DepartmentKpiTemplate saved = templateRepository.saveAndFlush(template);
        return getTemplate(saved.getId());
    }

    @Override
    @Transactional
    public DepartmentKpiTemplateResponseDto updateTemplate(Integer id, DepartmentKpiTemplateRequestDto request) {
        validateTemplateRequest(request);
        DepartmentKpiTemplate template = templateRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found."));
        template.setTitle(request.getTitle().trim());
        template.setStartDate(request.getStartDate());
        template.setEndDate(request.getEndDate());
        template.setStatus(request.getStatus() == null ? KpiFormStatus.DRAFT : request.getStatus());
        template.setUpdatedByUser(currentUser());
        template.getRows().clear();
        template.getDepartments().clear();
        templateRepository.flush();
        applyTemplateRows(template, request.getItems());
        applyTemplateDepartments(template, request.getDepartmentIds());
        templateRepository.saveAndFlush(template);
        backfillMissingScores(templateRepository.findDetailById(id).orElse(template));
        return getTemplate(id);
    }

    @Override
    @Transactional
    public void deleteTemplate(Integer id) {
        DepartmentKpiTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found."));
        template.setStatus(KpiFormStatus.ARCHIVED);
        template.setUpdatedByUser(currentUser());
        templateRepository.save(template);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiTemplateResponseDto> listTemplates() {
        return templateRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toTemplateDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentKpiTemplateResponseDto getTemplate(Integer id) {
        return toTemplateDto(templateRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found.")));
    }

    @Override
    @Transactional
    public DepartmentKpiCycleResponseDto createCycle(DepartmentKpiCycleRequestDto request) {
        validateCycleRequest(request);
        DepartmentKpiCycle cycle = DepartmentKpiCycle.builder()
                .cycleName(request.getCycleName().trim())
                .startDate(request.getStartDate())
                .durationMonths(request.getDurationMonths())
                .endDate(request.getStartDate().plusMonths(request.getDurationMonths()).minusDays(1))
                .status(KpiTemplateCycleStatus.DRAFT)
                .createdByUser(currentUser())
                .build();
        applyCycleTemplates(cycle, request.getTemplateIds());
        DepartmentKpiCycle saved = cycleRepository.saveAndFlush(cycle);
        return getCycle(saved.getId());
    }

    @Override
    @Transactional
    public DepartmentKpiCycleResponseDto updateCycle(Integer id, DepartmentKpiCycleRequestDto request) {
        validateCycleRequest(request);
        DepartmentKpiCycle cycle = cycleRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI cycle not found."));
        cycle.setCycleName(request.getCycleName().trim());
        cycle.setStartDate(request.getStartDate());
        cycle.setDurationMonths(request.getDurationMonths());
        cycle.setEndDate(request.getStartDate().plusMonths(request.getDurationMonths()).minusDays(1));
        cycle.setUpdatedByUser(currentUser());
        cycle.getCycleTemplates().clear();
        cycleRepository.flush();
        applyCycleTemplates(cycle, request.getTemplateIds());
        cycleRepository.saveAndFlush(cycle);
        return getCycle(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiCycleResponseDto> listCycles() {
        return cycleRepository.findAllByOrderByCreatedAtDesc().stream().map(this::toCycleDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentKpiCycleResponseDto getCycle(Integer id) {
        return toCycleDto(cycleRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI cycle not found.")));
    }

    @Override
    @Transactional
    public DepartmentKpiCycleResponseDto updateCycleStatus(Integer id, boolean active) {
        DepartmentKpiCycle cycle = cycleRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI cycle not found."));
        if (active) {
            cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);
            DepartmentKpiCyclePeriod period = ensureLatestPeriod(cycle);
            createResultsForCyclePeriod(cycle, period);
        } else {
            cycle.setStatus(KpiTemplateCycleStatus.DEACTIVATED);
        }
        cycle.setUpdatedByUser(currentUser());
        cycleRepository.saveAndFlush(cycle);
        return getCycle(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiTemplateSummaryDto> listWorkflowTemplates() {
        return resultRepository.summarizeTemplates();
    }

    @Override
    @Transactional
    public List<DepartmentKpiResultDto> listAssignments(Integer templateId, Integer cyclePeriodId) {
        DepartmentKpiTemplate template = templateRepository.findDetailById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found."));
        List<DepartmentKpiResult> results = resultRepository.findByTemplateAndPeriod(templateId, cyclePeriodId);
        for (DepartmentKpiResult result : results) {
            reconcileScores(template, result);
        }
        return results.stream().map(this::toResultDto).toList();
    }

    @Override
    @Transactional
    public DepartmentKpiResultDto updateScores(Integer resultId, UpdateDepartmentKpiScoresRequest request) {
        DepartmentKpiResult result = resultRepository.findDetailById(resultId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI result not found."));
        if (result.getStatus() == DepartmentKpiResultStatus.FINALIZED || result.getStatus() == DepartmentKpiResultStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Scores cannot be changed after finalization.");
        }
        Map<Integer, DepartmentKpiScore> byRow = result.getScores().stream()
                .collect(Collectors.toMap(s -> s.getTemplateRow().getId(), s -> s));
        User evaluator = currentUser();
        for (UpdateDepartmentKpiScoresRequest.ScoreUpdate update : request.getScores()) {
            if (update.getTemplateRowId() == null) continue;
            DepartmentKpiScore score = byRow.get(update.getTemplateRowId());
            if (score == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Unknown KPI row id: " + update.getTemplateRowId());
            }
            if (update.getActualValue() == null) {
                score.setActualValue(null);
                score.setScore(null);
                score.setWeightedScore(null);
                score.setEvaluatedByUser(null);
                score.setEvaluatedAt(null);
                continue;
            }
            double actual = update.getActualValue();
            if (!Double.isFinite(actual) || actual < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actual value must be zero or greater.");
            }
            Double target = score.getTemplateRow().getTarget();
            if (target == null || target <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI row has no valid target.");
            }
            score.setActualValue(actual);
            score.setScore((actual / target) * 100.0);
            score.setEvaluatedByUser(evaluator);
            score.setEvaluatedAt(LocalDateTime.now());
            score.calculateWeightedScore();
        }
        result.calculateTotals();
        if (result.getStatus() == DepartmentKpiResultStatus.ASSIGNED) {
            result.setStatus(DepartmentKpiResultStatus.IN_PROGRESS);
        }
        resultRepository.saveAndFlush(result);
        return toResultDto(result);
    }

    @Override
    @Transactional
    public DepartmentKpiResultDto finalizeResult(Integer resultId) {
        DepartmentKpiResult result = resultRepository.findDetailById(resultId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI result not found."));
        finalizeOne(result, LocalDateTime.now());
        resultRepository.saveAndFlush(result);
        notifyDepartmentHeads(result);
        return toResultDto(result);
    }

    @Override
    @Transactional
    public int finalizeTemplate(Integer templateId, Integer cyclePeriodId) {
        List<DepartmentKpiResult> results = resultRepository.findByTemplateAndPeriod(templateId, cyclePeriodId);
        if (results.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No Department KPI results found for this template.");
        }
        LocalDateTime now = LocalDateTime.now();
        int count = 0;
        for (DepartmentKpiResult result : results) {
            if (result.getStatus() == DepartmentKpiResultStatus.FINALIZED) continue;
            finalizeOne(result, now);
            resultRepository.save(result);
            notifyDepartmentHeads(result);
            count++;
        }
        resultRepository.flush();
        return count;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiResultDto> listFinalizedResults() {
        return resultRepository.findByStatusInOrderByAssignedAtDesc(List.of(DepartmentKpiResultStatus.FINALIZED))
                .stream().map(this::toResultDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiResultDto> listInProgressResults() {
        return resultRepository.findByStatusInOrderByAssignedAtDesc(List.of(
                DepartmentKpiResultStatus.ASSIGNED,
                DepartmentKpiResultStatus.IN_PROGRESS,
                DepartmentKpiResultStatus.CLOSED
        )).stream().map(this::toResultDto).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiResultDto> listDepartmentHeadResults() {
        Integer departmentId = SecurityUtils.currentUser().getDepartmentId();
        if (departmentId == null) {
            return List.of();
        }
        return resultRepository.findByDepartment_IdAndStatusOrderByFinalizedAtDesc(departmentId, DepartmentKpiResultStatus.FINALIZED)
                .stream().map(this::toResultDto).toList();
    }

    private void finalizeOne(DepartmentKpiResult result, LocalDateTime now) {
        if (result.getStatus() == DepartmentKpiResultStatus.FINALIZED || result.getStatus() == DepartmentKpiResultStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Department KPI result is already closed.");
        }
        if (result.getScores() == null || result.getScores().isEmpty()
                || result.getScores().stream().anyMatch(s -> s.getScore() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Complete all KPI rows before finalizing.");
        }
        result.calculateTotals();
        result.setStatus(DepartmentKpiResultStatus.FINALIZED);
        result.setFinalizedAt(now);
        result.setFinalizedByUser(currentUser());
    }

    private void createResultsForCyclePeriod(DepartmentKpiCycle cycle, DepartmentKpiCyclePeriod period) {
        List<DepartmentKpiCycleTemplate> links = cycleTemplateRepository.findByCycle_Id(cycle.getId());
        for (DepartmentKpiCycleTemplate link : links) {
            DepartmentKpiTemplate template = templateRepository.findDetailById(link.getTemplate().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found."));
            for (DepartmentKpiTemplateDepartment departmentLink : template.getDepartments()) {
                Integer departmentId = departmentLink.getDepartment().getId();
                if (resultRepository.existsByDepartment_IdAndTemplate_IdAndCyclePeriod_Id(departmentId, template.getId(), period.getId())) {
                    continue;
                }
                DepartmentKpiResult result = DepartmentKpiResult.builder()
                        .department(departmentLink.getDepartment())
                        .template(template)
                        .cycle(cycle)
                        .cyclePeriod(period)
                        .status(DepartmentKpiResultStatus.ASSIGNED)
                        .scores(new LinkedHashSet<>())
                        .build();
                for (DepartmentKpiTemplateRow row : template.getRows()) {
                    result.addScore(DepartmentKpiScore.builder().templateRow(row).build());
                }
                resultRepository.save(result);
            }
        }
        resultRepository.flush();
    }

    private DepartmentKpiCyclePeriod ensureLatestPeriod(DepartmentKpiCycle cycle) {
        return cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(cycle.getId())
                .orElseGet(() -> cyclePeriodRepository.save(DepartmentKpiCyclePeriod.builder()
                        .cycle(cycle)
                        .periodNumber(1)
                        .startDate(cycle.getStartDate())
                        .endDate(cycle.getStartDate().plusMonths(cycle.getDurationMonths()).minusDays(1))
                        .status(KpiTemplateCyclePeriodStatus.OPEN)
                        .build()));
    }

    private void validateTemplateRequest(DepartmentKpiTemplateRequestDto request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template title is required.");
        }
        if (request.getDepartmentIds() == null || request.getDepartmentIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select at least one department.");
        }
        if (request.getStartDate() != null && request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date cannot be before start date.");
        }
        validateRows(request.getItems());
        KpiFormStatus status = request.getStatus() == null ? KpiFormStatus.DRAFT : request.getStatus();
        int total = request.getItems().stream().mapToInt(r -> r.getWeight() == null ? 0 : r.getWeight()).sum();
        if ((status == KpiFormStatus.ACTIVE || status == KpiFormStatus.FINALIZED) && total != 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Total weight must equal 100% before status can be ACTIVE or FINALIZED.");
        }
    }

    private void validateRows(List<KpiFormItemDTO> rows) {
        if (rows == null || rows.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one KPI row is required.");
        }
        for (int i = 0; i < rows.size(); i++) {
            KpiFormItemDTO row = rows.get(i);
            if (row.getKpiItemId() == null && blank(row.getKpiLabel())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Row " + (i + 1) + ": enter a KPI name or select a KPI item.");
            }
            if ((row.getKpiCategoryId() == null && blank(first(row.getKpiCategoryLabel(), row.getKpiCategoryName())))
                    || (row.getKpiUnitId() == null && blank(first(row.getKpiUnitLabel(), row.getKpiUnitName())))
                    || row.getTarget() == null || row.getWeight() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Row " + (i + 1) + ": category, unit, target, and weight are required.");
            }
            if (!Double.isFinite(row.getTarget()) || row.getTarget() <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Row " + (i + 1) + ": target must be greater than zero.");
            }
            if (row.getWeight() < 1 || row.getWeight() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Row " + (i + 1) + ": weight must be between 1 and 100.");
            }
        }
    }

    private void validateCycleRequest(DepartmentKpiCycleRequestDto request) {
        if (request.getCycleName() == null || request.getCycleName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cycle name is required.");
        }
        if (request.getStartDate() == null || request.getDurationMonths() == null || !ALLOWED_DURATION_MONTHS.contains(request.getDurationMonths())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duration must be between 3 and 12 months.");
        }
        if (request.getTemplateIds() == null || request.getTemplateIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select at least one Department KPI template.");
        }
    }

    private void applyTemplateRows(DepartmentKpiTemplate template, List<KpiFormItemDTO> rows) {
        for (int i = 0; i < rows.size(); i++) {
            KpiFormItemDTO row = rows.get(i);
            DepartmentKpiTemplateRow entity = DepartmentKpiTemplateRow.builder()
                    .kpiCategory(row.getKpiCategoryId() == null ? null : kpiCategoryRepository.findById(row.getKpiCategoryId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI category not found.")))
                    .kpiCategoryLabel(row.getKpiCategoryId() == null ? first(row.getKpiCategoryLabel(), row.getKpiCategoryName()) : null)
                    .kpiItem(row.getKpiItemId() == null ? null : kpiItemRepository.findById(row.getKpiItemId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI item not found.")))
                    .kpiLabel(row.getKpiItemId() == null ? trim(row.getKpiLabel()) : null)
                    .kpiUnit(row.getKpiUnitId() == null ? null : kpiUnitRepository.findById(row.getKpiUnitId()).orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI unit not found.")))
                    .kpiUnitLabel(row.getKpiUnitId() == null ? first(row.getKpiUnitLabel(), row.getKpiUnitName()) : null)
                    .target(row.getTarget())
                    .weight(row.getWeight())
                    .sortOrder(row.getSortOrder() == null ? i : row.getSortOrder())
                    .build();
            template.addRow(entity);
        }
    }

    private void applyTemplateDepartments(DepartmentKpiTemplate template, List<Integer> departmentIds) {
        for (Integer id : departmentIds.stream().distinct().toList()) {
            Department department = departmentRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department not found: " + id));
            template.addDepartment(DepartmentKpiTemplateDepartment.builder().department(department).build());
        }
    }

    private void applyCycleTemplates(DepartmentKpiCycle cycle, List<Integer> templateIds) {
        for (Integer id : templateIds.stream().distinct().toList()) {
            DepartmentKpiTemplate template = templateRepository.findById(id)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Department KPI template not found: " + id));
            if (template.getStatus() != KpiFormStatus.ACTIVE && template.getStatus() != KpiFormStatus.FINALIZED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cycles can only use active Department KPI templates: " + template.getTitle());
            }
            cycle.getCycleTemplates().add(DepartmentKpiCycleTemplate.builder().cycle(cycle).template(template).build());
        }
    }

    private void reconcileScores(DepartmentKpiTemplate template, DepartmentKpiResult result) {
        Set<Integer> existing = result.getScores().stream().map(s -> s.getTemplateRow().getId()).collect(Collectors.toSet());
        for (DepartmentKpiTemplateRow row : template.getRows()) {
            if (existing.add(row.getId())) {
                result.addScore(DepartmentKpiScore.builder().templateRow(row).build());
            }
        }
        resultRepository.save(result);
    }

    private void backfillMissingScores(DepartmentKpiTemplate template) {
        List<DepartmentKpiResult> results = resultRepository.findByTemplateAndPeriod(template.getId(), null);
        for (DepartmentKpiResult result : results) {
            if (result.getStatus() != DepartmentKpiResultStatus.FINALIZED) {
                reconcileScores(template, result);
            }
        }
    }

    private DepartmentKpiTemplateResponseDto toTemplateDto(DepartmentKpiTemplate t) {
        List<DepartmentKpiTemplateResponseDto.DepartmentSummary> departments = t.getDepartments() == null ? List.of() : t.getDepartments().stream()
                .filter(d -> d.getDepartment() != null)
                .map(d -> DepartmentKpiTemplateResponseDto.DepartmentSummary.builder()
                        .id(d.getDepartment().getId())
                        .departmentName(d.getDepartment().getDepartmentName())
                        .build())
                .toList();
        List<KpiFormItemDTO> rows = t.getRows() == null ? List.of() : t.getRows().stream()
                .sorted(Comparator.comparing(r -> r.getSortOrder() == null ? 0 : r.getSortOrder()))
                .map(this::toRowDto)
                .toList();
        return DepartmentKpiTemplateResponseDto.builder()
                .id(t.getId())
                .title(t.getTitle())
                .startDate(t.getStartDate())
                .endDate(t.getEndDate())
                .status(t.getStatus())
                .createdAt(t.getCreatedAt())
                .updatedAt(t.getUpdatedAt())
                .createdBy(t.getCreatedByUser() != null ? displayUser(t.getCreatedByUser()) : null)
                .createdByUserId(t.getCreatedByUser() != null ? t.getCreatedByUser().getId() : null)
                .departments(departments)
                .items(rows)
                .build();
    }

    private DepartmentKpiCycleResponseDto toCycleDto(DepartmentKpiCycle c) {
        DepartmentKpiCyclePeriod period = cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(c.getId()).orElse(null);
        List<DepartmentKpiCycleResponseDto.TemplateSummary> templates = cycleTemplateRepository.findByCycle_Id(c.getId()).stream()
                .filter(link -> link.getTemplate() != null)
                .map(link -> DepartmentKpiCycleResponseDto.TemplateSummary.builder().id(link.getTemplate().getId()).title(link.getTemplate().getTitle()).build())
                .toList();
        return DepartmentKpiCycleResponseDto.builder()
                .id(c.getId())
                .cycleName(c.getCycleName())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .durationMonths(c.getDurationMonths())
                .durationLabel(c.getDurationMonths() == 12 ? "1 year" : c.getDurationMonths() + " months")
                .status(c.getStatus())
                .currentPeriodId(period == null ? null : period.getId())
                .currentPeriodNumber(period == null ? null : period.getPeriodNumber())
                .currentPeriodStartDate(period == null ? null : period.getStartDate())
                .currentPeriodEndDate(period == null ? null : period.getEndDate())
                .createdAt(c.getCreatedAt())
                .updatedAt(c.getUpdatedAt())
                .templates(templates)
                .build();
    }

    private DepartmentKpiResultDto toResultDto(DepartmentKpiResult r) {
        return DepartmentKpiResultDto.builder()
                .departmentKpiResultId(r.getId())
                .departmentId(r.getDepartment().getId())
                .departmentName(r.getDepartment().getDepartmentName())
                .templateId(r.getTemplate().getId())
                .templateTitle(r.getTemplate().getTitle())
                .cyclePeriodId(r.getCyclePeriod() == null ? null : r.getCyclePeriod().getId())
                .status(r.getStatus())
                .totalScore(r.getTotalScore())
                .totalWeightedScore(r.getTotalWeightedScore())
                .finalizedAt(r.getFinalizedAt())
                .periodStartDate(r.getCyclePeriod() != null ? r.getCyclePeriod().getStartDate() : r.getTemplate().getStartDate())
                .periodEndDate(r.getCyclePeriod() != null ? r.getCyclePeriod().getEndDate() : r.getTemplate().getEndDate())
                .lines(r.getScores().stream()
                        .sorted(Comparator.comparing(s -> s.getTemplateRow().getSortOrder() == null ? 0 : s.getTemplateRow().getSortOrder()))
                        .map(s -> DepartmentKpiResultDto.Line.builder()
                                .templateRowId(s.getTemplateRow().getId())
                                .kpiLabel(rowLabel(s.getTemplateRow()))
                                .target(s.getTemplateRow().getTarget())
                                .weight(s.getTemplateRow().getWeight())
                                .unitName(rowUnit(s.getTemplateRow()))
                                .actualValue(s.getActualValue())
                                .score(s.getScore())
                                .weightedScore(s.getWeightedScore())
                                .build())
                        .toList())
                .build();
    }

    private KpiFormItemDTO toRowDto(DepartmentKpiTemplateRow r) {
        return KpiFormItemDTO.builder()
                .id(r.getId())
                .kpiLabel(r.getKpiLabel())
                .kpiItemId(r.getKpiItem() == null ? null : r.getKpiItem().getId())
                .kpiItemName(r.getKpiItem() == null ? null : r.getKpiItem().getName())
                .kpiCategoryId(r.getKpiCategory() == null ? null : r.getKpiCategory().getId())
                .kpiCategoryName(r.getKpiCategory() == null ? r.getKpiCategoryLabel() : r.getKpiCategory().getName())
                .kpiCategoryLabel(r.getKpiCategoryLabel())
                .kpiUnitId(r.getKpiUnit() == null ? null : r.getKpiUnit().getId())
                .kpiUnitName(r.getKpiUnit() == null ? r.getKpiUnitLabel() : r.getKpiUnit().getName())
                .kpiUnitLabel(r.getKpiUnitLabel())
                .target(r.getTarget())
                .weight(r.getWeight())
                .sortOrder(r.getSortOrder())
                .build();
    }

    private void notifyDepartmentHeads(DepartmentKpiResult result) {
        for (User head : userRepository.findActiveDepartmentHeadsByDepartmentId(result.getDepartment().getId())) {
            notificationService.send(
                    head.getId(),
                    "Department KPI finalized",
                    "HR finalized Department KPI \"" + result.getTemplate().getTitle() + "\" for " + result.getDepartment().getDepartmentName()
                            + ". Weighted score: " + (result.getTotalWeightedScore() == null ? "-" : String.format("%.2f", result.getTotalWeightedScore())) + ".",
                    TYPE_DEPARTMENT_KPI_FINALIZED,
                    result.getId()
            );
        }
    }

    private User currentUser() {
        return userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
    }

    private String displayUser(User user) {
        if (user.getFullName() != null && !user.getFullName().isBlank()) return user.getFullName();
        return user.getEmail();
    }

    private String rowLabel(DepartmentKpiTemplateRow row) {
        return row.getKpiItem() != null ? row.getKpiItem().getName() : row.getKpiLabel();
    }

    private String rowUnit(DepartmentKpiTemplateRow row) {
        return row.getKpiUnit() != null ? row.getKpiUnit().getName() : row.getKpiUnitLabel();
    }

    private static boolean blank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private static String trim(String value) {
        return value == null ? null : value.trim();
    }

    private static String first(String left, String right) {
        return !blank(left) ? left.trim() : (!blank(right) ? right.trim() : null);
    }
}
