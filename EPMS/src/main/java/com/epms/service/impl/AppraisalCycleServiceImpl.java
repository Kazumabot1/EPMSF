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
import java.util.List;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class AppraisalCycleServiceImpl implements AppraisalCycleService {

    private static final DateTimeFormatter APPRAISAL_DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy");

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

        String cycleName = request.getCycleName() != null && !request.getCycleName().isBlank()
                ? request.getCycleName().trim()
                : cycle.getCycleName();
        if (cycleName == null || cycleName.isBlank()) {
            cycleName = "Appraisal Cycle #" + cycleId;
        }

        updateCycleScalarFieldsWithJdbc(
                cycleId,
                limitText(cycleName, 180),
                request.getDescription(),
                template.getId(),
                cycleType,
                dates,
                deadlines
        );
        replaceCycleDepartmentsWithJdbc(cycleId, resolveCycleDepartmentIds(request, template));

        entityManager.clear();
        AppraisalCycle saved = cycleRepository.findByIdWithTemplateAndDepartments(cycleId)
                .orElseGet(() -> getCycleEntity(cycleId));
        auditCycleUpdateSafely(saved, updatedByUserId, auditBefore);
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
            sentCount += sendManagerDeadlineReminderIfDue(cycle);
            sentCount += sendDeptHeadDeadlineReminderIfDue(cycle);
            sentCount += sendHrEndDateReminderIfDue(cycle);
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
        return mapCycle(saved);
    }

    @Override
    public AppraisalCycleResponse lockCycle(Integer cycleId) {
        AppraisalCycle cycle = getCycleEntity(cycleId);
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

    private void auditCycleUpdateSafely(AppraisalCycle cycle, Integer updatedByUserId, String auditBefore) {
        try {
            auditLogService.log(
                    updatedByUserId,
                    "UPDATE",
                    "APPRAISAL_CYCLE",
                    cycle.getId(),
                    "Appraisal Cycle",
                    compactAuditSummary(auditBefore),
                    compactAuditSummary(cycleAuditSummary(cycle)),
                    "HR edited appraisal cycle"
            );
        } catch (Exception ignored) {
            // Edit history should never block HR from saving the cycle.
            // If an older local database still has a narrow audit column, the cycle edit is kept.
        }
    }

    private String cycleAuditSummary(AppraisalCycle cycle) {
        if (cycle == null) {
            return "-";
        }
        String departments = cycle.getCycleDepartments() == null
                ? "-"
                : cycle.getCycleDepartments().stream()
                .filter(target -> target.getDepartment() != null)
                .map(target -> target.getDepartment().getDepartmentName())
                .filter(name -> name != null && !name.isBlank())
                .collect(Collectors.joining(", "));
        if (departments == null || departments.isBlank()) {
            departments = "All Departments";
        }
        return "Name: " + cycle.getCycleName()
                + " | Template: " + (cycle.getTemplate() == null ? "-" : cycle.getTemplate().getTemplateName())
                + " | Departments: " + departments
                + " | Cycle Type: " + cycle.getCycleType()
                + " | Year: " + cycle.getCycleYear()
                + " | Start Date: " + cycle.getStartDate()
                + " | End Date: " + cycle.getEndDate()
                + " | Manager Deadline: " + cycle.getManagerSubmissionDeadline()
                + " | Dept Head Deadline: " + cycle.getDeptHeadSubmissionDeadline()
                + " | Status: " + cycle.getStatus();
    }

    private String compactAuditSummary(String value) {
        if (value == null) {
            return "-";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 240 ? normalized : normalized.substring(0, 237) + "...";
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

    private java.sql.Date toSqlDate(LocalDate value) {
        return value == null ? null : java.sql.Date.valueOf(value);
    }

    private String limitText(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
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
        return notifyUsers(targetManagers(cycle), title, message, "APPRAISAL", cycle.getId());
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
        return notifyUsers(targetDepartmentHeads(cycle), title, message, "APPRAISAL", cycle.getId());
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
        return notifyUsers(hrUsers(), title, message, "APPRAISAL", cycle.getId());
    }

    private Integer daysLeftIfReminderWindow(LocalDate targetDate) {
        if (targetDate == null) {
            return null;
        }
        long daysLeft = ChronoUnit.DAYS.between(LocalDate.now(), targetDate);
        return daysLeft >= 1 && daysLeft <= 3 ? (int) daysLeft : null;
    }

    private void notifyManagersAndDeptHeadsCycleLocked(AppraisalCycle cycle) {
        String title = "Appraisal Cycle Locked";
        String message = cycleDisplayName(cycle) + " appraisal cycle has been locked.";
        notifyUsers(targetManagersAndDeptHeads(cycle), title, message, "APPRAISAL", cycle.getId());
    }

    private void notifyManagersAndDeptHeadsCycleCompleted(AppraisalCycle cycle) {
        String title = "Appraisal Cycle Completed";
        String message = cycleDisplayName(cycle) + " appraisal cycle has been completed.";
        notifyUsers(targetManagersAndDeptHeads(cycle), title, message, "APPRAISAL", cycle.getId());
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

    private int notifyUsers(List<User> users, String title, String message, String type, Integer referenceId) {
        int sent = 0;
        for (User user : users) {
            if (user != null && user.getId() != null
                    && notificationService.sendOnce(user.getId(), title, message, type, referenceId)) {
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
        Set<Integer> targetDepartmentIds = cycle.getCycleDepartments() == null
                ? Set.of()
                : cycle.getCycleDepartments()
                .stream()
                .map(AppraisalCycleDepartment::getDepartment)
                .filter(Objects::nonNull)
                .map(Department::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());

        if (targetDepartmentIds.isEmpty()) {
            return;
        }

        List<User> managers = userRepository.findActiveUsersByNormalizedRoleNames(List.of("MANAGER", "PROJECT_MANAGER", "PM"));
        String title = "Appraisal Cycle Activated";
        String message = cycle.getCycleName() + " is now active. Please review your team employees.";

        managers.stream()
                .filter(manager -> manager.getDepartmentId() != null && targetDepartmentIds.contains(manager.getDepartmentId()))
                .forEach(manager -> notificationService.sendOnce(manager.getId(), title, message, "APPRAISAL"));
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
        LocalDate managerDeadline = resolveManagerSubmissionDeadline(request);
        LocalDate deptHeadDeadline = resolveDeptHeadSubmissionDeadline(request);
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

