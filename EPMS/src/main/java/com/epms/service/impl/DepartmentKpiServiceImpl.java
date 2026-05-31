package com.epms.service.impl;

import com.epms.dto.*;
import com.epms.entity.Department;
import com.epms.entity.DepartmentKpiCycle;
import com.epms.entity.DepartmentKpiCyclePeriod;
import com.epms.entity.DepartmentKpiCycleTemplate;
import com.epms.entity.DepartmentKpiResult;
import com.epms.entity.DepartmentKpiScore;
import com.epms.entity.DepartmentKpiTemplate;
import com.epms.entity.DepartmentKpiTemplateDepartment;
import com.epms.entity.DepartmentKpiTemplateRow;
import com.epms.entity.KpiCategory;
import com.epms.entity.KpiItem;
import com.epms.entity.KpiUnit;
import com.epms.entity.User;
import com.epms.entity.enums.DepartmentKpiResultStatus;
import com.epms.entity.enums.KpiEarlyCloseReviewDecision;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.entity.enums.KpiGraceExtension;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.dto.KpiTemplateCycleStatusRequestDTO;
import com.epms.repository.DepartmentKpiCyclePeriodRepository;
import com.epms.repository.DepartmentKpiCycleRepository;
import com.epms.repository.DepartmentKpiCycleTemplateRepository;
import com.epms.repository.DepartmentKpiResultRepository;
import com.epms.repository.DepartmentKpiTemplateRepository;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.KpiCategoryRepository;
import com.epms.repository.KpiItemRepository;
import com.epms.repository.KpiUnitRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.DepartmentKpiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartmentKpiServiceImpl implements DepartmentKpiService {

    private static final Set<Integer> ALLOWED_DURATION_MONTHS = Set.of(3, 4, 5, 6, 7, 8, 9, 10, 11, 12);

    private static final int DEFAULT_CLOSING_GRACE_DAYS = 7;

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

    @Override
    @Transactional
    public DepartmentKpiTemplateResponseDto createTemplate(DepartmentKpiTemplateRequestDto request) {
        validateTemplateRequest(request);

        DepartmentKpiTemplate template = new DepartmentKpiTemplate();
        template.setTitle(cleanRequired(request.getTitle(), "Template title is required."));
        template.setStartDate(request.getStartDate());
        template.setEndDate(request.getEndDate());
        template.setStatus(request.getStatus() == null ? KpiFormStatus.DRAFT : request.getStatus());
        template.setCreatedByUser(currentUser());

        applyTemplateRows(template, request.getItems());
        applyTemplateDepartments(template, request.getDepartmentIds());

        DepartmentKpiTemplate saved = templateRepository.saveAndFlush(template);
        return toTemplateDto(saved);
    }

    @Override
    @Transactional
    public DepartmentKpiTemplateResponseDto updateTemplate(Integer id, DepartmentKpiTemplateRequestDto request) {
        validateTemplateRequest(request);

        DepartmentKpiTemplate template = templateRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found."));

        template.setTitle(cleanRequired(request.getTitle(), "Template title is required."));
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
        return templateRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toTemplateDto)
                .toList();
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

        DepartmentKpiCycle cycle = new DepartmentKpiCycle();
        cycle.setCycleName(cleanRequired(request.getCycleName(), "Cycle name is required."));
        cycle.setStartDate(request.getStartDate());
        cycle.setDurationMonths(request.getDurationMonths());
        cycle.setEndDate(calculateEndDate(request.getStartDate(), request.getDurationMonths()));
        cycle.setStatus(KpiTemplateCycleStatus.DRAFT);
        cycle.setCreatedByUser(currentUser());

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
        ensureCycleEditable(cycle);

        cycle.setCycleName(cleanRequired(request.getCycleName(), "Cycle name is required."));
        cycle.setStartDate(request.getStartDate());
        cycle.setDurationMonths(request.getDurationMonths());
        cycle.setEndDate(calculateEndDate(request.getStartDate(), request.getDurationMonths()));
        cycle.setLastEditReason(cleanOptional(request.getEditReason()));
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
        return cycleRepository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toCycleDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public DepartmentKpiCycleResponseDto getCycle(Integer id) {
        return toCycleDto(cycleRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI cycle not found.")));
    }

    @Override
    @Transactional
    public DepartmentKpiCycleResponseDto updateCycleStatus(Integer id, KpiTemplateCycleStatusRequestDTO request) {
        DepartmentKpiCycle cycle = cycleRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI cycle not found."));
        boolean active = Boolean.TRUE.equals(request.getActive());

        if (active) {
            if (cycle.getStatus() == KpiTemplateCycleStatus.ACTIVE) {
                return getCycle(id);
            }
            if (cycle.getStatus() == KpiTemplateCycleStatus.CLOSING
                    || cycle.getStatus() == KpiTemplateCycleStatus.PENDING_APPROVAL) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This cycle cannot be activated from its current status.");
            }
            cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);
            cycle.setClosingRequestedAt(null);
            cycle.setGraceEndsAt(null);
            cycle.setClosedAt(null);
            cycle.setUpdatedByUser(currentUser());
            DepartmentKpiCyclePeriod period = ensureLatestPeriod(cycle);
            createResultsForCyclePeriod(cycle, period);
        } else {
            if (cycle.getStatus() != KpiTemplateCycleStatus.ACTIVE) {
                if (cycle.getStatus() == KpiTemplateCycleStatus.DEACTIVATED) {
                    return getCycle(id);
                }
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only active cycles can be deactivated.");
            }
            if (isBeforeOfficialEndDate(cycle)) {
                requestEarlyClose(cycle, request);
                cycleRepository.saveAndFlush(cycle);
                return getCycle(id);
            }
            startCycleClosingGrace(cycle, LocalDateTime.now().plusDays(DEFAULT_CLOSING_GRACE_DAYS));
            cycle.setUpdatedByUser(currentUser());
            cycleRepository.saveAndFlush(cycle);
            return getCycle(id);
        }

        cycleRepository.saveAndFlush(cycle);
        return getCycle(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiCycleResponseDto> listPendingEarlyCloseRequests() {
        return cycleRepository
                .findByStatusOrderByEarlyCloseRequestedAtAsc(KpiTemplateCycleStatus.PENDING_APPROVAL)
                .stream()
                .map(this::toCycleDto)
                .toList();
    }

    @Override
    @Transactional
    public DepartmentKpiCycleResponseDto approveEarlyClose(Integer id, String reviewReason) {
        DepartmentKpiCycle cycle = requirePendingApproval(id);
        User reviewer = currentUser();
        LocalDateTime now = LocalDateTime.now();
        KpiGraceExtension extension = cycle.getGraceExtension();
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grace period extension is missing.");
        }

        cycle.setEarlyCloseReviewedAt(now);
        cycle.setEarlyCloseReviewedByUser(reviewer);
        cycle.setEarlyCloseReviewDecision(KpiEarlyCloseReviewDecision.APPROVED);
        cycle.setEarlyCloseReviewReason(normalizeText(reviewReason, 1000));
        cycle.setUpdatedByUser(reviewer);
        cycleRepository.saveAndFlush(cycle);

        startCycleClosingGrace(cycle, extension.addTo(now));
        return getCycle(id);
    }

    @Override
    @Transactional
    public DepartmentKpiCycleResponseDto rejectEarlyClose(Integer id, String reviewReason) {
        DepartmentKpiCycle cycle = requirePendingApproval(id);
        User reviewer = currentUser();
        cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);
        cycle.setEarlyCloseReviewedAt(LocalDateTime.now());
        cycle.setEarlyCloseReviewedByUser(reviewer);
        cycle.setEarlyCloseReviewDecision(KpiEarlyCloseReviewDecision.REJECTED);
        cycle.setEarlyCloseReviewReason(normalizeText(reviewReason, 1000));
        cycle.setClosingRequestedAt(null);
        cycle.setGraceEndsAt(null);
        cycle.setClosedAt(null);
        cycle.setUpdatedByUser(reviewer);
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
            if (result.getCycle() != null) {
                expireGraceIfNeeded(result.getCycle());
            }
            reconcileScores(template, result);
        }
        resultRepository.flush();

        return results.stream()
                .map(this::toResultDto)
                .toList();
    }

    @Override
    @Transactional
    public DepartmentKpiResultDto updateScores(Integer resultId, UpdateDepartmentKpiScoresRequest request) {
        DepartmentKpiResult result = resultRepository.findDetailById(resultId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI result not found."));

        if (result.getCycle() != null) {
            expireGraceIfNeeded(result.getCycle());
        }
        assertEditableDuringGrace(result);

        if (result.getStatus() == DepartmentKpiResultStatus.FINALIZED || result.getStatus() == DepartmentKpiResultStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Scores cannot be changed after finalization.");
        }
        if (request == null || request.getScores() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Scores are required.");
        }

        Map<Integer, DepartmentKpiScore> byRowId = result.getScores()
                .stream()
                .filter(score -> score.getTemplateRow() != null && score.getTemplateRow().getId() != null)
                .collect(Collectors.toMap(score -> score.getTemplateRow().getId(), score -> score, (a, b) -> a, LinkedHashMap::new));

        User evaluator = currentUser();
        for (UpdateDepartmentKpiScoresRequest.ScoreUpdate update : request.getScores()) {
            if (update == null || update.getTemplateRowId() == null) {
                continue;
            }

            DepartmentKpiScore score = byRowId.get(update.getTemplateRowId());
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

            double actualValue = update.getActualValue();
            if (!Double.isFinite(actualValue) || actualValue < 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actual value must be zero or greater.");
            }

            Double target = score.getTemplateRow() == null ? null : score.getTemplateRow().getTarget();
            if (target == null || target <= 0) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI row has no valid target.");
            }
            if (actualValue > target) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Actual value must be less than or equal to target value.");
            }

            score.setActualValue(actualValue);
            score.setScore((actualValue / target) * 100.0);
            score.setEvaluatedByUser(evaluator);
            score.setEvaluatedAt(LocalDateTime.now());
            score.calculateWeightedScore();
        }

        result.calculateTotals();
        if (result.getStatus() == DepartmentKpiResultStatus.ASSIGNED) {
            result.setStatus(DepartmentKpiResultStatus.IN_PROGRESS);
        }

        DepartmentKpiResult saved = resultRepository.saveAndFlush(result);
        return toResultDto(saved);
    }

    @Override
    public DepartmentKpiResultDto requestFinalization(Integer resultId, DepartmentKpiFinalizationRequestDto request) {
        return null;
    }

    @Override
    @Transactional
    public DepartmentKpiResultDto finalizeResult(Integer resultId) {
        DepartmentKpiResult result = resultRepository.findDetailById(resultId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI result not found."));
        if (result.getCycle() != null) {
            expireGraceIfNeeded(result.getCycle());
        }
        assertEditableDuringGrace(result);
        finalizeOne(result, LocalDateTime.now());
        DepartmentKpiResult saved = resultRepository.saveAndFlush(result);
        return toResultDto(saved);
    }

    @Override
    @Transactional
    public int finalizeTemplate(Integer templateId, Integer cyclePeriodId) {
        DepartmentKpiTemplate template = templateRepository.findDetailById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found."));

        int finalized = 0;
        LocalDateTime now = LocalDateTime.now();
        List<DepartmentKpiResult> results = resultRepository.findByTemplateAndPeriod(template.getId(), cyclePeriodId);
        for (DepartmentKpiResult result : results) {
            if (result.getStatus() == DepartmentKpiResultStatus.FINALIZED || result.getStatus() == DepartmentKpiResultStatus.CLOSED) {
                continue;
            }
            finalizeOne(result, now);
            finalized++;
        }
        resultRepository.saveAllAndFlush(results);
        return finalized;
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiResultDto> listFinalizedResults() {
        return resultRepository.findByStatusInOrderByAssignedAtDesc(List.of(DepartmentKpiResultStatus.FINALIZED))
                .stream()
                .map(this::toResultDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiResultDto> listInProgressResults() {
        return resultRepository.findByStatusInOrderByAssignedAtDesc(List.of(
                        DepartmentKpiResultStatus.ASSIGNED,
                        DepartmentKpiResultStatus.IN_PROGRESS,
                        DepartmentKpiResultStatus.CLOSED
                ))
                .stream()
                .map(this::toResultDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiResultDto> listDepartmentHeadResults() {
        Integer departmentId = SecurityUtils.currentUser().getDepartmentId();
        if (departmentId == null) {
            return List.of();
        }
        return resultRepository.findByDepartment_IdAndStatusOrderByFinalizedAtDesc(departmentId, DepartmentKpiResultStatus.FINALIZED)
                .stream()
                .map(this::toResultDto)
                .toList();
    }

    @Override
    public List<DepartmentKpiResultDto> listPendingFinalizationRequests() {
        return List.of();
    }

    @Override
    public DepartmentKpiResultDto approveFinalization(Integer resultId, String reviewReason) {
        return null;
    }

    @Override
    public DepartmentKpiResultDto rejectFinalization(Integer resultId, String reviewReason) {
        return null;
    }

    private void validateTemplateRequest(DepartmentKpiTemplateRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template request is required.");
        }
        cleanRequired(request.getTitle(), "Template title is required.");
        if (request.getStartDate() != null && request.getEndDate() != null && request.getEndDate().isBefore(request.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template end date cannot be before start date.");
        }
        if (request.getDepartmentIds() == null || request.getDepartmentIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one department is required.");
        }
        if (request.getItems() == null || request.getItems().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one KPI row is required.");
        }

        KpiFormStatus status = request.getStatus() == null ? KpiFormStatus.DRAFT : request.getStatus();
        validateTemplateItems(request.getItems());
        validateTemplateWeights(status, request.getItems());
    }

    private void validateTemplateItems(List<KpiFormItemDTO> items) {
        for (int i = 0; i < items.size(); i++) {
            KpiFormItemDTO item = items.get(i);
            if (item == null) {
                continue;
            }
            if (item.getKpiItemId() == null && isBlank(item.getKpiLabel())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Row " + (i + 1) + ": enter a KPI name or select a KPI item.");
            }
            boolean hasMasterCategory = item.getKpiCategoryId() != null;
            boolean hasCategoryLabel = !isBlank(firstNonBlank(item.getKpiCategoryName(), item.getKpiCategoryLabel()));
            boolean hasMasterUnit = item.getKpiUnitId() != null;
            boolean hasUnitLabel = !isBlank(firstNonBlank(item.getKpiUnitName(), item.getKpiUnitLabel()));
            if ((!hasMasterCategory && !hasCategoryLabel) || (!hasMasterUnit && !hasUnitLabel)
                    || item.getTarget() == null || item.getWeight() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Row " + (i + 1) + ": category, unit, target, and weight are required.");
            }
            if (!Double.isFinite(item.getTarget()) || item.getTarget() < 1 || item.getTarget() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Row " + (i + 1) + ": target must be between 1 and 100.");
            }
            if (item.getWeight() < 1 || item.getWeight() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Row " + (i + 1) + ": weight must be between 1 and 100.");
            }
        }
    }

    private void validateTemplateWeights(KpiFormStatus status, List<KpiFormItemDTO> items) {
        int totalWeight = items.stream()
                .filter(Objects::nonNull)
                .mapToInt(item -> item.getWeight() == null ? 0 : item.getWeight())
                .sum();
        if ((status == KpiFormStatus.ACTIVE || status == KpiFormStatus.FINALIZED) && totalWeight != 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Total KPI weight must equal 100% before status can be ACTIVE or FINALIZED.");
        }
    }

    private void validateCycleRequest(DepartmentKpiCycleRequestDto request) {
        if (request == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cycle request is required.");
        }
        cleanRequired(request.getCycleName(), "Cycle name is required.");
        if (request.getStartDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cycle start date is required.");
        }
        if (request.getDurationMonths() == null || !ALLOWED_DURATION_MONTHS.contains(request.getDurationMonths())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cycle duration must be between 3 and 12 months.");
        }
        if (request.getTemplateIds() == null || request.getTemplateIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one Department KPI template is required.");
        }
    }

    private void applyTemplateRows(DepartmentKpiTemplate template, List<KpiFormItemDTO> items) {
        List<KpiFormItemDTO> orderedItems = new ArrayList<>(items == null ? List.of() : items);
        for (int i = 0; i < orderedItems.size(); i++) {
            KpiFormItemDTO item = orderedItems.get(i);
            if (item == null) {
                continue;
            }

            DepartmentKpiTemplateRow row = new DepartmentKpiTemplateRow();
            row.setTarget(item.getTarget());
            row.setWeight(item.getWeight());
            row.setSortOrder(item.getSortOrder() == null ? i + 1 : item.getSortOrder());

            if (item.getKpiItemId() != null) {
                KpiItem kpiItem = kpiItemRepository.findWithKpiCategoryById(item.getKpiItemId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI item not found."));
                row.setKpiItem(kpiItem);
                row.setKpiLabel(firstNonBlank(item.getKpiItemName(), kpiItem.getName()));
                if (kpiItem.getKpiCategory() != null) {
                    row.setKpiCategory(kpiItem.getKpiCategory());
                    row.setKpiCategoryLabel(firstNonBlank(item.getKpiCategoryName(), item.getKpiCategoryLabel(), kpiItem.getKpiCategory().getName()));
                }
            } else {
                row.setKpiLabel(cleanRequired(item.getKpiLabel(), "KPI label is required."));
                if (item.getKpiCategoryId() != null) {
                    KpiCategory category = kpiCategoryRepository.findById(item.getKpiCategoryId())
                            .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI category not found."));
                    row.setKpiCategory(category);
                    row.setKpiCategoryLabel(firstNonBlank(item.getKpiCategoryName(), item.getKpiCategoryLabel(), category.getName()));
                } else {
                    row.setKpiCategoryLabel(cleanOptional(firstNonBlank(item.getKpiCategoryName(), item.getKpiCategoryLabel())));
                }
            }

            if (item.getKpiUnitId() != null) {
                KpiUnit unit = kpiUnitRepository.findById(item.getKpiUnitId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI unit not found."));
                row.setKpiUnit(unit);
                row.setKpiUnitLabel(firstNonBlank(item.getKpiUnitName(), item.getKpiUnitLabel(), unit.getName()));
            } else {
                row.setKpiUnitLabel(cleanOptional(firstNonBlank(item.getKpiUnitName(), item.getKpiUnitLabel())));
            }

            template.addRow(row);
        }
    }

    private void applyTemplateDepartments(DepartmentKpiTemplate template, List<Integer> departmentIds) {
        LinkedHashSet<Integer> uniqueIds = new LinkedHashSet<>(departmentIds == null ? List.of() : departmentIds);
        for (Integer departmentId : uniqueIds) {
            if (departmentId == null) {
                continue;
            }
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department not found: " + departmentId));
            DepartmentKpiTemplateDepartment link = new DepartmentKpiTemplateDepartment();
            link.setDepartment(department);
            template.addDepartment(link);
        }
    }

    private void applyCycleTemplates(DepartmentKpiCycle cycle, List<Integer> templateIds) {
        LinkedHashSet<Integer> uniqueTemplateIds = new LinkedHashSet<>(templateIds == null ? List.of() : templateIds);
        List<DepartmentKpiCycleTemplate> conflicts = cycleTemplateRepository.findConflictingLinks(
                KpiTemplateCycleStatus.ACTIVE,
                cycle.getId(),
                uniqueTemplateIds
        );
        if (!conflicts.isEmpty()) {
            String names = conflicts.stream()
                    .map(link -> link.getTemplate() == null ? null : link.getTemplate().getTitle())
                    .filter(Objects::nonNull)
                    .distinct()
                    .collect(Collectors.joining(", "));
            throw new ResponseStatusException(HttpStatus.CONFLICT, "These templates are already used in an active cycle: " + names);
        }

        for (Integer templateId : uniqueTemplateIds) {
            if (templateId == null) {
                continue;
            }
            DepartmentKpiTemplate template = templateRepository.findDetailById(templateId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found: " + templateId));
            if (template.getStatus() == KpiFormStatus.ARCHIVED) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Archived templates cannot be assigned to a cycle.");
            }

            DepartmentKpiCycleTemplate link = new DepartmentKpiCycleTemplate();
            link.setCycle(cycle);
            link.setTemplate(template);
            cycle.getCycleTemplates().add(link);
        }
    }

    private DepartmentKpiCyclePeriod ensureLatestPeriod(DepartmentKpiCycle cycle) {
        return cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(cycle.getId())
                .orElseGet(() -> {
                    DepartmentKpiCyclePeriod period = new DepartmentKpiCyclePeriod();
                    period.setCycle(cycle);
                    period.setPeriodNumber(1);
                    period.setStartDate(cycle.getStartDate());
                    period.setEndDate(cycle.getEndDate());
                    period.setStatus(KpiTemplateCyclePeriodStatus.OPEN);
                    return cyclePeriodRepository.save(period);
                });
    }

    private void createResultsForCyclePeriod(DepartmentKpiCycle cycle, DepartmentKpiCyclePeriod period) {
        List<DepartmentKpiCycleTemplate> links = cycleTemplateRepository.findByCycle_Id(cycle.getId());
        for (DepartmentKpiCycleTemplate link : links) {
            DepartmentKpiTemplate template = templateRepository.findDetailById(link.getTemplate().getId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found."));

            for (DepartmentKpiTemplateDepartment departmentLink : template.getDepartments()) {
                if (departmentLink.getDepartment() == null || departmentLink.getDepartment().getId() == null) {
                    continue;
                }
                Integer departmentId = departmentLink.getDepartment().getId();
                if (resultRepository.existsByDepartment_IdAndTemplate_IdAndCyclePeriod_Id(departmentId, template.getId(), period.getId())) {
                    continue;
                }

                DepartmentKpiResult result = new DepartmentKpiResult();
                result.setDepartment(departmentLink.getDepartment());
                result.setTemplate(template);
                result.setCycle(cycle);
                result.setCyclePeriod(period);
                result.setStatus(DepartmentKpiResultStatus.ASSIGNED);
                result.setScores(new LinkedHashSet<>());

                List<DepartmentKpiTemplateRow> rows = orderedRows(template);
                for (DepartmentKpiTemplateRow row : rows) {
                    DepartmentKpiScore score = new DepartmentKpiScore();
                    score.setTemplateRow(row);
                    result.addScore(score);
                }
                resultRepository.save(result);
            }
        }
        resultRepository.flush();
    }

    private void reconcileScores(DepartmentKpiTemplate template, DepartmentKpiResult result) {
        if (template == null || result == null) {
            return;
        }
        Set<Integer> existingRowIds = result.getScores() == null
                ? new LinkedHashSet<>()
                : result.getScores().stream()
                .map(DepartmentKpiScore::getTemplateRow)
                .filter(Objects::nonNull)
                .map(DepartmentKpiTemplateRow::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));

        if (result.getScores() == null) {
            result.setScores(new LinkedHashSet<>());
        }

        for (DepartmentKpiTemplateRow row : orderedRows(template)) {
            if (row.getId() != null && !existingRowIds.contains(row.getId())) {
                DepartmentKpiScore score = new DepartmentKpiScore();
                score.setTemplateRow(row);
                result.addScore(score);
            }
        }
        result.calculateTotals();
    }

    private void backfillMissingScores(DepartmentKpiTemplate template) {
        if (template == null || template.getId() == null) {
            return;
        }
        List<DepartmentKpiResult> results = resultRepository.findByTemplateAndPeriod(template.getId(), null);
        for (DepartmentKpiResult result : results) {
            if (result.getStatus() != DepartmentKpiResultStatus.FINALIZED && result.getStatus() != DepartmentKpiResultStatus.CLOSED) {
                reconcileScores(template, result);
            }
        }
        resultRepository.saveAllAndFlush(results);
    }

    private void finalizeOne(DepartmentKpiResult result, LocalDateTime now) {
        if (result.getStatus() == DepartmentKpiResultStatus.FINALIZED) {
            return;
        }
        if (result.getStatus() == DepartmentKpiResultStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Closed Department KPI results cannot be finalized.");
        }
        ensureResultComplete(result);
        result.calculateTotals();
        result.setStatus(DepartmentKpiResultStatus.FINALIZED);
        result.setFinalizedAt(now);
        result.setFinalizedByUser(currentUser());
    }

    private void ensureResultComplete(DepartmentKpiResult result) {
        List<DepartmentKpiScore> scores = result.getScores() == null ? List.of() : new ArrayList<>(result.getScores());
        if (scores.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No KPI rows are available to finalize.");
        }
        boolean incomplete = scores.stream().anyMatch(score -> score.getActualValue() == null || score.getScore() == null);
        if (incomplete) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "All Department KPI rows must be scored before finalization.");
        }
    }

    private DepartmentKpiCycle requirePendingApproval(Integer id) {
        DepartmentKpiCycle cycle = cycleRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI cycle not found."));
        if (cycle.getStatus() != KpiTemplateCycleStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending Department KPI early close request exists for this cycle.");
        }
        return cycle;
    }

    private void requestEarlyClose(DepartmentKpiCycle cycle, KpiTemplateCycleStatusRequestDTO request) {
        String reason = normalizeText(request.getReason(), 1000);
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason is required to request early cycle closure.");
        }
        if (request.getGraceExtension() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grace period extension is required.");
        }
        cycle.setStatus(KpiTemplateCycleStatus.PENDING_APPROVAL);
        cycle.setEarlyCloseReason(reason);
        cycle.setGraceExtension(request.getGraceExtension());
        cycle.setEarlyCloseRequestedAt(LocalDateTime.now());
        cycle.setEarlyCloseRequestedByUser(currentUser());
        cycle.setEarlyCloseReviewedAt(null);
        cycle.setEarlyCloseReviewedByUser(null);
        cycle.setEarlyCloseReviewDecision(null);
        cycle.setEarlyCloseReviewReason(null);
        cycle.setUpdatedByUser(cycle.getEarlyCloseRequestedByUser());
    }

    private boolean isBeforeOfficialEndDate(DepartmentKpiCycle cycle) {
        LocalDate officialEnd = cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(cycle.getId())
                .map(DepartmentKpiCyclePeriod::getEndDate)
                .orElse(cycle.getEndDate());
        return officialEnd != null && LocalDate.now().isBefore(officialEnd);
    }

    private void startCycleClosingGrace(DepartmentKpiCycle cycle, LocalDateTime graceEnds) {
        LocalDateTime now = LocalDateTime.now();
        cycle.setStatus(KpiTemplateCycleStatus.CLOSING);
        cycle.setClosingRequestedAt(now);
        cycle.setGraceEndsAt(graceEnds);
        cycle.setUpdatedByUser(currentUser());
        cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(cycle.getId())
                .ifPresent(period -> {
                    if (period.getStatus() != KpiTemplateCyclePeriodStatus.CLOSED) {
                        period.setStatus(KpiTemplateCyclePeriodStatus.CLOSING);
                        cyclePeriodRepository.save(period);
                    }
                });
        cycleRepository.save(cycle);
    }

    private void expireGraceIfNeeded(DepartmentKpiCycle cycle) {
        if (cycle == null || cycle.getId() == null || cycle.getStatus() != KpiTemplateCycleStatus.CLOSING) {
            return;
        }
        LocalDateTime graceEnds = cycle.getGraceEndsAt();
        if (graceEnds == null || LocalDateTime.now().isBefore(graceEnds)) {
            return;
        }
        cycle.setStatus(KpiTemplateCycleStatus.DEACTIVATED);
        cycle.setClosedAt(LocalDateTime.now());
        cycle.setUpdatedByUser(currentUser());
        cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(cycle.getId())
                .ifPresent(period -> {
                    period.setStatus(KpiTemplateCyclePeriodStatus.CLOSED);
                    cyclePeriodRepository.save(period);
                });
        closeOpenResultsForCycle(cycle);
        cycleRepository.saveAndFlush(cycle);
    }

    private void assertEditableDuringGrace(DepartmentKpiResult result) {
        DepartmentKpiCycle cycle = result.getCycle();
        if (cycle == null || cycle.getStatus() != KpiTemplateCycleStatus.CLOSING) {
            return;
        }
        LocalDateTime graceEnds = cycle.getGraceEndsAt();
        if (graceEnds != null && LocalDateTime.now().isAfter(graceEnds)) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "The Department KPI grace period has ended. Scores can no longer be edited."
            );
        }
    }

    private String normalizeText(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        return normalized.length() > maxLength ? normalized.substring(0, maxLength) : normalized;
    }

    private String displayUser(User user) {
        if (user == null) {
            return null;
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getEmail();
    }

    private void closeOpenResultsForCycle(DepartmentKpiCycle cycle) {
        if (cycle == null || cycle.getId() == null) {
            return;
        }
        List<DepartmentKpiCycleTemplate> links = cycleTemplateRepository.findByCycle_Id(cycle.getId());
        for (DepartmentKpiCycleTemplate link : links) {
            Integer templateId = link.getTemplate() == null ? null : link.getTemplate().getId();
            Integer periodId = cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(cycle.getId())
                    .map(DepartmentKpiCyclePeriod::getId)
                    .orElse(null);
            if (templateId == null) {
                continue;
            }
            List<DepartmentKpiResult> results = resultRepository.findByTemplateAndPeriod(templateId, periodId);
            for (DepartmentKpiResult result : results) {
                if (result.getStatus() != DepartmentKpiResultStatus.FINALIZED) {
                    result.setStatus(DepartmentKpiResultStatus.CLOSED);
                }
            }
            resultRepository.saveAll(results);
        }
        resultRepository.flush();
    }

    private void ensureCycleEditable(DepartmentKpiCycle cycle) {
        if (cycle.getStatus() == KpiTemplateCycleStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Active cycles cannot be edited.");
        }
        if (cycle.getStatus() == KpiTemplateCycleStatus.DEACTIVATED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Deactivated cycles cannot be edited.");
        }
    }

    private DepartmentKpiTemplateResponseDto toTemplateDto(DepartmentKpiTemplate template) {
        DepartmentKpiTemplateResponseDto dto = new DepartmentKpiTemplateResponseDto();
        dto.setId(template.getId());
        dto.setTitle(template.getTitle());
        dto.setStartDate(template.getStartDate());
        dto.setEndDate(template.getEndDate());
        dto.setStatus(template.getStatus());
        dto.setCreatedAt(template.getCreatedAt());
        dto.setUpdatedAt(template.getUpdatedAt());
        dto.setCreatedBy(template.getCreatedByUser() == null ? null : template.getCreatedByUser().getFullName());
        dto.setCreatedByUserId(template.getCreatedByUser() == null ? null : template.getCreatedByUser().getId());

        List<DepartmentKpiTemplateResponseDto.DepartmentSummary> departments = template.getDepartments() == null
                ? new ArrayList<>()
                : template.getDepartments().stream()
                .filter(link -> link.getDepartment() != null)
                .sorted(Comparator
                        .comparing((DepartmentKpiTemplateDepartment link) -> firstNonBlank(link.getDepartment().getDepartmentName(), ""))
                        .thenComparing(link -> link.getDepartment().getId() == null ? Integer.MAX_VALUE : link.getDepartment().getId()))
                .map(link -> {
                    DepartmentKpiTemplateResponseDto.DepartmentSummary summary = new DepartmentKpiTemplateResponseDto.DepartmentSummary();
                    summary.setId(link.getDepartment().getId());
                    summary.setDepartmentName(link.getDepartment().getDepartmentName());
                    return summary;
                })
                .toList();
        dto.setDepartments(departments);

        dto.setItems(orderedRows(template).stream().map(this::toKpiFormItemDto).toList());
        return dto;
    }

    private DepartmentKpiCycleResponseDto toCycleDto(DepartmentKpiCycle cycle) {
        DepartmentKpiCycleResponseDto dto = new DepartmentKpiCycleResponseDto();
        dto.setId(cycle.getId());
        dto.setCycleName(cycle.getCycleName());
        dto.setStartDate(cycle.getStartDate());
        dto.setEndDate(cycle.getEndDate());
        dto.setDurationMonths(cycle.getDurationMonths());
        dto.setDurationLabel(durationLabel(cycle.getDurationMonths()));
        dto.setStatus(cycle.getStatus());
        dto.setClosingRequestedAt(cycle.getClosingRequestedAt());
        dto.setGraceEndsAt(cycle.getGraceEndsAt());
        dto.setClosedAt(cycle.getClosedAt());
        dto.setEarlyCloseReason(cycle.getEarlyCloseReason());
        dto.setGraceExtension(cycle.getGraceExtension());
        dto.setEarlyCloseRequestedAt(cycle.getEarlyCloseRequestedAt());
        dto.setEarlyCloseRequestedByUserId(cycle.getEarlyCloseRequestedByUser() == null ? null : cycle.getEarlyCloseRequestedByUser().getId());
        dto.setEarlyCloseRequestedByName(displayUser(cycle.getEarlyCloseRequestedByUser()));
        dto.setEarlyCloseReviewedAt(cycle.getEarlyCloseReviewedAt());
        dto.setEarlyCloseReviewedByUserId(cycle.getEarlyCloseReviewedByUser() == null ? null : cycle.getEarlyCloseReviewedByUser().getId());
        dto.setEarlyCloseReviewedByName(displayUser(cycle.getEarlyCloseReviewedByUser()));
        dto.setEarlyCloseReviewDecision(cycle.getEarlyCloseReviewDecision());
        dto.setEarlyCloseReviewReason(cycle.getEarlyCloseReviewReason());
        dto.setCreatedAt(cycle.getCreatedAt());
        dto.setUpdatedAt(cycle.getUpdatedAt());

        cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(cycle.getId()).ifPresent(period -> {
            dto.setCurrentPeriodId(period.getId());
            dto.setCurrentPeriodNumber(period.getPeriodNumber());
            dto.setCurrentPeriodStartDate(period.getStartDate());
            dto.setCurrentPeriodEndDate(period.getEndDate());
        });

        List<DepartmentKpiCycleResponseDto.TemplateSummary> templates = cycle.getCycleTemplates() == null
                ? new ArrayList<>()
                : cycle.getCycleTemplates().stream()
                .filter(link -> link.getTemplate() != null)
                .map(link -> {
                    DepartmentKpiCycleResponseDto.TemplateSummary summary = new DepartmentKpiCycleResponseDto.TemplateSummary();
                    summary.setId(link.getTemplate().getId());
                    summary.setTitle(link.getTemplate().getTitle());
                    return summary;
                })
                .toList();
        dto.setTemplates(templates);

        return dto;
    }

    private DepartmentKpiResultDto toResultDto(DepartmentKpiResult result) {
        DepartmentKpiResultDto dto = new DepartmentKpiResultDto();
        dto.setDepartmentKpiResultId(result.getId());
        dto.setDepartmentId(result.getDepartment() == null ? null : result.getDepartment().getId());
        dto.setDepartmentName(result.getDepartment() == null ? null : result.getDepartment().getDepartmentName());
        dto.setTemplateId(result.getTemplate() == null ? null : result.getTemplate().getId());
        dto.setTemplateTitle(result.getTemplate() == null ? null : result.getTemplate().getTitle());
        dto.setCyclePeriodId(result.getCyclePeriod() == null ? null : result.getCyclePeriod().getId());
        dto.setStatus(result.getStatus());
        dto.setTotalScore(result.getTotalScore());
        dto.setTotalWeightedScore(result.getTotalWeightedScore());
        dto.setFinalizedAt(result.getFinalizedAt());
        dto.setPeriodStartDate(result.getCyclePeriod() == null ? null : result.getCyclePeriod().getStartDate());
        dto.setPeriodEndDate(result.getCyclePeriod() == null ? null : result.getCyclePeriod().getEndDate());

        List<DepartmentKpiResultDto.Line> lines = result.getScores() == null
                ? new ArrayList<>()
                : result.getScores().stream()
                .sorted(Comparator.comparing(score -> score.getTemplateRow() == null || score.getTemplateRow().getSortOrder() == null ? Integer.MAX_VALUE : score.getTemplateRow().getSortOrder()))
                .map(score -> {
                    DepartmentKpiTemplateRow row = score.getTemplateRow();
                    DepartmentKpiResultDto.Line line = new DepartmentKpiResultDto.Line();
                    line.setTemplateRowId(row == null ? null : row.getId());
                    line.setKpiLabel(row == null ? null : row.getKpiLabel());
                    line.setTarget(row == null ? null : row.getTarget());
                    line.setWeight(row == null ? null : row.getWeight());
                    line.setUnitName(row == null ? null : firstNonBlank(row.getKpiUnitLabel(), row.getKpiUnit() == null ? null : row.getKpiUnit().getName()));
                    line.setActualValue(score.getActualValue());
                    line.setScore(score.getScore());
                    line.setWeightedScore(score.getWeightedScore());
                    return line;
                })
                .toList();
        dto.setLines(lines);

        return dto;
    }

    private KpiFormItemDTO toKpiFormItemDto(DepartmentKpiTemplateRow row) {
        KpiFormItemDTO dto = new KpiFormItemDTO();
        dto.setId(row.getId());
        dto.setKpiLabel(row.getKpiLabel());
        dto.setKpiItemId(row.getKpiItem() == null ? null : row.getKpiItem().getId());
        dto.setKpiItemName(row.getKpiItem() == null ? row.getKpiLabel() : row.getKpiItem().getName());
        dto.setKpiCategoryId(row.getKpiCategory() == null ? null : row.getKpiCategory().getId());
        dto.setKpiCategoryName(row.getKpiCategory() == null ? row.getKpiCategoryLabel() : row.getKpiCategory().getName());
        dto.setKpiCategoryLabel(row.getKpiCategoryLabel());
        dto.setKpiUnitId(row.getKpiUnit() == null ? null : row.getKpiUnit().getId());
        dto.setKpiUnitName(row.getKpiUnit() == null ? row.getKpiUnitLabel() : row.getKpiUnit().getName());
        dto.setKpiUnitLabel(row.getKpiUnitLabel());
        dto.setTarget(row.getTarget());
        dto.setWeight(row.getWeight());
        dto.setSortOrder(row.getSortOrder());
        return dto;
    }

    private List<DepartmentKpiTemplateRow> orderedRows(DepartmentKpiTemplate template) {
        if (template == null || template.getRows() == null) {
            return List.of();
        }
        Set<Integer> seenIds = new LinkedHashSet<>();
        return template.getRows().stream()
                .filter(row -> row.getId() == null || seenIds.add(row.getId()))
                .sorted(Comparator.comparing(row -> row.getSortOrder() == null ? Integer.MAX_VALUE : row.getSortOrder()))
                .toList();
    }

    private User currentUser() {
        Integer userId = SecurityUtils.currentUserId();
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authenticated user not found."));
    }

    private String cleanRequired(String value, String message) {
        String cleaned = cleanOptional(value);
        if (cleaned == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, message);
        }
        return cleaned;
    }

    private String cleanOptional(String value) {
        if (value == null) {
            return null;
        }
        String cleaned = value.trim();
        return cleaned.isEmpty() ? null : cleaned;
    }

    private String firstNonBlank(String... values) {
        if (values == null) {
            return null;
        }
        for (String value : values) {
            String cleaned = cleanOptional(value);
            if (cleaned != null) {
                return cleaned;
            }
        }
        return null;
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private LocalDate calculateEndDate(LocalDate startDate, int durationMonths) {
        return startDate.plusMonths(durationMonths).minusDays(1);
    }

    private String durationLabel(Integer durationMonths) {
        if (durationMonths == null) {
            return null;
        }
        return durationMonths == 1 ? "1 month" : durationMonths + " months";
    }
}
