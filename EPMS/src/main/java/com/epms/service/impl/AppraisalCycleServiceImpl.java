package com.epms.service.impl;

import com.epms.dto.appraisal.AppraisalCycleRequest;
import com.epms.dto.appraisal.AppraisalCycleResponse;
import com.epms.dto.appraisal.AppraisalTemplateCycleRequest;
import com.epms.dto.appraisal.AppraisalTemplateResponse;
import com.epms.entity.*;
import com.epms.entity.enums.AppraisalCycleStatus;
import com.epms.entity.enums.AppraisalCycleType;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.notification.NotificationEventKey;
import com.epms.repository.*;
import com.epms.service.AppraisalCycleService;
import com.epms.service.AuditLogService;
import com.epms.service.AppraisalTemplateService;
import com.epms.service.NotificationService;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AppraisalCycleServiceImpl implements AppraisalCycleService {

    private static final DateTimeFormatter APPRAISAL_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final String TEMPLATE_CHANGE_RECORD_SEPARATOR = Character.toString((char) 30);
    private static final String TEMPLATE_CHANGE_FIELD_SEPARATOR = Character.toString((char) 31);

    private final AppraisalCycleRepository cycleRepository;
    private final AppraisalCycleDepartmentRepository cycleDepartmentRepository;
    private final AppraisalFormTemplateRepository templateRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final AppraisalTemplateService appraisalTemplateService;
    private final NotificationService notificationService;
    private final AuditLogService auditLogService;
    private final JdbcTemplate jdbcTemplate;

    @PersistenceContext
    private EntityManager entityManager;

    @Override
    public AppraisalCycleResponse createTemplateAndCycle(AppraisalTemplateCycleRequest request, Integer createdByUserId) {
        if (request == null || request.getTemplate() == null || request.getCycle() == null) {
            throw new BadRequestException("Template and cycle information are required.");
        }

        AppraisalTemplateResponse template = appraisalTemplateService.createTemplate(request.getTemplate(), createdByUserId);

        AppraisalCycleRequest cycleRequest = request.getCycle();
        cycleRequest.setTemplateId(template.getId());
        if (cycleRequest.getCycleType() == null) {
            cycleRequest.setCycleType(request.getTemplate().getFormType() != null
                    ? request.getTemplate().getFormType()
                    : AppraisalCycleType.ANNUAL);
        }
        if (cycleRequest.getDepartmentIds() == null || cycleRequest.getDepartmentIds().isEmpty()) {
            cycleRequest.setDepartmentIds(request.getTemplate().getDepartmentIds());
        }
        return createCycle(cycleRequest, createdByUserId);
    }

    @Override
    public AppraisalCycleResponse createCycle(AppraisalCycleRequest request, Integer createdByUserId) {
        validateCycleRequest(request);

        AppraisalFormTemplate template = templateRepository.findById(request.getTemplateId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal template not found with id: " + request.getTemplateId()));
        CycleDates dates = calculateCycleDates(request);

        AppraisalCycle cycle = new AppraisalCycle();
        cycle.setCycleName(request.getCycleName().trim());
        cycle.setDescription(request.getDescription());
        cycle.setTemplate(template);
        cycle.setCycleType(request.getCycleType());
        cycle.setCycleYear(dates.cycleYear());
        cycle.setPeriodNo(dates.periodNo());
        cycle.setStartDate(dates.startDate());
        cycle.setEndDate(dates.endDate());
        applySubmissionDeadlines(cycle, request);
        cycle.setStatus(AppraisalCycleStatus.DRAFT);
        cycle.setLocked(false);

        if (createdByUserId != null) {
            User user = userRepository.findById(createdByUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + createdByUserId));
            cycle.setCreatedByUser(user);
        }

        applyCycleDepartments(cycle, request, template);
        return mapCycle(cycleRepository.save(cycle));
    }

    @Override
    public AppraisalCycleResponse getCycle(Integer cycleId) {
        autoLockExpiredActiveCycles();
        AppraisalCycle cycle = getCycleEntity(cycleId);
        return mapCycle(cycle);
    }

    @Override
    public AppraisalCycleResponse updateDraftCycle(Integer cycleId, AppraisalCycleRequest request, Integer updatedByUserId) {
        if (request == null) {
            throw new BadRequestException("Cycle request is required.");
        }

        dropLegacyCycleUniqueIndexesIfPresent();

        AppraisalCycle cycle = getCycleEntity(cycleId);
        String auditBefore = cycleAuditSummary(cycle);

        AppraisalFormTemplate template = cycle.getTemplate();
        if (request.getTemplateId() != null) {
            template = templateRepository.findById(request.getTemplateId())
                    .orElseThrow(() -> new ResourceNotFoundException("Appraisal template not found with id: " + request.getTemplateId()));
        }
        if (template == null) {
            throw new ResourceNotFoundException("Appraisal template not found for cycle id: " + cycleId);
        }

        AppraisalCycleType cycleType = request.getCycleType() != null ? request.getCycleType() : cycle.getCycleType();
        if (cycleType == null) {
            cycleType = AppraisalCycleType.CUSTOM;
        }
        Integer cycleYear = request.getCycleYear() != null
                ? request.getCycleYear()
                : cycle.getCycleYear() != null ? cycle.getCycleYear() : LocalDate.now().getYear();
        CycleDates dates = calculateCycleDatesForUpdate(request, cycle, cycleType, cycleYear);
        CycleDeadlines deadlines = resolveSubmissionDeadlinesForUpdate(cycle, request, dates);
        validateResolvedCycleDates(dates, deadlines, true);

        String cycleName = request.getCycleName() != null && !request.getCycleName().isBlank()
                ? request.getCycleName().trim()
                : cycle.getCycleName();
        if (cycleName == null || cycleName.isBlank()) {
            cycleName = "Appraisal Cycle #" + cycleId;
        }

        List<Integer> departmentIds = resolveCycleDepartmentIds(request, template);
        AppraisalCycle saved;
        try {
            updateCycleScalarFieldsWithJdbc(
                    cycleId,
                    limitText(cycleName, 180),
                    request.getDescription(),
                    template.getId(),
                    cycleType,
                    dates,
                    deadlines
            );
            replaceCycleDepartmentsWithJdbc(cycleId, departmentIds);
            entityManager.clear();
            saved = cycleRepository.findByIdWithTemplateAndDepartments(cycleId)
                    .orElseGet(() -> getCycleEntity(cycleId));
        } catch (Exception jdbcUpdateError) {
            // Some local databases still have old schema/index differences.  The HR edit flow
            // must not be blocked by those low-level JDBC path conflicts, so fall back to a
            // regular managed-entity save with the same payload.
            entityManager.clear();
            saved = updateCycleWithManagedEntity(
                    cycleId,
                    limitText(cycleName, 180),
                    request.getDescription(),
                    template,
                    cycleType,
                    dates,
                    deadlines,
                    departmentIds
            );
        }

        auditCycleUpdateSafely(saved, updatedByUserId, auditBefore, request.getEditReason(), request.getTemplateChangeSummary());
        return mapCycle(saved);
    }

    @Override
    public List<AppraisalCycleResponse> getCycles(AppraisalCycleStatus status) {
        autoLockExpiredActiveCycles();
        List<AppraisalCycle> cycles = status == null ? cycleRepository.findAll() : cycleRepository.findByStatus(status);
        return cycles.stream()
                .sorted(Comparator.comparing(AppraisalCycle::getCreatedAt, Comparator.nullsFirst(Date::compareTo)).reversed())
                .map(this::mapCycle)
                .toList();
    }


    @Override
    public int autoLockExpiredActiveCycles() {
        List<AppraisalCycle> expiredCycles = cycleRepository.findExpiredUnlockedCycles(
                AppraisalCycleStatus.ACTIVE,
                LocalDate.now()
        );

        expiredCycles.forEach(cycle -> {
            cycle.setLocked(true);
            cycle.setStatus(AppraisalCycleStatus.LOCKED);
        });

        if (!expiredCycles.isEmpty()) {
            cycleRepository.saveAll(expiredCycles);
            expiredCycles.forEach(this::notifyManagersAndDeptHeadsCycleLocked);
        }

        return expiredCycles.size();
    }

    @Override
    public int sendUpcomingDeadlineNotifications() {
        List<AppraisalCycle> activeCycles = cycleRepository.findByStatus(AppraisalCycleStatus.ACTIVE);
        int sentCount = 0;

        for (AppraisalCycle cycle : activeCycles) {
            if (cycle == null || Boolean.TRUE.equals(cycle.getLocked())) {
                continue;
            }
            sentCount += sendManagerReviewStartedIfDue(cycle);
            sentCount += sendManagerDeadlineReminderIfDue(cycle);
            sentCount += sendDeptHeadDeadlineReminderIfDue(cycle);
            sentCount += sendHrEndDateReminderIfDue(cycle);
            sentCount += sendManagerDeadlineOverdueIfDue(cycle);
            sentCount += sendDeptHeadDeadlineOverdueIfDue(cycle);
        }

        return sentCount;
    }

    @Override
    public AppraisalCycleResponse activateCycle(Integer cycleId) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
        if (Boolean.TRUE.equals(cycle.getLocked())) {
            throw new BadRequestException("Locked cycle cannot be activated.");
        }
        if (cycle.getStatus() != AppraisalCycleStatus.DRAFT) {
            throw new BadRequestException("Only draft cycle can be activated.");
        }
        cycle.setStatus(AppraisalCycleStatus.ACTIVE);
        cycle.setActivatedAt(new Date());
        AppraisalCycle saved = cycleRepository.save(cycle);
        notifyManagersAboutActiveCycle(saved);
        sendManagerReviewStartedIfDue(saved);
        return mapCycle(saved);
    }

    @Override
    public AppraisalCycleResponse deactivateCycle(Integer cycleId) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
        if (cycle.getStatus() != AppraisalCycleStatus.ACTIVE) {
            throw new BadRequestException("Only active appraisal cycles can be deactivated.");
        }
        if (Boolean.TRUE.equals(cycle.getLocked())) {
            throw new BadRequestException("Locked appraisal cycles cannot be deactivated.");
        }
        if (cycle.getStartDate() == null || !LocalDate.now().isBefore(cycle.getStartDate())) {
            throw new BadRequestException("Only appraisal cycles that have not reached the start date can be deactivated.");
        }

        cycle.setStatus(AppraisalCycleStatus.DRAFT);
        cycle.setLocked(false);
        cycle.setActivatedAt(null);
        AppraisalCycle saved = cycleRepository.save(cycle);
        notifyManagersAboutInactiveCycle(saved);
        return mapCycle(saved);
    }

    @Override
    public AppraisalCycleResponse lockCycle(Integer cycleId) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
        if (cycle.getStatus() != AppraisalCycleStatus.ACTIVE) {
            throw new BadRequestException("Only active appraisal cycles can be locked.");
        }
        if (cycle.getEndDate() == null || LocalDate.now().isBefore(cycle.getEndDate())) {
            throw new BadRequestException("Appraisal cycle can be locked only after the end date is reached.");
        }
        cycle.setLocked(true);
        cycle.setStatus(AppraisalCycleStatus.LOCKED);
        AppraisalCycle saved = cycleRepository.save(cycle);
        notifyManagersAndDeptHeadsCycleLocked(saved);
        return mapCycle(saved);
    }

    @Override
    public AppraisalCycleResponse completeCycle(Integer cycleId) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
        if (cycle.getStatus() == AppraisalCycleStatus.COMPLETED) {
            return mapCycle(cycle);
        }
        if (cycle.getStatus() != AppraisalCycleStatus.LOCKED && !Boolean.TRUE.equals(cycle.getLocked())) {
            throw new BadRequestException("Only locked appraisal cycles can be completed.");
        }
        cycle.setStatus(AppraisalCycleStatus.COMPLETED);
        cycle.setCompletedAt(new Date());
        cycle.setLocked(true);
        AppraisalCycle saved = cycleRepository.save(cycle);
        notifyManagersAndDeptHeadsCycleCompleted(saved);
        return mapCycle(saved);
    }

    @Override
    public AppraisalCycleResponse reuseCycle(Integer cycleId, AppraisalCycleRequest overrideRequest, Integer createdByUserId) {
        AppraisalCycle source = getCycleEntity(cycleId);
        if (source.getStatus() != AppraisalCycleStatus.COMPLETED) {
            throw new BadRequestException("Only completed appraisal cycles can be re-used.");
        }
        AppraisalCycleRequest request = overrideRequest == null ? new AppraisalCycleRequest() : overrideRequest;
        request.setTemplateId(request.getTemplateId() != null ? request.getTemplateId() : source.getTemplate().getId());
        request.setCycleType(request.getCycleType() != null ? request.getCycleType() : source.getCycleType());
        request.setCycleYear(request.getCycleYear() != null ? request.getCycleYear() : source.getCycleYear() + 1);
        request.setPeriodNo(request.getPeriodNo() != null ? request.getPeriodNo() : source.getPeriodNo());
        request.setDescription(request.getDescription() != null ? request.getDescription() : source.getDescription());
        request.setManagerSubmissionDeadline(request.getManagerSubmissionDeadline() != null ? request.getManagerSubmissionDeadline() : source.getManagerSubmissionDeadline());
        request.setDeptHeadSubmissionDeadline(request.getDeptHeadSubmissionDeadline() != null ? request.getDeptHeadSubmissionDeadline() : source.getDeptHeadSubmissionDeadline());
        request.setSubmissionDeadline(request.getSubmissionDeadline() != null ? request.getSubmissionDeadline() : source.getSubmissionDeadline());
        if (request.getStartDate() == null && source.getCycleType() != AppraisalCycleType.ANNUAL) {
            request.setStartDate(source.getStartDate().plusYears(1));
        }
        if (request.getEndDate() == null && source.getCycleType() == AppraisalCycleType.CUSTOM) {
            request.setEndDate(source.getEndDate().plusYears(1));
        }
        return createCycle(request, createdByUserId);
    }

    private String cycleAuditSummary(AppraisalCycle cycle) {
        if (cycle == null) {
            return "-";
        }
        AppraisalFormTemplate template = cycle.getTemplate();
        String templateName = template == null ? "-" : safeAuditText(template.getTemplateName());
        String departments = "-";
        if (cycle.getCycleDepartments() != null && !cycle.getCycleDepartments().isEmpty()) {
            departments = cycle.getCycleDepartments().stream()
                    .filter(link -> link.getDepartment() != null)
                    .map(link -> link.getDepartment().getDepartmentName())
                    .filter(name -> name != null && !name.isBlank())
                    .sorted()
                    .collect(Collectors.joining(", "));
            if (departments.isBlank()) {
                departments = "-";
            }
        }
        return "Name: " + safeAuditText(cycle.getCycleName())
                + " | Template: " + templateName
                + " | Departments: " + departments
                + " | Cycle Type: " + (cycle.getCycleType() == null ? "-" : cycle.getCycleType())
                + " | Year: " + (cycle.getCycleYear() == null ? "-" : cycle.getCycleYear())
                + " | Start Date: " + formatAuditDate(cycle.getStartDate())
                + " | End Date: " + formatAuditDate(cycle.getEndDate())
                + " | Manager Deadline: " + formatAuditDate(cycle.getManagerSubmissionDeadline())
                + " | Dept Head Deadline: " + formatAuditDate(cycle.getDeptHeadSubmissionDeadline())
                + " | Status: " + (cycle.getStatus() == null ? "-" : cycle.getStatus())
                + " | Evaluation Details: " + templateEvaluationSummary(template)
                + " | Score Ranges: " + templateScoreRangeSummary(template);
    }

    private String formatAuditDate(LocalDate value) {
        return value == null ? "-" : value.format(APPRAISAL_DATE_FORMATTER);
    }

    private void auditCycleUpdateSafely(AppraisalCycle cycle, Integer updatedByUserId, String auditBefore, String editReason, String templateChangeSummary) {
        try {
            String auditAfter = cycleAuditSummary(cycle);
            List<AuditChangeParts> templateChanges = parseExternalTemplateChangeSummary(templateChangeSummary);
            List<AuditChangeParts> changes = templateChanges.isEmpty()
                    ? buildAuditChangeParts(auditBefore, auditAfter)
                    : buildCycleScalarAuditChangeParts(auditBefore, auditAfter);
            changes.addAll(templateChanges);
            if (changes.isEmpty()) {
                changes = List.of(new AuditChangeParts("Updated", "changed", "", ""));
            }
            String auditBatchId = Long.toString(System.nanoTime(), 36);
            for (AuditChangeParts parts : changes) {
                auditLogService.log(
                        updatedByUserId,
                        "UPDATE",
                        "APPRAISAL_CYCLE",
                        cycle.getId(),
                        compactAuditSummary(withAuditBatch(encodedAuditChangedColumn(parts.field(), cycle.getTemplate() == null ? null : cycle.getTemplate().getId()), auditBatchId)),
                        compactAuditSummary(parts.oldValue()),
                        compactAuditSummary(encodedAuditNewValue(parts, cycle.getTemplate() == null ? null : cycle.getTemplate().getId())),
                        normalizeEditReason(editReason)
                );
            }
        } catch (Exception ignored) {
            // Edit history should never block HR from saving the cycle. If an older local database still has a narrow audit column, the cycle edit is kept.
        }
    }

    private String withAuditBatch(String value, String auditBatchId) {
        String base = value == null || value.isBlank() ? "Updated" : value;
        if (auditBatchId == null || auditBatchId.isBlank()) {
            return base;
        }
        return base + " @@auditBatch=" + auditBatchId;
    }

    private String encodedAuditNewValue(AuditChangeParts parts) {
        if (parts == null) {
            return "changed";
        }
        String state = parts.state() == null || parts.state().isBlank() ? "changed" : parts.state().trim().toLowerCase();
        String newValue = parts.newValue() == null ? "" : parts.newValue().trim();
        return newValue.isBlank() ? state : state + "::" + newValue;
    }

    private String normalizeEditReason(String value) {
        if (value == null || value.isBlank()) {
            return "No reason provided";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 450 ? normalized : normalized.substring(0, 447) + "...";
    }

    private String compactAuditSummary(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 240 ? normalized : normalized.substring(0, 237) + "...";
    }



    private String encodedAuditChangedColumn(String field, Integer templateId) {
        String base = field == null ? "Updated" : field;
        if (templateId == null) {
            return base;
        }
        return base + " @@templateId=" + templateId;
    }

    private String encodedAuditNewValue(AuditChangeParts parts, Integer templateId) {
        String base = encodedAuditNewValue(parts);
        if (templateId == null) {
            return base;
        }
        return base + " @@templateId=" + templateId;
    }

    private List<AuditChangeParts> buildCycleScalarAuditChangeParts(String beforeSummary, String afterSummary) {
        Map<String, String> before = parseAuditSummary(beforeSummary);
        Map<String, String> after = parseAuditSummary(afterSummary);
        List<AuditChangeParts> changes = new ArrayList<>();
        for (String label : List.of("Name", "Template", "Departments", "Cycle Type", "Year", "Start Date", "End Date", "Manager Deadline", "Dept Head Deadline", "Status")) {
            addScalarAuditChange(changes, before, after, label, label);
        }
        return changes;
    }

    private List<AuditChangeParts> parseExternalTemplateChangeSummary(String summary) {
        List<AuditChangeParts> changes = new ArrayList<>();
        if (summary == null || summary.isBlank()) {
            return changes;
        }
        for (String record : summary.split(TEMPLATE_CHANGE_RECORD_SEPARATOR)) {
            if (record == null || record.isBlank()) {
                continue;
            }
            String[] parts = record.split(TEMPLATE_CHANGE_FIELD_SEPARATOR, -1);
            if (parts.length < 2) {
                continue;
            }
            String field = safeAuditText(parts[0]);
            String state = parts.length > 1 && parts[1] != null && !parts[1].isBlank() ? parts[1].trim().toLowerCase() : "changed";
            String oldValue = parts.length > 2 ? safeAuditText(parts[2]) : "";
            String newValue = parts.length > 3 ? safeAuditText(parts[3]) : "";
            if (!field.isBlank() && !"-".equals(field)) {
                changes.add(new AuditChangeParts(field, state, oldValue, newValue));
            }
        }
        return changes;
    }

    private List<AuditChangeParts> buildAuditChangeParts(String beforeSummary, String afterSummary) {
        Map<String, String> before = parseAuditSummary(beforeSummary);
        Map<String, String> after = parseAuditSummary(afterSummary);
        List<AuditChangeParts> changes = new ArrayList<>();

        for (String label : List.of("Name", "Template", "Departments", "Cycle Type", "Year", "Start Date", "End Date", "Manager Deadline", "Dept Head Deadline", "Status")) {
            addScalarAuditChange(changes, before, after, label, label);
        }
        addEvaluationAuditChanges(changes, before.get("evaluation details"), after.get("evaluation details"));
        addScoreRangeAuditChanges(changes, before.get("score ranges"), after.get("score ranges"));
        return changes;
    }

    private void addScalarAuditChange(List<AuditChangeParts> changes, Map<String, String> before, Map<String, String> after, String auditKey, String label) {
        String oldValue = before.getOrDefault(auditKey.toLowerCase(), "");
        String newValue = after.getOrDefault(auditKey.toLowerCase(), "");
        if (!Objects.equals(oldValue, newValue)) {
            changes.add(new AuditChangeParts(label, auditState(oldValue, newValue), oldValue, newValue));
        }
    }

    private String auditState(String oldValue, String newValue) {
        boolean oldBlank = oldValue == null || oldValue.isBlank() || "-".equals(oldValue.trim());
        boolean newBlank = newValue == null || newValue.isBlank() || "-".equals(newValue.trim());
        if (!oldBlank && newBlank) return "removed";
        if (oldBlank && !newBlank) return "added";
        return "changed";
    }

    private void addEvaluationAuditChanges(List<AuditChangeParts> changes, String beforeValue, String afterValue) {
        if (Objects.equals(beforeValue, afterValue)) {
            return;
        }
        List<AuditSectionSnapshot> beforeSections = parseEvaluationSnapshot(beforeValue);
        List<AuditSectionSnapshot> afterSections = parseEvaluationSnapshot(afterValue);
        if (beforeSections.isEmpty() && afterSections.isEmpty()) {
            changes.add(new AuditChangeParts("Evaluation Details", "changed", "", ""));
            return;
        }

        int maxSections = Math.max(beforeSections.size(), afterSections.size());
        for (int sectionIndex = 0; sectionIndex < maxSections; sectionIndex++) {
            int sectionNo = sectionIndex + 1;
            AuditSectionSnapshot beforeSection = sectionIndex < beforeSections.size() ? beforeSections.get(sectionIndex) : null;
            AuditSectionSnapshot afterSection = sectionIndex < afterSections.size() ? afterSections.get(sectionIndex) : null;
            if (beforeSection != null && afterSection == null) {
                changes.add(new AuditChangeParts("Section " + sectionNo, "removed", formatSectionSnapshot(beforeSection), ""));
                for (int criteriaIndex = 0; criteriaIndex < beforeSection.criteria.size(); criteriaIndex++) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + (criteriaIndex + 1), "removed", beforeSection.criteria.get(criteriaIndex), ""));
                }
                continue;
            }
            if (beforeSection == null && afterSection != null) {
                changes.add(new AuditChangeParts("Section " + sectionNo, "added", "", formatSectionSnapshot(afterSection)));
                for (int criteriaIndex = 0; criteriaIndex < afterSection.criteria.size(); criteriaIndex++) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + (criteriaIndex + 1), "added", "", afterSection.criteria.get(criteriaIndex)));
                }
                continue;
            }
            if (!Objects.equals(beforeSection == null ? null : beforeSection.name, afterSection == null ? null : afterSection.name)) {
                changes.add(new AuditChangeParts("Section " + sectionNo, "changed", beforeSection == null ? "" : beforeSection.name, afterSection == null ? "" : afterSection.name));
            }

            List<String> beforeCriteria = beforeSection == null ? List.of() : beforeSection.criteria;
            List<String> afterCriteria = afterSection == null ? List.of() : afterSection.criteria;
            int maxCriteria = Math.max(beforeCriteria.size(), afterCriteria.size());
            for (int criteriaIndex = 0; criteriaIndex < maxCriteria; criteriaIndex++) {
                int criteriaNo = criteriaIndex + 1;
                String oldCriteria = criteriaIndex < beforeCriteria.size() ? beforeCriteria.get(criteriaIndex) : null;
                String newCriteria = criteriaIndex < afterCriteria.size() ? afterCriteria.get(criteriaIndex) : null;
                if (oldCriteria != null && newCriteria == null) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + criteriaNo, "removed", oldCriteria, ""));
                } else if (oldCriteria == null && newCriteria != null) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + criteriaNo, "added", "", newCriteria));
                } else if (!Objects.equals(oldCriteria, newCriteria)) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + criteriaNo, "changed", oldCriteria == null ? "" : oldCriteria, newCriteria == null ? "" : newCriteria));
                }
            }
        }
    }

    private String formatSectionSnapshot(AuditSectionSnapshot section) {
        if (section == null) {
            return "";
        }
        String criteriaText = section.criteria == null || section.criteria.isEmpty()
                ? "-"
                : String.join(" / ", section.criteria);
        return section.name + "[" + criteriaText + "]";
    }

    private void addScoreRangeAuditChanges(List<AuditChangeParts> changes, String beforeValue, String afterValue) {
        if (Objects.equals(beforeValue, afterValue)) {
            return;
        }
        List<String> beforeRanges = parseScoreRangeSnapshot(beforeValue);
        List<String> afterRanges = parseScoreRangeSnapshot(afterValue);
        if (beforeRanges.isEmpty() && afterRanges.isEmpty()) {
            changes.add(new AuditChangeParts("Score Ranges", "changed", "", ""));
            return;
        }
        int maxRanges = Math.max(beforeRanges.size(), afterRanges.size());
        for (int index = 0; index < maxRanges; index++) {
            String oldRange = index < beforeRanges.size() ? beforeRanges.get(index) : null;
            String newRange = index < afterRanges.size() ? afterRanges.get(index) : null;
            if (oldRange != null && newRange == null) {
                changes.add(new AuditChangeParts("Score Range " + (index + 1), "removed", oldRange, ""));
            } else if (oldRange == null && newRange != null) {
                changes.add(new AuditChangeParts("Score Range " + (index + 1), "added", "", newRange));
            } else if (!Objects.equals(oldRange, newRange)) {
                changes.add(new AuditChangeParts("Score Range " + (index + 1), "changed", oldRange == null ? "" : oldRange, newRange == null ? "" : newRange));
            }
        }
    }

    private record AuditChangeParts(String field, String state, String oldValue, String newValue) {}

    private List<AuditSectionSnapshot> parseEvaluationSnapshot(String value) {
        List<AuditSectionSnapshot> sections = new ArrayList<>();
        if (value == null || value.isBlank() || "-".equals(value.trim())) {
            return sections;
        }
        for (String sectionPart : value.split("\\s*;\\s*")) {
            String trimmed = sectionPart.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            int open = trimmed.indexOf('[');
            int close = trimmed.lastIndexOf(']');
            String name = open >= 0 ? trimmed.substring(0, open).trim() : trimmed;
            String criteriaValue = open >= 0 && close > open ? trimmed.substring(open + 1, close).trim() : "";
            List<String> criteria = new ArrayList<>();
            if (!criteriaValue.isBlank() && !"-".equals(criteriaValue)) {
                for (String criteriaText : criteriaValue.split("\\s*/\\s*")) {
                    String normalized = criteriaText.trim();
                    if (!normalized.isBlank()) {
                        criteria.add(normalized);
                    }
                }
            }
            sections.add(new AuditSectionSnapshot(name, criteria));
        }
        return sections;
    }

    private void addScoreRangeChanges(List<String> changedLabels, String beforeValue, String afterValue) {
        if (Objects.equals(beforeValue, afterValue)) {
            return;
        }
        List<String> beforeRanges = parseScoreRangeSnapshot(beforeValue);
        List<String> afterRanges = parseScoreRangeSnapshot(afterValue);
        if (beforeRanges.isEmpty() && afterRanges.isEmpty()) {
            changedLabels.add("Score Ranges: changed");
            return;
        }
        int maxRanges = Math.max(beforeRanges.size(), afterRanges.size());
        for (int index = 0; index < maxRanges; index++) {
            String oldRange = index < beforeRanges.size() ? beforeRanges.get(index) : null;
            String newRange = index < afterRanges.size() ? afterRanges.get(index) : null;
            if (oldRange != null && newRange == null) {
                changedLabels.add("Score Range " + (index + 1) + ": removed");
            } else if (oldRange == null && newRange != null) {
                changedLabels.add("Score Range " + (index + 1) + ": added");
            } else if (!Objects.equals(oldRange, newRange)) {
                changedLabels.add("Score Range " + (index + 1) + ": changed");
            }
        }
    }

    private List<String> parseScoreRangeSnapshot(String value) {
        List<String> ranges = new ArrayList<>();
        if (value == null || value.isBlank() || "-".equals(value.trim())) {
            return ranges;
        }
        for (String range : value.split("\\s*;\\s*")) {
            String normalized = range.trim();
            if (!normalized.isBlank()) {
                ranges.add(normalized);
            }
        }
        return ranges;
    }

    private static class AuditSectionSnapshot {
        private final String name;
        private final List<String> criteria;

        private AuditSectionSnapshot(String name, List<String> criteria) {
            this.name = name;
            this.criteria = criteria;
        }
    }

    private String templateEvaluationSummary(AppraisalFormTemplate template) {
        if (template == null || template.getSections() == null || template.getSections().isEmpty()) {
            return "-";
        }
        return template.getSections().stream()
                .filter(section -> section.getActive() == null || Boolean.TRUE.equals(section.getActive()))
                .sorted(Comparator.comparing(AppraisalSection::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(section -> safeAuditText(section.getSectionName()) + "[" + criteriaSummary(section) + "]")
                .collect(Collectors.joining(" ; "));
    }

    private String criteriaSummary(AppraisalSection section) {
        if (section.getCriteria() == null || section.getCriteria().isEmpty()) {
            return "-";
        }
        return section.getCriteria().stream()
                .filter(criteria -> criteria.getActive() == null || Boolean.TRUE.equals(criteria.getActive()))
                .sorted(Comparator.comparing(AppraisalFormCriteria::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(criteria -> safeAuditText(criteria.getCriteriaText()))
                .collect(Collectors.joining(" / "));
    }

    private String templateScoreRangeSummary(AppraisalFormTemplate template) {
        if (template == null || template.getScoreBands() == null || template.getScoreBands().isEmpty()) {
            return "-";
        }
        return template.getScoreBands().stream()
                .filter(band -> band.getActive() == null || Boolean.TRUE.equals(band.getActive()))
                .sorted(Comparator.comparing(AppraisalTemplateScoreBand::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(band -> safeAuditText(band.getLabel()) + " " + band.getMinScore() + "-" + band.getMaxScore())
                .collect(Collectors.joining(" ; "));
    }

    private String safeAuditText(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace("|", "/").replaceAll("\\s+", " ").trim();
    }

    private Map<String, String> parseAuditSummary(String summary) {
        Map<String, String> values = new LinkedHashMap<>();
        if (summary == null || summary.isBlank()) {
            return values;
        }
        for (String part : summary.split("\\|")) {
            int idx = part.indexOf(':');
            if (idx < 0) {
                continue;
            }
            String key = part.substring(0, idx).trim().toLowerCase();
            String value = part.substring(idx + 1).trim();
            if (!key.isBlank()) {
                values.put(key, value);
            }
        }
        return values;
    }

    private void dropLegacyCycleUniqueIndexesIfPresent() {
        try {
            List<String> uniqueIndexes = jdbcTemplate.queryForList(
                    """
                    SELECT DISTINCT INDEX_NAME
                    FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'appraisal_cycle'
                      AND NON_UNIQUE = 0
                      AND INDEX_NAME <> 'PRIMARY'
                    """,
                    String.class
            );

            for (String indexName : uniqueIndexes) {
                if (indexName != null && !indexName.isBlank()) {
                    jdbcTemplate.execute("ALTER TABLE appraisal_cycle DROP INDEX `" + indexName.replace("`", "``") + "`");
                }
            }
        } catch (Exception ignored) {
            // Some local databases already removed these legacy unique indexes, or the user lacks ALTER rights.
            // In those cases we still continue; the JDBC update path below avoids application-level duplicate checks.
        }
    }

    private CycleDates calculateCycleDatesForUpdate(
            AppraisalCycleRequest request,
            AppraisalCycle cycle,
            AppraisalCycleType cycleType,
            Integer cycleYear
    ) {
        int year = cycleYear != null ? cycleYear : LocalDate.now().getYear();
        int periodNo = request.getPeriodNo() != null
                ? request.getPeriodNo()
                : cycle.getPeriodNo() != null ? cycle.getPeriodNo() : 1;

        if (cycleType == AppraisalCycleType.ANNUAL) {
            return new CycleDates(
                    year,
                    periodNo,
                    request.getStartDate() != null ? request.getStartDate() : LocalDate.of(year, 1, 1),
                    request.getEndDate() != null ? request.getEndDate() : LocalDate.of(year, 12, 31)
            );
        }

        LocalDate startDate = request.getStartDate() != null
                ? request.getStartDate()
                : cycle.getStartDate() != null ? cycle.getStartDate() : LocalDate.now();
        LocalDate endDate = request.getEndDate() != null
                ? request.getEndDate()
                : cycle.getEndDate();

        if (endDate == null && cycleType == AppraisalCycleType.SEMI_ANNUAL) {
            endDate = startDate.plusMonths(6).minusDays(1);
        }
        if (endDate == null) {
            endDate = startDate;
        }

        return new CycleDates(year, periodNo, startDate, endDate);
    }

    private void applySubmissionDeadlinesForUpdate(AppraisalCycle cycle, AppraisalCycleRequest request) {
        LocalDate sharedDeadline = request.getSubmissionDeadline();
        LocalDate managerDeadline = request.getManagerSubmissionDeadline() != null
                ? request.getManagerSubmissionDeadline()
                : sharedDeadline != null ? sharedDeadline : resolveManagerSubmissionDeadline(cycle);
        LocalDate deptHeadDeadline = request.getDeptHeadSubmissionDeadline() != null
                ? request.getDeptHeadSubmissionDeadline()
                : sharedDeadline != null ? sharedDeadline : resolveDeptHeadSubmissionDeadline(cycle);

        cycle.setManagerSubmissionDeadline(managerDeadline);
        cycle.setDeptHeadSubmissionDeadline(deptHeadDeadline);
        cycle.setSubmissionDeadline(deptHeadDeadline != null ? deptHeadDeadline : managerDeadline);
    }

    private CycleDeadlines resolveSubmissionDeadlinesForUpdate(
            AppraisalCycle cycle,
            AppraisalCycleRequest request,
            CycleDates dates
    ) {
        LocalDate sharedDeadline = request.getSubmissionDeadline();
        LocalDate managerDeadline = request.getManagerSubmissionDeadline() != null
                ? request.getManagerSubmissionDeadline()
                : sharedDeadline != null ? sharedDeadline : resolveManagerSubmissionDeadline(cycle);
        LocalDate deptHeadDeadline = request.getDeptHeadSubmissionDeadline() != null
                ? request.getDeptHeadSubmissionDeadline()
                : sharedDeadline != null ? sharedDeadline : resolveDeptHeadSubmissionDeadline(cycle);
        LocalDate submissionDeadline = deptHeadDeadline != null
                ? deptHeadDeadline
                : managerDeadline != null ? managerDeadline : cycle.getSubmissionDeadline();
        if (submissionDeadline == null) {
            submissionDeadline = dates.endDate() != null ? dates.endDate() : LocalDate.now();
        }
        return new CycleDeadlines(managerDeadline, deptHeadDeadline, submissionDeadline);
    }

    private void updateCycleScalarFieldsWithJdbc(
            Integer cycleId,
            String cycleName,
            String description,
            Integer templateId,
            AppraisalCycleType cycleType,
            CycleDates dates,
            CycleDeadlines deadlines
    ) {
        jdbcTemplate.update(
                """
                UPDATE appraisal_cycle
                SET cycle_name = ?,
                    description = ?,
                    template_id = ?,
                    cycle_type = ?,
                    cycle_year = ?,
                    period_no = ?,
                    start_date = ?,
                    end_date = ?,
                    submission_deadline = ?,
                    manager_submission_deadline = ?,
                    dept_head_submission_deadline = ?,
                    updated_at = CURRENT_TIMESTAMP(6)
                WHERE id = ?
                """,
                cycleName,
                description,
                templateId,
                cycleType.name(),
                dates.cycleYear(),
                dates.periodNo(),
                toSqlDate(dates.startDate()),
                toSqlDate(dates.endDate()),
                toSqlDate(deadlines.submissionDeadline()),
                toSqlDate(deadlines.managerSubmissionDeadline()),
                toSqlDate(deadlines.deptHeadSubmissionDeadline()),
                cycleId
        );
    }

    private void replaceCycleDepartmentsWithJdbc(Integer cycleId, List<Integer> departmentIds) {
        jdbcTemplate.update("DELETE FROM appraisal_cycle_department WHERE cycle_id = ?", cycleId);
        for (Integer departmentId : departmentIds) {
            jdbcTemplate.update(
                    "INSERT IGNORE INTO appraisal_cycle_department (cycle_id, department_id) VALUES (?, ?)",
                    cycleId,
                    departmentId
            );
        }
    }

    private AppraisalCycle updateCycleWithManagedEntity(
            Integer cycleId,
            String cycleName,
            String description,
            AppraisalFormTemplate template,
            AppraisalCycleType cycleType,
            CycleDates dates,
            CycleDeadlines deadlines,
            List<Integer> departmentIds
    ) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
        cycle.setCycleName(cycleName);
        cycle.setDescription(description);
        cycle.setTemplate(template);
        cycle.setCycleType(cycleType);
        cycle.setCycleYear(dates.cycleYear());
        cycle.setPeriodNo(dates.periodNo());
        cycle.setStartDate(dates.startDate());
        cycle.setEndDate(dates.endDate());
        cycle.setSubmissionDeadline(deadlines.submissionDeadline());
        cycle.setManagerSubmissionDeadline(deadlines.managerSubmissionDeadline());
        cycle.setDeptHeadSubmissionDeadline(deadlines.deptHeadSubmissionDeadline());
        replaceCycleDepartmentsManaged(cycle, departmentIds);
        AppraisalCycle saved = cycleRepository.saveAndFlush(cycle);
        entityManager.clear();
        return cycleRepository.findByIdWithTemplateAndDepartments(saved.getId()).orElse(saved);
    }

    private void replaceCycleDepartmentsManaged(AppraisalCycle cycle, List<Integer> departmentIds) {
        cycleDepartmentRepository.deleteByCycleId(cycle.getId());
        cycleDepartmentRepository.flush();
        cycle.getCycleDepartments().clear();

        for (Integer departmentId : new LinkedHashSet<>(departmentIds == null ? List.<Integer>of() : departmentIds)) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));
            AppraisalCycleDepartment target = new AppraisalCycleDepartment();
            target.setCycle(cycle);
            target.setDepartment(department);
            cycle.getCycleDepartments().add(target);
        }
    }

    private java.sql.Date toSqlDate(LocalDate value) {
        return value == null ? null : java.sql.Date.valueOf(value);
    }

    private String limitText(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private int sendManagerReviewStartedIfDue(AppraisalCycle cycle) {
        if (cycle == null || cycle.getStartDate() == null || LocalDate.now().isBefore(cycle.getStartDate())) {
            return 0;
        }

        String title = "Manager Review Available";
        String message = cycleDisplayName(cycle)
                + " appraisal cycle has reached the start date. Manager review can now be started.";
        return notifyUsers(targetManagers(cycle), NotificationEventKey.APPRAISAL_MANAGER_REVIEW_STARTED, title, message, "APPRAISAL", cycle.getId());
    }

    private int sendManagerDeadlineReminderIfDue(AppraisalCycle cycle) {
        LocalDate deadline = resolveManagerSubmissionDeadline(cycle);
        Integer daysLeft = daysLeftIfReminderWindow(deadline);
        if (daysLeft == null) {
            return 0;
        }

        String title = "Appraisal Manager Deadline Reminder";
        String message = cycleDisplayName(cycle)
                + " manager review deadline is on " + displayDate(deadline) + ". "
                + remainingDaysText(daysLeft) + " remaining.";
        return notifyUsers(targetManagers(cycle), NotificationEventKey.APPRAISAL_DEADLINE_REMINDER, title, message, "APPRAISAL", cycle.getId());
    }

    private int sendDeptHeadDeadlineReminderIfDue(AppraisalCycle cycle) {
        LocalDate deadline = resolveDeptHeadSubmissionDeadline(cycle);
        Integer daysLeft = daysLeftIfReminderWindow(deadline);
        if (daysLeft == null) {
            return 0;
        }

        String title = "Appraisal Dept Head Deadline Reminder";
        String message = cycleDisplayName(cycle)
                + " Dept Head review deadline is on " + displayDate(deadline) + ". "
                + remainingDaysText(daysLeft) + " remaining.";
        return notifyUsers(targetDepartmentHeads(cycle), NotificationEventKey.APPRAISAL_DEADLINE_REMINDER, title, message, "APPRAISAL", cycle.getId());
    }

    private int sendHrEndDateReminderIfDue(AppraisalCycle cycle) {
        Integer daysLeft = daysLeftIfReminderWindow(cycle.getEndDate());
        if (daysLeft == null) {
            return 0;
        }

        String title = "Appraisal Cycle End Date Reminder";
        String message = cycleDisplayName(cycle)
                + " end date is on " + displayDate(cycle.getEndDate()) + ". "
                + remainingDaysText(daysLeft) + " remaining.";
        return notifyUsers(hrUsers(), NotificationEventKey.APPRAISAL_DEADLINE_REMINDER, title, message, "APPRAISAL", cycle.getId());
    }

    private Integer daysLeftIfReminderWindow(LocalDate targetDate) {
        if (targetDate == null) {
            return null;
        }
        long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), targetDate);
        return daysLeft >= 1 && daysLeft <= 3 ? (int) daysLeft : null;
    }

    private int sendManagerDeadlineOverdueIfDue(AppraisalCycle cycle) {
        LocalDate deadline = resolveManagerSubmissionDeadline(cycle);
        if (deadline == null || !LocalDate.now().isAfter(deadline)) {
            return 0;
        }

        String title = "Manager Appraisal Deadline Overdue";
        String message = cycleDisplayName(cycle)
                + " manager review deadline passed on " + displayDate(deadline) + ". Reviews can still be submitted.";
        return notifyUsers(targetManagers(cycle), NotificationEventKey.APPRAISAL_DEADLINE_OVERDUE, title, message, "APPRAISAL", cycle.getId());
    }

    private int sendDeptHeadDeadlineOverdueIfDue(AppraisalCycle cycle) {
        LocalDate deadline = resolveDeptHeadSubmissionDeadline(cycle);
        if (deadline == null || !LocalDate.now().isAfter(deadline)) {
            return 0;
        }

        String title = "Dept Head Appraisal Deadline Overdue";
        String message = cycleDisplayName(cycle)
                + " Dept Head review deadline passed on " + displayDate(deadline) + ". Reviews can still be submitted.";
        return notifyUsers(targetDepartmentHeads(cycle), NotificationEventKey.APPRAISAL_DEADLINE_OVERDUE, title, message, "APPRAISAL", cycle.getId());
    }

    private void notifyManagersAndDeptHeadsCycleLocked(AppraisalCycle cycle) {
        String title = "Appraisal Cycle Locked";
        String message = cycleDisplayName(cycle) + " appraisal cycle has been locked.";
        notifyUsers(targetManagersAndDeptHeads(cycle), NotificationEventKey.APPRAISAL_CYCLE_LOCKED, title, message, "APPRAISAL", cycle.getId());
    }

    private void notifyManagersAndDeptHeadsCycleCompleted(AppraisalCycle cycle) {
        String title = "Appraisal Cycle Completed";
        String message = cycleDisplayName(cycle) + " appraisal cycle has been completed.";
        notifyUsers(targetManagersAndDeptHeads(cycle), NotificationEventKey.APPRAISAL_CYCLE_COMPLETED, title, message, "APPRAISAL", cycle.getId());
    }

    private List<User> targetManagersAndDeptHeads(AppraisalCycle cycle) {
        List<User> users = new ArrayList<>();
        users.addAll(targetManagers(cycle));
        users.addAll(targetDepartmentHeads(cycle));
        return uniqueUsers(users);
    }

    private List<User> targetManagers(AppraisalCycle cycle) {
        List<User> users = new ArrayList<>();
        for (Integer departmentId : targetDepartmentIds(cycle)) {
            users.addAll(userRepository.findActiveManagersByDepartmentId(departmentId));
        }
        return uniqueUsers(users);
    }

    private List<User> targetDepartmentHeads(AppraisalCycle cycle) {
        List<User> users = new ArrayList<>();
        for (Integer departmentId : targetDepartmentIds(cycle)) {
            users.addAll(userRepository.findActiveDepartmentHeadsByDepartmentId(departmentId));
        }
        return uniqueUsers(users);
    }

    private List<User> hrUsers() {
        return uniqueUsers(userRepository.findActiveUsersByNormalizedRoleNames(
                List.of("HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES", "HR_MANAGER", "HR_ADMIN", "ADMIN")
        ));
    }

    private Set<Integer> targetDepartmentIds(AppraisalCycle cycle) {
        if (cycle == null || cycle.getCycleDepartments() == null) {
            return Set.of();
        }
        return cycle.getCycleDepartments()
                .stream()
                .map(AppraisalCycleDepartment::getDepartment)
                .filter(Objects::nonNull)
                .map(Department::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<User> uniqueUsers(List<User> users) {
        if (users == null || users.isEmpty()) {
            return List.of();
        }
        Set<Integer> seenUserIds = new LinkedHashSet<>();
        List<User> uniqueUsers = new ArrayList<>();
        for (User user : users) {
            if (user != null && user.getId() != null && seenUserIds.add(user.getId())) {
                uniqueUsers.add(user);
            }
        }
        return uniqueUsers;
    }

    private int notifyUsers(List<User> users, String eventKey, String title, String message, String type, Integer referenceId) {
        int sent = 0;
        for (User user : users) {
            if (user != null && user.getId() != null
                    && notificationService.sendEventOnce(user.getId(), eventKey, title, message, type, referenceId)) {
                sent++;
            }
        }
        return sent;
    }

    private String cycleDisplayName(AppraisalCycle cycle) {
        return cycle != null && cycle.getCycleName() != null && !cycle.getCycleName().isBlank()
                ? cycle.getCycleName()
                : "Appraisal Cycle";
    }

    private String displayDate(LocalDate date) {
        return date == null ? "-" : APPRAISAL_DATE_FORMATTER.format(date);
    }

    private String remainingDaysText(int daysLeft) {
        return daysLeft == 1 ? "1 day" : daysLeft + " days";
    }

    private void notifyManagersAboutActiveCycle(AppraisalCycle cycle) {
        String title = "Appraisal Cycle Activated";
        String message = cycleDisplayName(cycle) + " is now active. Please check the appraisal cycle record.";
        notifyUsers(targetManagers(cycle), NotificationEventKey.APPRAISAL_CYCLE_ACTIVATED, title, message, "APPRAISAL", cycle.getId());
    }

    private void notifyManagersAboutInactiveCycle(AppraisalCycle cycle) {
        String title = "Appraisal Cycle Inactivated";
        String message = cycleDisplayName(cycle)
                + " has been inactivated by HR before the start date. It is no longer available in Manager appraisals.";
        notifyUsers(targetManagers(cycle), NotificationEventKey.APPRAISAL_CYCLE_DEACTIVATED, title, message, "APPRAISAL", cycle.getId());
    }

    private AppraisalCycle getCycleEntity(Integer cycleId) {
        return cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal cycle not found with id: " + cycleId));
    }

    private void validateCycleRequest(AppraisalCycleRequest request) {
        if (request == null) {
            throw new BadRequestException("Cycle request is required.");
        }
        if (request.getCycleName() == null || request.getCycleName().isBlank()) {
            throw new BadRequestException("Appraisal name is required.");
        }
        if (request.getTemplateId() == null) {
            throw new BadRequestException("Template id is required.");
        }
        if (request.getCycleType() == null) {
            throw new BadRequestException("Cycle type is required.");
        }
        if (request.getCycleYear() == null) {
            throw new BadRequestException("Cycle year is required.");
        }
        if (request.getCycleYear() < LocalDate.now().getYear()) {
            throw new BadRequestException("Cycle year cannot be a past year.");
        }
        if ((request.getCycleType() == AppraisalCycleType.SEMI_ANNUAL || request.getCycleType() == AppraisalCycleType.CUSTOM)
                && request.getStartDate() == null) {
            throw new BadRequestException("Start date is required.");
        }
        if (request.getCycleType() == AppraisalCycleType.CUSTOM) {
            if (request.getEndDate() == null) {
                throw new BadRequestException("End date is required for custom appraisal cycle.");
            }
            if (request.getEndDate().isBefore(request.getStartDate())) {
                throw new BadRequestException("End date cannot be before start date.");
            }
        }

        CycleDates dates = calculateCycleDates(request);
        CycleDeadlines deadlines = new CycleDeadlines(
                resolveManagerSubmissionDeadline(request),
                resolveDeptHeadSubmissionDeadline(request),
                request.getSubmissionDeadline()
        );
        validateResolvedCycleDates(dates, deadlines, true);
    }

    private void validateResolvedCycleDates(CycleDates dates, CycleDeadlines deadlines, boolean rejectPastStartDate) {
        if (dates == null || dates.startDate() == null) {
            throw new BadRequestException("Start date is required.");
        }
        if (dates.endDate() == null) {
            throw new BadRequestException("End date is required.");
        }
        if (rejectPastStartDate && dates.startDate().isBefore(LocalDate.now())) {
            throw new BadRequestException("Start date cannot be a past date.");
        }
        if (dates.endDate().isBefore(dates.startDate())) {
            throw new BadRequestException("End date cannot be before start date.");
        }

        LocalDate managerDeadline = deadlines != null ? deadlines.managerSubmissionDeadline() : null;
        LocalDate deptHeadDeadline = deadlines != null ? deadlines.deptHeadSubmissionDeadline() : null;
        if (managerDeadline == null) {
            throw new BadRequestException("Manager submission deadline is required.");
        }
        if (deptHeadDeadline == null) {
            throw new BadRequestException("Dept Head submission deadline is required.");
        }
        if (managerDeadline.isBefore(dates.startDate())) {
            throw new BadRequestException("Manager submission deadline cannot be before start date.");
        }
        if (!managerDeadline.isBefore(dates.endDate())) {
            throw new BadRequestException("Manager submission deadline must be before end date.");
        }
        if (deptHeadDeadline.isBefore(dates.startDate())) {
            throw new BadRequestException("Dept Head submission deadline cannot be before start date.");
        }
        if (!deptHeadDeadline.isBefore(dates.endDate())) {
            throw new BadRequestException("Dept Head submission deadline must be before end date.");
        }
        if (deptHeadDeadline.isBefore(managerDeadline)) {
            throw new BadRequestException("Dept Head submission deadline cannot be before Manager submission deadline.");
        }
    }

    private void applySubmissionDeadlines(AppraisalCycle cycle, AppraisalCycleRequest request) {
        LocalDate managerDeadline = resolveManagerSubmissionDeadline(request);
        LocalDate deptHeadDeadline = resolveDeptHeadSubmissionDeadline(request);
        cycle.setManagerSubmissionDeadline(managerDeadline);
        cycle.setDeptHeadSubmissionDeadline(deptHeadDeadline);
        cycle.setSubmissionDeadline(deptHeadDeadline);
    }

    private LocalDate resolveManagerSubmissionDeadline(AppraisalCycleRequest request) {
        return request.getManagerSubmissionDeadline() != null
                ? request.getManagerSubmissionDeadline()
                : request.getSubmissionDeadline();
    }

    private LocalDate resolveDeptHeadSubmissionDeadline(AppraisalCycleRequest request) {
        return request.getDeptHeadSubmissionDeadline() != null
                ? request.getDeptHeadSubmissionDeadline()
                : request.getSubmissionDeadline();
    }

    private LocalDate resolveManagerSubmissionDeadline(AppraisalCycle cycle) {
        return cycle.getManagerSubmissionDeadline() != null
                ? cycle.getManagerSubmissionDeadline()
                : cycle.getSubmissionDeadline();
    }

    private LocalDate resolveDeptHeadSubmissionDeadline(AppraisalCycle cycle) {
        return cycle.getDeptHeadSubmissionDeadline() != null
                ? cycle.getDeptHeadSubmissionDeadline()
                : cycle.getSubmissionDeadline();
    }

    private CycleDates calculateCycleDates(AppraisalCycleRequest request) {
        if (request.getCycleType() == AppraisalCycleType.ANNUAL) {
            int year = request.getCycleYear();
            return new CycleDates(
                    year,
                    1,
                    LocalDate.of(year, 1, 1),
                    LocalDate.of(year, 12, 31)
            );
        }

        if (request.getCycleType() == AppraisalCycleType.CUSTOM) {
            return new CycleDates(
                    request.getCycleYear(),
                    request.getPeriodNo() != null ? request.getPeriodNo() : 1,
                    request.getStartDate(),
                    request.getEndDate()
            );
        }

        LocalDate startDate = request.getStartDate();
        LocalDate endDate = startDate.plusMonths(6).minusDays(1);
        int periodNo = request.getPeriodNo() != null ? request.getPeriodNo() : (startDate.getMonthValue() <= 6 ? 1 : 2);
        return new CycleDates(request.getCycleYear(), periodNo, startDate, endDate);
    }

    private void applyCycleDepartments(AppraisalCycle cycle, AppraisalCycleRequest request, AppraisalFormTemplate template) {
        for (Integer departmentId : resolveCycleDepartmentIds(request, template)) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));
            AppraisalCycleDepartment target = new AppraisalCycleDepartment();
            target.setCycle(cycle);
            target.setDepartment(department);
            cycle.getCycleDepartments().add(target);
        }
    }

    private void replaceCycleDepartments(AppraisalCycle cycle, AppraisalCycleRequest request, AppraisalFormTemplate template) {
        Set<Integer> requestedDepartmentIds = new LinkedHashSet<>(resolveCycleDepartmentIds(request, template));

        cycleDepartmentRepository.deleteByCycleId(cycle.getId());
        cycleDepartmentRepository.flush();
        cycle.getCycleDepartments().clear();

        for (Integer departmentId : requestedDepartmentIds) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));
            AppraisalCycleDepartment target = new AppraisalCycleDepartment();
            target.setCycle(cycle);
            target.setDepartment(department);
            cycle.getCycleDepartments().add(target);
        }
    }

    private List<Integer> resolveCycleDepartmentIds(AppraisalCycleRequest request, AppraisalFormTemplate template) {
        List<Integer> departmentIds = new ArrayList<>();
        if (request.getDepartmentIds() != null && !request.getDepartmentIds().isEmpty()) {
            departmentIds.addAll(request.getDepartmentIds());
        } else if (Boolean.TRUE.equals(template.getTargetAllDepartments())) {
            departmentIds.addAll(departmentRepository.findAll().stream()
                    .filter(department -> department.getStatus() == null || department.getStatus())
                    .map(Department::getId)
                    .toList());
        } else if (template.getTargetDepartments() != null) {
            departmentIds.addAll(template.getTargetDepartments().stream()
                    .map(AppraisalTemplateDepartment::getDepartment)
                    .filter(Objects::nonNull)
                    .map(Department::getId)
                    .filter(Objects::nonNull)
                    .toList());
        }

        Set<Integer> uniqueDepartmentIds = new LinkedHashSet<>();
        departmentIds.stream()
                .filter(Objects::nonNull)
                .forEach(uniqueDepartmentIds::add);
        List<Integer> distinctDepartmentIds = new ArrayList<>(uniqueDepartmentIds);

        if (distinctDepartmentIds.isEmpty()) {
            throw new BadRequestException("Cycle must target at least one department.");
        }

        return distinctDepartmentIds;
    }

    private AppraisalCycleResponse mapCycle(AppraisalCycle cycle) {
        AppraisalCycleResponse response = new AppraisalCycleResponse();
        response.setId(cycle.getId());
        response.setCycleName(cycle.getCycleName());
        response.setDescription(cycle.getDescription());
        response.setTemplateId(cycle.getTemplate() != null ? cycle.getTemplate().getId() : null);
        response.setTemplateName(cycle.getTemplate() != null ? cycle.getTemplate().getTemplateName() : null);
        response.setCycleType(cycle.getCycleType());
        response.setCycleYear(cycle.getCycleYear());
        response.setPeriodNo(cycle.getPeriodNo());
        response.setStartDate(cycle.getStartDate());
        response.setEndDate(cycle.getEndDate());
        response.setSubmissionDeadline(cycle.getSubmissionDeadline());
        response.setManagerSubmissionDeadline(resolveManagerSubmissionDeadline(cycle));
        response.setDeptHeadSubmissionDeadline(resolveDeptHeadSubmissionDeadline(cycle));
        response.setStatus(cycle.getStatus());
        response.setLocked(cycle.getLocked());
        response.setCreatedByUserId(cycle.getCreatedByUser() != null ? cycle.getCreatedByUser().getId() : null);
        response.setCreatedByEmployeeId(displayEmployeeId(cycle.getCreatedByUser()));
        response.setActivatedAt(cycle.getActivatedAt());
        response.setCompletedAt(cycle.getCompletedAt());
        response.setCreatedAt(cycle.getCreatedAt());
        if (cycle.getCycleDepartments() != null) {
            cycle.getCycleDepartments().forEach(target -> {
                if (target.getDepartment() != null) {
                    response.getDepartmentIds().add(target.getDepartment().getId());
                    response.getDepartmentNames().add(target.getDepartment().getDepartmentName());
                }
            });
        }
        return response;
    }


    private String displayEmployeeId(User user) {
        if (user == null) {
            return null;
        }
        if (user.getEmployeeCode() != null && !user.getEmployeeCode().isBlank()) {
            return user.getEmployeeCode();
        }
        if (user.getEmployeeId() != null) {
            return String.valueOf(user.getEmployeeId());
        }
        return user.getId() != null ? String.valueOf(user.getId()) : null;
    }

    private record CycleDates(Integer cycleYear, Integer periodNo, LocalDate startDate, LocalDate endDate) {}

    private record CycleDeadlines(
            LocalDate managerSubmissionDeadline,
            LocalDate deptHeadSubmissionDeadline,
            LocalDate submissionDeadline
    ) {}
}

