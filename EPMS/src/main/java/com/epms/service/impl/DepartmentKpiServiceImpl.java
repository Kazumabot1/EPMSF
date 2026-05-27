package com.epms.service.impl;

import com.epms.dto.*;
import com.epms.entity.*;
import com.epms.entity.enums.DepartmentKpiResultStatus;
import com.epms.entity.enums.KpiEarlyCloseReviewDecision;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.entity.enums.KpiGraceExtension;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.notification.NotificationEventKey;
import com.epms.repository.*;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.AuditLogService;
import com.epms.service.DepartmentKpiService;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Month;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class DepartmentKpiServiceImpl implements DepartmentKpiService {
    private static final Set<Integer> ALLOWED_DURATION_MONTHS = Set.of(3, 4, 5, 6, 7, 8, 9, 10, 11, 12);
    private static final Set<Integer> ALLOWED_DURATION_YEARS = Set.of(1, 2, 3, 4, 5);
    private static final String TYPE_DEPARTMENT_KPI_FINALIZED = "DEPARTMENT_KPI_FINALIZED";
    private static final String TYPE_DEPARTMENT_KPI_FINALIZATION_APPROVAL = "DEPARTMENT_KPI_FINALIZATION_APPROVAL";

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
    private final Clock clock;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public DepartmentKpiTemplateResponseDto createTemplate(DepartmentKpiTemplateRequestDto request) {
        validateTemplateRequest(request);
        User user = currentUser();
        DepartmentKpiTemplate template = DepartmentKpiTemplate.builder()
                .title(request.getTitle().trim())
                .durationMonths(request.getDurationMonths())
                .status(request.getStatus() == null ? KpiFormStatus.DRAFT : request.getStatus())
                .createdByUser(user)
                .build();
        applyTemplateRows(template, request.getItems());
        applyTemplateDepartments(template, request.getDepartmentIds());
        DepartmentKpiTemplate saved = templateRepository.saveAndFlush(template);
        audit(user.getId(), "CREATE", "DEPARTMENT_KPI_TEMPLATE", saved.getId(), null, null, "title: " + saved.getTitle(), null);
        return getTemplate(saved.getId());
    }

    @Override
    @Transactional
    public DepartmentKpiTemplateResponseDto updateTemplate(Integer id, DepartmentKpiTemplateRequestDto request) {
        validateTemplateRequest(request);
        DepartmentKpiTemplate template = templateRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI template not found."));
        String oldTitle = template.getTitle();
        template.setTitle(request.getTitle().trim());
        template.setDurationMonths(request.getDurationMonths());
        template.setStatus(request.getStatus() == null ? KpiFormStatus.DRAFT : request.getStatus());
        template.setUpdatedByUser(currentUser());
        template.getRows().clear();
        template.getDepartments().clear();
        templateRepository.flush();
        applyTemplateRows(template, request.getItems());
        applyTemplateDepartments(template, request.getDepartmentIds());
        templateRepository.saveAndFlush(template);
        audit(currentUserId(), "UPDATE", "DEPARTMENT_KPI_TEMPLATE", template.getId(), "title", oldTitle, template.getTitle(), null);
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
        Integer durationYears = normalizedDurationYears(request);
        DepartmentKpiCycle cycle = DepartmentKpiCycle.builder()
                .cycleName(request.getCycleName().trim())
                .startDate(request.getStartDate())
                .durationMonths(durationYears * 12)
                .durationYears(durationYears)
                .endDate(calculateEndDate(request.getStartDate(), durationYears))
                .status(KpiTemplateCycleStatus.DRAFT)
                .createdByUser(currentUser())
                .build();
        applyCycleTemplates(cycle, request.getTemplateIds());
        DepartmentKpiCycle saved = cycleRepository.saveAndFlush(cycle);
        audit(currentUserId(), "CREATE", "DEPARTMENT_KPI_CYCLE", saved.getId(), null, null, "title: " + saved.getCycleName(), null);
        return getCycle(saved.getId());
    }

    @Override
    @Transactional
    public DepartmentKpiCycleResponseDto updateCycle(Integer id, DepartmentKpiCycleRequestDto request) {
        validateCycleRequest(request);
        DepartmentKpiCycle cycle = cycleRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI cycle not found."));
        ensureCycleEditable(cycle);
        String editReason = normalizeEditReason(request.getEditReason());
        if (editReason == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Edit reason is required.");
        }
        Integer durationYears = normalizedDurationYears(request);
        cycle.setLastEditReason(editReason);
        String oldCycleName = cycle.getCycleName();
        cycle.setCycleName(request.getCycleName().trim());
        cycle.setStartDate(request.getStartDate());
        cycle.setDurationMonths(durationYears * 12);
        cycle.setDurationYears(durationYears);
        cycle.setEndDate(calculateEndDate(request.getStartDate(), durationYears));
        cycle.setUpdatedByUser(currentUser());
        cycle.getCycleTemplates().clear();
        cycleRepository.flush();
        applyCycleTemplates(cycle, request.getTemplateIds());
        cycleRepository.saveAndFlush(cycle);
        audit(currentUserId(), "UPDATE", "DEPARTMENT_KPI_CYCLE", cycle.getId(), "cycleName", oldCycleName, cycle.getCycleName(), editReason);
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
    public DepartmentKpiCycleResponseDto updateCycleStatus(Integer id, DepartmentKpiCycleStatusRequestDTO request) {
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
            LocalDateTime now = LocalDateTime.now(clock);
            cycle.setStatus(KpiTemplateCycleStatus.DEACTIVATED);
            cycle.setClosingRequestedAt(now);
            cycle.setGraceEndsAt(null);
            cycle.setClosedAt(now);
        }
        cycle.setUpdatedByUser(currentUser());
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
        LocalDateTime now = LocalDateTime.now(clock);
        KpiGraceExtension extension = cycle.getGraceExtension();
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grace period extension is missing.");
        }
        cycle.setStatus(KpiTemplateCycleStatus.CLOSING);
        cycle.setClosingRequestedAt(now);
        cycle.setGraceEndsAt(extension.addTo(now));
        cycle.setClosedAt(null);
        cycle.setEarlyCloseReviewedAt(now);
        cycle.setEarlyCloseReviewedByUser(reviewer);
        cycle.setEarlyCloseReviewDecision(KpiEarlyCloseReviewDecision.APPROVED);
        cycle.setEarlyCloseReviewReason(normalizeEditReason(reviewReason));
        cycle.setUpdatedByUser(reviewer);
        cycleRepository.saveAndFlush(cycle);
        return getCycle(id);
    }

    @Override
    @Transactional
    public DepartmentKpiCycleResponseDto rejectEarlyClose(Integer id, String reviewReason) {
        DepartmentKpiCycle cycle = requirePendingApproval(id);
        User reviewer = currentUser();
        cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);
        cycle.setEarlyCloseReviewedAt(LocalDateTime.now(clock));
        cycle.setEarlyCloseReviewedByUser(reviewer);
        cycle.setEarlyCloseReviewDecision(KpiEarlyCloseReviewDecision.REJECTED);
        cycle.setEarlyCloseReviewReason(normalizeEditReason(reviewReason));
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
        if (result.getStatus() == DepartmentKpiResultStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Scores cannot be changed while CEO approval is pending.");
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
            if (actual > target) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Row " + rowNumber(result, score) + ": Actual % must be less than or equal to Target %."
                );
            }
            score.setActualValue(actual);
            score.setScore((actual / target) * 100.0);
            score.setEvaluatedByUser(evaluator);
            score.setEvaluatedAt(LocalDateTime.now());
            score.calculateWeightedScore();
            validateWeightScoreWithinWeight(result, score);
            audit(
                    evaluator.getId(),
                    "SCORE",
                    "DEPARTMENT_KPI_SCORE",
                    score.getId(),
                    "actualValue",
                    null,
                    "title: " + resultTitle(result) + " | score: " + score.getScore(),
                    null
            );
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
    public DepartmentKpiResultDto requestFinalization(Integer resultId, DepartmentKpiFinalizationRequestDto request) {
        DepartmentKpiResult result = resultRepository.findDetailById(resultId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI result not found."));
        if (result.getStatus() == DepartmentKpiResultStatus.FINALIZED || result.getStatus() == DepartmentKpiResultStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Department KPI result is already finalized.");
        }
        if (result.getStatus() == DepartmentKpiResultStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Department KPI finalization is already pending CEO approval.");
        }
        String reason = request == null || request.getReason() == null ? "" : request.getReason().trim();
        if (reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Finalization reason is required.");
        }
        ensureResultComplete(result);
        result.calculateTotals();
        User requester = currentUser();
        result.setStatus(DepartmentKpiResultStatus.PENDING_APPROVAL);
        result.setFinalizationRequestReason(reason);
        result.setFinalizationRequestedAt(LocalDateTime.now(clock));
        result.setFinalizationRequestedByUser(requester);
        result.setFinalizationReviewDecision(null);
        result.setFinalizationReviewReason(null);
        result.setFinalizationReviewedAt(null);
        result.setFinalizationReviewedByUser(null);
        DepartmentKpiResult saved = resultRepository.saveAndFlush(result);
        notifyExecutivesOfFinalizationRequest(saved);
        return toResultDto(saved);
    }

    @Override
    @Transactional
    public DepartmentKpiResultDto finalizeResult(Integer resultId) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Submit Department KPI finalization for CEO approval.");
    }

    @Override
    @Transactional
    public int finalizeTemplate(Integer templateId, Integer cyclePeriodId) {
        throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Bulk Department KPI finalization is not available. Submit each result for CEO approval.");
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
                DepartmentKpiResultStatus.PENDING_APPROVAL,
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

    @Override
    @Transactional(readOnly = true)
    public List<DepartmentKpiResultDto> listPendingFinalizationRequests() {
        return resultRepository.findByStatusOrderByFinalizationRequestedAtAsc(DepartmentKpiResultStatus.PENDING_APPROVAL)
                .stream().map(this::toResultDto).toList();
    }

    @Override
    @Transactional
    public DepartmentKpiResultDto approveFinalization(Integer resultId, String reviewReason) {
        DepartmentKpiResult result = requirePendingFinalization(resultId);
        result.setFinalizationReviewDecision(KpiEarlyCloseReviewDecision.APPROVED);
        result.setFinalizationReviewReason(cleanOptionalText(reviewReason));
        result.setFinalizationReviewedAt(LocalDateTime.now(clock));
        result.setFinalizationReviewedByUser(currentUser());
        finalizeOne(result, LocalDateTime.now(clock));
        DepartmentKpiResult saved = resultRepository.saveAndFlush(result);
        notifyDepartmentHeads(saved);
        notifyFinalizationRequester(saved, true);
        return toResultDto(saved);
    }

    @Override
    @Transactional
    public DepartmentKpiResultDto rejectFinalization(Integer resultId, String reviewReason) {
        DepartmentKpiResult result = requirePendingFinalization(resultId);
        result.setStatus(DepartmentKpiResultStatus.IN_PROGRESS);
        result.setFinalizationReviewDecision(KpiEarlyCloseReviewDecision.REJECTED);
        result.setFinalizationReviewReason(cleanOptionalText(reviewReason));
        result.setFinalizationReviewedAt(LocalDateTime.now(clock));
        result.setFinalizationReviewedByUser(currentUser());
        DepartmentKpiResult saved = resultRepository.saveAndFlush(result);
        notifyFinalizationRequester(saved, false);
        return toResultDto(saved);
    }

    private void finalizeOne(DepartmentKpiResult result, LocalDateTime now) {
        if (result.getStatus() == DepartmentKpiResultStatus.FINALIZED || result.getStatus() == DepartmentKpiResultStatus.CLOSED) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Department KPI result is already closed.");
        }
        ensureResultComplete(result);
        result.calculateTotals();
        result.setStatus(DepartmentKpiResultStatus.FINALIZED);
        result.setFinalizedAt(now);
        result.setFinalizedByUser(currentUser());
    }

    private void ensureResultComplete(DepartmentKpiResult result) {
        if (result.getScores() == null || result.getScores().isEmpty()
                || result.getScores().stream().anyMatch(s -> s.getScore() == null)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Complete all KPI rows before finalizing.");
        }
    }

    private DepartmentKpiResult requirePendingFinalization(Integer resultId) {
        DepartmentKpiResult result = resultRepository.findDetailById(resultId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI result not found."));
        if (result.getStatus() != DepartmentKpiResultStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending Department KPI finalization request exists for this result.");
        }
        return result;
    }

    private void validateWeightScoreWithinWeight(DepartmentKpiResult result, DepartmentKpiScore score) {
        Double weightScore = score.getWeightedScore();
        DepartmentKpiTemplateRow row = score.getTemplateRow();
        Integer weight = row == null ? null : row.getWeight();
        if (weightScore != null && weight != null && weightScore > weight) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Row " + rowNumber(result, score) + ": Weight Score must be less than or equal to Weight %."
            );
        }
    }

    private int rowNumber(DepartmentKpiResult result, DepartmentKpiScore score) {
        if (result == null || result.getScores() == null || score == null || score.getTemplateRow() == null) {
            return 1;
        }
        List<DepartmentKpiScore> ordered = result.getScores().stream()
                .sorted(Comparator.comparing(s -> {
                    DepartmentKpiTemplateRow row = s.getTemplateRow();
                    return row == null || row.getSortOrder() == null ? 0 : row.getSortOrder();
                }))
                .toList();
        for (int i = 0; i < ordered.size(); i++) {
            DepartmentKpiTemplateRow row = ordered.get(i).getTemplateRow();
            if (row != null && row.getId() != null && row.getId().equals(score.getTemplateRow().getId())) {
                return i + 1;
            }
        }
        return 1;
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
                        .endDate(calculateEndDate(cycle.getStartDate(), responseDurationYears(cycle)))
                        .status(KpiTemplateCyclePeriodStatus.OPEN)
                        .build()));
    }

    private DepartmentKpiCycle requirePendingApproval(Integer id) {
        DepartmentKpiCycle cycle = cycleRepository.findDetailById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Department KPI cycle not found."));
        if (cycle.getStatus() != KpiTemplateCycleStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending Department KPI early close request exists for this cycle.");
        }
        return cycle;
    }

    private void requestEarlyClose(DepartmentKpiCycle cycle, DepartmentKpiCycleStatusRequestDTO request) {
        String reason = normalizeEditReason(request.getReason());
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason is required to request early cycle closure.");
        }
        if (request.getGraceExtension() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grace period extension is required.");
        }
        User requester = currentUser();
        cycle.setStatus(KpiTemplateCycleStatus.PENDING_APPROVAL);
        cycle.setEarlyCloseReason(reason);
        cycle.setGraceExtension(request.getGraceExtension());
        cycle.setEarlyCloseRequestedAt(LocalDateTime.now(clock));
        cycle.setEarlyCloseRequestedByUser(requester);
        cycle.setEarlyCloseReviewedAt(null);
        cycle.setEarlyCloseReviewedByUser(null);
        cycle.setEarlyCloseReviewDecision(null);
        cycle.setEarlyCloseReviewReason(null);
        cycle.setUpdatedByUser(requester);
    }

    private boolean isBeforeOfficialEndDate(DepartmentKpiCycle cycle) {
        LocalDate officialEnd = cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(cycle.getId())
                .map(DepartmentKpiCyclePeriod::getEndDate)
                .orElse(cycle.getEndDate());
        return officialEnd != null && LocalDate.now(clock).isBefore(officialEnd);
    }

    private void ensureCycleEditable(DepartmentKpiCycle cycle) {
        if (cycle.getStatus() == KpiTemplateCycleStatus.ACTIVE) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Active cycles cannot be edited.");
        }
        if (cycle.getStatus() == KpiTemplateCycleStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cycles pending CEO approval cannot be edited.");
        }
        if (cycle.getStatus() == KpiTemplateCycleStatus.CLOSING
                && cycle.getEarlyCloseReviewDecision() == KpiEarlyCloseReviewDecision.APPROVED) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "CEO approved closure; this cycle can no longer be edited."
            );
        }
        if (cycle.getStatus() == KpiTemplateCycleStatus.CLOSING
                && cycle.getGraceEndsAt() != null
                && !cycle.getGraceEndsAt().isAfter(LocalDateTime.now(clock))) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Grace period has ended; this cycle can no longer be edited."
            );
        }
    }

    private void validateTemplateRequest(DepartmentKpiTemplateRequestDto request) {
        if (request.getTitle() == null || request.getTitle().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template title is required.");
        }
        if (request.getDepartmentIds() == null || request.getDepartmentIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select at least one department.");
        }
        if (request.getDurationMonths() == null || !ALLOWED_DURATION_MONTHS.contains(request.getDurationMonths())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Template duration must be between 3 months and 1 year.");
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
        if (request.getStartDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date is required.");
        }
        if (request.getStartDate().isBefore(LocalDate.now(clock))) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date cannot be in the past.");
        }
        Integer durationYears = normalizedDurationYears(request);
        if (!ALLOWED_DURATION_YEARS.contains(durationYears)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Duration must be between 1 and 5 years.");
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

    private void assertTemplatesNotUsedByOtherActiveCycles(Integer excludeCycleId, List<Integer> templateIds) {
        if (templateIds == null || templateIds.isEmpty()) {
            return;
        }
        List<DepartmentKpiCycleTemplate> conflicts = cycleTemplateRepository.findConflictingLinks(
                KpiTemplateCycleStatus.ACTIVE,
                excludeCycleId,
                templateIds
        );
        if (conflicts == null || conflicts.isEmpty()) {
            return;
        }
        DepartmentKpiCycleTemplate conflict = conflicts.get(0);
        String templateTitle = conflict.getTemplate().getTitle();
        String cycleName = conflict.getCycle().getCycleName();
        throw new ResponseStatusException(
                HttpStatus.BAD_REQUEST,
                "Department KPI template \"" + templateTitle + "\" is already used by the active cycle \"" + cycleName + "\"."
        );
    }

    private String normalizeEditReason(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        if (trimmed.isEmpty()) {
            return null;
        }
        return trimmed.length() > 1000 ? trimmed.substring(0, 1000) : trimmed;
    }

    private String cleanOptionalText(String value) {
        return normalizeEditReason(value);
    }

    private void applyCycleTemplates(DepartmentKpiCycle cycle, List<Integer> templateIds) {
        List<Integer> distinctIds = templateIds.stream().distinct().toList();
        assertTemplatesNotUsedByOtherActiveCycles(cycle.getId(), distinctIds);
        for (Integer id : distinctIds) {
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
                .durationMonths(t.getDurationMonths())
                .durationLabel(durationMonthLabel(t.getDurationMonths()))
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
        Integer durationYears = responseDurationYears(c);
        return DepartmentKpiCycleResponseDto.builder()
                .id(c.getId())
                .cycleName(c.getCycleName())
                .startDate(c.getStartDate())
                .endDate(c.getEndDate())
                .durationMonths(c.getDurationMonths())
                .durationYears(durationYears)
                .durationLabel(durationYearLabel(durationYears))
                .status(c.getStatus())
                .currentPeriodId(period == null ? null : period.getId())
                .currentPeriodNumber(period == null ? null : period.getPeriodNumber())
                .currentPeriodStartDate(period == null ? null : period.getStartDate())
                .currentPeriodEndDate(period == null ? null : period.getEndDate())
                .closingRequestedAt(c.getClosingRequestedAt())
                .graceEndsAt(c.getGraceEndsAt())
                .closedAt(c.getClosedAt())
                .earlyCloseReason(c.getEarlyCloseReason())
                .graceExtension(c.getGraceExtension())
                .earlyCloseRequestedAt(c.getEarlyCloseRequestedAt())
                .earlyCloseRequestedByUserId(c.getEarlyCloseRequestedByUser() == null ? null : c.getEarlyCloseRequestedByUser().getId())
                .earlyCloseRequestedByName(c.getEarlyCloseRequestedByUser() == null ? null : displayUser(c.getEarlyCloseRequestedByUser()))
                .earlyCloseReviewedAt(c.getEarlyCloseReviewedAt())
                .earlyCloseReviewedByUserId(c.getEarlyCloseReviewedByUser() == null ? null : c.getEarlyCloseReviewedByUser().getId())
                .earlyCloseReviewedByName(c.getEarlyCloseReviewedByUser() == null ? null : displayUser(c.getEarlyCloseReviewedByUser()))
                .earlyCloseReviewDecision(c.getEarlyCloseReviewDecision())
                .earlyCloseReviewReason(c.getEarlyCloseReviewReason())
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
                .finalizationRequestReason(r.getFinalizationRequestReason())
                .finalizationRequestedAt(r.getFinalizationRequestedAt())
                .finalizationRequestedByUserId(r.getFinalizationRequestedByUser() == null ? null : r.getFinalizationRequestedByUser().getId())
                .finalizationRequestedByName(r.getFinalizationRequestedByUser() == null ? null : displayUser(r.getFinalizationRequestedByUser()))
                .finalizationReviewDecision(r.getFinalizationReviewDecision())
                .finalizationReviewReason(r.getFinalizationReviewReason())
                .finalizationReviewedAt(r.getFinalizationReviewedAt())
                .finalizationReviewedByUserId(r.getFinalizationReviewedByUser() == null ? null : r.getFinalizationReviewedByUser().getId())
                .finalizationReviewedByName(r.getFinalizationReviewedByUser() == null ? null : displayUser(r.getFinalizationReviewedByUser()))
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
            notificationService.sendEvent(
                    head.getId(),
                    NotificationEventKey.DEPARTMENT_KPI_FINALIZED,
                    "Department KPI finalized",
                    "HR finalized Department KPI \"" + result.getTemplate().getTitle() + "\" for " + result.getDepartment().getDepartmentName()
                            + ". Weighted score: " + (result.getTotalWeightedScore() == null ? "-" : String.format("%.2f", result.getTotalWeightedScore())) + ".",
                    TYPE_DEPARTMENT_KPI_FINALIZED,
                    result.getId()
            );
        }
    }

    private void notifyExecutivesOfFinalizationRequest(DepartmentKpiResult result) {
        for (User executive : userRepository.findActiveUsersByNormalizedRoleNames(List.of("CEO", "EXECUTIVE"))) {
            notificationService.sendEvent(
                    executive.getId(),
                    NotificationEventKey.DEPARTMENT_KPI_APPROVAL_REQUESTED,
                    "Department KPI finalization approval needed",
                    "HR requested final approval for Department KPI \"" + result.getTemplate().getTitle() + "\" for "
                            + result.getDepartment().getDepartmentName() + ".",
                    TYPE_DEPARTMENT_KPI_FINALIZATION_APPROVAL,
                    result.getId()
            );
        }
    }

    private void notifyFinalizationRequester(DepartmentKpiResult result, boolean approved) {
        User requester = result.getFinalizationRequestedByUser();
        if (requester == null || requester.getId() == null) {
            return;
        }
        notificationService.sendEvent(
                requester.getId(),
                NotificationEventKey.DEPARTMENT_KPI_APPROVAL_DECIDED,
                approved ? "Department KPI finalization approved" : "Department KPI finalization rejected",
                approved
                        ? "CEO approved Department KPI finalization for " + result.getDepartment().getDepartmentName() + "."
                        : "CEO rejected Department KPI finalization for " + result.getDepartment().getDepartmentName() + ". You can continue scoring.",
                TYPE_DEPARTMENT_KPI_FINALIZATION_APPROVAL,
                result.getId()
        );
    }

    private Integer normalizedDurationYears(DepartmentKpiCycleRequestDto request) {
        if (request.getDurationYears() != null) {
            return request.getDurationYears();
        }
        if (request.getDurationMonths() != null) {
            return Math.max(1, Math.min(5, (int) Math.ceil(request.getDurationMonths() / 12.0)));
        }
        return null;
    }

    private LocalDate calculateEndDate(LocalDate startDate, int durationYears) {
        if (startDate.getMonth() == Month.FEBRUARY && startDate.getDayOfMonth() == 29
                && !startDate.plusYears(durationYears).isLeapYear()) {
            return startDate.plusYears(durationYears);
        }
        return startDate.plusYears(durationYears).minusDays(1);
    }

    private Integer responseDurationYears(DepartmentKpiCycle cycle) {
        if (cycle.getDurationYears() != null && ALLOWED_DURATION_YEARS.contains(cycle.getDurationYears())) {
            return cycle.getDurationYears();
        }
        if (cycle.getDurationMonths() != null) {
            return Math.max(1, Math.min(5, (int) Math.ceil(cycle.getDurationMonths() / 12.0)));
        }
        return 1;
    }

    private String durationYearLabel(Integer years) {
        return years == null || years == 1 ? "1 year" : years + " years";
    }

    private String durationMonthLabel(Integer months) {
        return months == null || months == 12 ? "1 year" : months + " months";
    }

    private User currentUser() {
        return userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found."));
    }

    private Integer currentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String resultTitle(DepartmentKpiResult result) {
        if (result == null) {
            return "Department KPI Result";
        }

        String departmentName = result.getDepartment() == null ? null : result.getDepartment().getDepartmentName();
        String templateName = result.getTemplate() == null ? null : result.getTemplate().getTitle();
        return (departmentName == null || departmentName.isBlank() ? "Department" : departmentName)
                + " - "
                + (templateName == null || templateName.isBlank() ? "KPI Result" : templateName);
    }

    private void audit(
            Integer userId,
            String action,
            String entityType,
            Integer entityId,
            String changedColumn,
            String oldValue,
            String newValue,
            String reason
    ) {
        if (auditLogService != null) {
            auditLogService.log(userId, action, entityType, entityId, changedColumn, oldValue, newValue, reason);
        }
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
