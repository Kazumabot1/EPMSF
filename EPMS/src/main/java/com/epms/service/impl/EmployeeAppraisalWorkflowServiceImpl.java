package com.epms.service.impl;

import com.epms.dto.appraisal.*;
import com.epms.entity.*;
import com.epms.entity.enums.*;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.notification.NotificationEventKey;
import com.epms.repository.*;
import com.epms.service.EmployeeAppraisalWorkflowService;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.*;
import java.util.function.Function;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional
public class EmployeeAppraisalWorkflowServiceImpl implements EmployeeAppraisalWorkflowService {

    private static final int MAX_SIGNATURE_BASE64_LENGTH = 2_000_000;
    private static final Set<String> ALLOWED_SIGNATURE_IMAGE_TYPES = Set.of("image/png", "image/jpg", "image/jpeg");

    private final AppraisalCycleRepository cycleRepository;
    private final AppraisalFormCriteriaRepository criteriaRepository;
    private final AppraisalReviewRepository reviewRepository;
    private final AppraisalScoreBandRepository scoreBandRepository;
    private final AppraisalSectionRepository sectionRepository;
    private final EmployeeAppraisalFormRepository formRepository;
    private final EmployeeAppraisalCriteriaRatingRepository ratingRepository;
    private final EmployeeAppraisalHistoryRepository historyRepository;
    private final EmployeeRepository employeeRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final SignatureRepository signatureRepository;
    private final NotificationService notificationService;

    @Override
    public List<AppraisalEmployeeOptionResponse> getPmEligibleEmployees(Integer cycleId, Integer pmUserId) {
        AppraisalCycle cycle = getActiveCycle(cycleId, true);

        User managerUser = getUser(pmUserId);

        List<Employee> candidateEmployees = new ArrayList<>();
        Set<Integer> seenEmployeeIds = new HashSet<>();
        collectManagerTeamEmployees(pmUserId, candidateEmployees, seenEmployeeIds);
        collectDepartmentNoTeamEmployees(cycle, managerUser, candidateEmployees, seenEmployeeIds);

        Set<Integer> employeeLevelEmployeeIds = getActiveEmployeeLevelEmployeeIds();

        return candidateEmployees.stream()
                .filter(employee -> isEmployeeLevelCandidate(employee, employeeLevelEmployeeIds))
                .map(employee -> toPmEmployeeOption(cycle, employee))
                .filter(Objects::nonNull)
                .sorted(Comparator.comparing(AppraisalEmployeeOptionResponse::getEmployeeName, Comparator.nullsLast(String::compareToIgnoreCase)))
                .toList();
    }

    @Override
    public EmployeeAppraisalFormResponse createPmDraft(Integer cycleId, Integer employeeId, Integer pmUserId) {
        AppraisalCycle cycle = getActiveCycle(cycleId, true);

        Employee employee = employeeRepository.findWithDepartmentsById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + employeeId));

        User managerUser = getUser(pmUserId);
        if (!isEmployeeLevelCandidate(employee, getActiveEmployeeLevelEmployeeIds())) {
            throw new BadRequestException("Only employee-level team members can be selected for this appraisal review.");
        }
        User employeeUser = userRepository.findActiveByEmployeeId(employeeId).orElse(null);

        Department department = resolveEmployeeDepartment(employee, employeeUser);

        ensureCycleTargetsDepartment(cycle, department.getId());
        ensureManagerCanReviewEmployee(managerUser, employee);

        Optional<EmployeeAppraisalForm> existing = formRepository.findByCycleIdAndEmployeeId(cycleId, employeeId);
        if (existing.isPresent()) {
            EmployeeAppraisalForm existingForm = existing.get();
            if (existingForm.getStatus() != EmployeeAppraisalStatus.PM_DRAFT
                    && existingForm.getStatus() != EmployeeAppraisalStatus.RETURNED) {
                throw new BadRequestException("This employee appraisal has already been submitted for this cycle.");
            }
            return mapForm(existingForm);
        }

        EmployeeAppraisalForm form = new EmployeeAppraisalForm();
        form.setCycle(cycle);
        form.setEmployee(employee);
        form.setDepartment(department);
        form.setProjectManager(managerUser);
        form.setEmployeeNameSnapshot(resolveEmployeeName(employee, employeeUser));
        form.setEmployeeCodeSnapshot(employeeUser != null ? employeeUser.getEmployeeCode() : null);
        form.setDepartmentNameSnapshot(department.getDepartmentName());
        form.setPositionSnapshot(employee.getPosition() != null ? employee.getPosition().getPositionTitle() : null);
        form.setStatus(EmployeeAppraisalStatus.PM_DRAFT);
        form.setVisibleToEmployee(false);
        form.setLocked(false);

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                null,
                EmployeeAppraisalStatus.PM_DRAFT,
                managerUser,
                "CREATE_MANAGER_DRAFT",
                "Manager draft created."
        );

        return mapForm(saved);
    }


    @Override
    public EmployeeAppraisalFormResponse savePmDraft(
            Integer employeeAppraisalFormId,
            PmAppraisalSubmitRequest request,
            Integer pmUserId
    ) {
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        ensureFormAndCycleUnlocked(form);

        if (form.getStatus() != EmployeeAppraisalStatus.PM_DRAFT
                && form.getStatus() != EmployeeAppraisalStatus.RETURNED) {
            throw new BadRequestException("Only manager draft or returned forms can be saved by Manager.");
        }

        User managerUser = getUser(pmUserId);
        form.setProjectManager(managerUser);
        if (request != null) {
            form.setAssessmentDate(request.getAssessmentDate());
            form.setEffectiveDate(request.getEffectiveDate());
        }

        if (request != null && request.getRatings() != null) {
            savePmDraftRatings(form, request.getRatings());
            recalculateScore(form);
        }

        SignaturePayload managerSignature = request == null ? null : resolveOptionalWorkflowSignature(
                request.getManagerSignatureId(),
                request.getManagerSignatureImageData(),
                request.getManagerSignatureImageType(),
                pmUserId
        );

        AppraisalReview existing = reviewRepository
                .findByEmployeeAppraisalFormIdAndReviewStage(form.getId(), AppraisalReviewStage.PM)
                .orElse(null);

        upsertReview(
                form,
                AppraisalReviewStage.PM,
                managerUser,
                request != null ? request.getRecommendation() : null,
                request != null ? request.getComment() : null,
                managerSignature != null ? managerSignature.imageData() : existing != null ? existing.getSignatureImageData() : null,
                managerSignature != null ? managerSignature.imageType() : existing != null ? existing.getSignatureImageType() : null,
                AppraisalDecision.DRAFT,
                false
        );

        return mapForm(formRepository.save(form));
    }

    @Override
    public EmployeeAppraisalFormResponse submitPmReview(
            Integer employeeAppraisalFormId,
            PmAppraisalSubmitRequest request,
            Integer pmUserId
    ) {
        if (request == null || request.getRatings() == null || request.getRatings().isEmpty()) {
            throw new BadRequestException("Manager ratings are required.");
        }
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        ensureFormAndCycleUnlocked(form);

        if (form.getStatus() != EmployeeAppraisalStatus.PM_DRAFT
                && form.getStatus() != EmployeeAppraisalStatus.RETURNED) {
            throw new BadRequestException("Only manager draft or returned forms can be submitted by Manager.");
        }


        User managerUser = getUser(pmUserId);
        SignaturePayload managerSignature = resolveWorkflowSignature(
                request.getManagerSignatureId(),
                request.getManagerSignatureImageData(),
                request.getManagerSignatureImageType(),
                pmUserId,
                "Manager signature is required."
        );

        form.setProjectManager(managerUser);
        form.setAssessmentDate(request.getAssessmentDate());
        form.setEffectiveDate(request.getEffectiveDate());

        savePmRatings(form, request.getRatings());
        recalculateScore(form);

        upsertReview(
                form,
                AppraisalReviewStage.PM,
                managerUser,
                request.getRecommendation(),
                request.getComment(),
                managerSignature.imageData(),
                managerSignature.imageType(),
                AppraisalDecision.APPROVED
        );

        EmployeeAppraisalStatus previousStatus = form.getStatus();

        form.setStatus(EmployeeAppraisalStatus.DEPT_HEAD_PENDING);
        form.setPmSubmittedAt(new Date());

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                previousStatus,
                EmployeeAppraisalStatus.DEPT_HEAD_PENDING,
                managerUser,
                "SUBMIT_TO_DEPT_HEAD",
                "Manager submitted appraisal to Dept Head."
        );

        notifyDepartmentHeads(saved);

        return mapForm(saved);
    }


    @Override
    public EmployeeAppraisalFormResponse saveDeptHeadDraft(
            Integer employeeAppraisalFormId,
            AppraisalReviewSubmitRequest request,
            Integer deptHeadUserId
    ) {
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        ensureFormAndCycleUnlocked(form);

        if (form.getStatus() != EmployeeAppraisalStatus.DEPT_HEAD_PENDING) {
            throw new BadRequestException("Only Dept Head pending forms can be saved by Dept Head.");
        }

        User deptHead = getUser(deptHeadUserId);
        SignaturePayload deptHeadSignature = request == null ? null : resolveOptionalWorkflowSignature(
                request.getSignatureId(),
                request.getSignatureImageData(),
                request.getSignatureImageType(),
                deptHeadUserId
        );

        AppraisalReview existing = reviewRepository
                .findByEmployeeAppraisalFormIdAndReviewStage(form.getId(), AppraisalReviewStage.DEPT_HEAD)
                .orElse(null);

        form.setDepartmentHead(deptHead);
        upsertReview(
                form,
                AppraisalReviewStage.DEPT_HEAD,
                deptHead,
                safeRecommendation(request),
                safeComment(request),
                deptHeadSignature != null ? deptHeadSignature.imageData() : existing != null ? existing.getSignatureImageData() : null,
                deptHeadSignature != null ? deptHeadSignature.imageType() : existing != null ? existing.getSignatureImageType() : null,
                AppraisalDecision.DRAFT,
                false
        );

        return mapForm(formRepository.save(form));
    }

    @Override
    public EmployeeAppraisalFormResponse submitDeptHeadReview(
            Integer employeeAppraisalFormId,
            AppraisalReviewSubmitRequest request,
            Integer deptHeadUserId
    ) {
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        ensureFormAndCycleUnlocked(form);

        if (form.getStatus() != EmployeeAppraisalStatus.DEPT_HEAD_PENDING) {
            throw new BadRequestException("Only Dept Head pending forms can be reviewed by Dept Head.");
        }


        User deptHead = getUser(deptHeadUserId);
        SignaturePayload deptHeadSignature = resolveWorkflowSignature(
                request != null ? request.getSignatureId() : null,
                request != null ? request.getSignatureImageData() : null,
                request != null ? request.getSignatureImageType() : null,
                deptHeadUserId,
                "Dept Head signature is required."
        );

        form.setDepartmentHead(deptHead);

        upsertReview(
                form,
                AppraisalReviewStage.DEPT_HEAD,
                deptHead,
                safeRecommendation(request),
                safeComment(request),
                deptHeadSignature.imageData(),
                deptHeadSignature.imageType(),
                AppraisalDecision.APPROVED
        );

        EmployeeAppraisalStatus previousStatus = form.getStatus();

        form.setStatus(EmployeeAppraisalStatus.HR_PENDING);
        form.setDeptHeadSubmittedAt(new Date());

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                previousStatus,
                EmployeeAppraisalStatus.HR_PENDING,
                deptHead,
                "SUBMIT_TO_HR",
                "Dept Head reviewed and submitted appraisal to HR."
        );

        notifyHrReviewers(saved);

        return mapForm(saved);
    }


    @Override
    public EmployeeAppraisalFormResponse saveHrDraft(
            Integer employeeAppraisalFormId,
            AppraisalReviewSubmitRequest request,
            Integer hrUserId
    ) {
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        ensureFormUnlockedOnly(form);

        if (form.getStatus() != EmployeeAppraisalStatus.HR_PENDING) {
            throw new BadRequestException("Only HR pending forms can be saved by HR.");
        }

        User hrUser = getUser(hrUserId);
        SignaturePayload hrSignature = request == null ? null : resolveOptionalWorkflowSignature(
                request.getSignatureId(),
                request.getSignatureImageData(),
                request.getSignatureImageType(),
                hrUserId
        );

        AppraisalReview existing = reviewRepository
                .findByEmployeeAppraisalFormIdAndReviewStage(form.getId(), AppraisalReviewStage.HR)
                .orElse(null);

        upsertReview(
                form,
                AppraisalReviewStage.HR,
                hrUser,
                safeRecommendation(request),
                safeComment(request),
                hrSignature != null ? hrSignature.imageData() : existing != null ? existing.getSignatureImageData() : null,
                hrSignature != null ? hrSignature.imageType() : existing != null ? existing.getSignatureImageType() : null,
                AppraisalDecision.DRAFT,
                false
        );

        return mapForm(formRepository.save(form));
    }

    @Override
    public EmployeeAppraisalFormResponse approveByHr(
            Integer employeeAppraisalFormId,
            AppraisalReviewSubmitRequest request,
            Integer hrUserId
    ) {
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        ensureFormUnlockedOnly(form);

        if (form.getStatus() != EmployeeAppraisalStatus.HR_PENDING) {
            throw new BadRequestException("Only HR pending forms can be approved by HR.");
        }

        User hrUser = getUser(hrUserId);
        SignaturePayload hrSignature = resolveWorkflowSignature(
                request != null ? request.getSignatureId() : null,
                request != null ? request.getSignatureImageData() : null,
                request != null ? request.getSignatureImageType() : null,
                hrUserId,
                "HR signature is required."
        );

        upsertReview(
                form,
                AppraisalReviewStage.HR,
                hrUser,
                safeRecommendation(request),
                safeComment(request),
                hrSignature.imageData(),
                hrSignature.imageType(),
                AppraisalDecision.APPROVED
        );

        EmployeeAppraisalStatus previousStatus = form.getStatus();

        form.setStatus(EmployeeAppraisalStatus.COMPLETED);
        form.setHrApprovedAt(new Date());
        form.setVisibleToEmployee(true);
        form.setLocked(true);

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                previousStatus,
                EmployeeAppraisalStatus.COMPLETED,
                hrUser,
                "HR_APPROVE",
                "HR approved appraisal. Employee can view the form."
        );

        notifyEmployeeCompleted(saved);

        return mapForm(saved);
    }

    @Override
    public EmployeeAppraisalFormResponse returnToPm(
            Integer employeeAppraisalFormId,
            String note,
            Integer actionByUserId
    ) {
        EmployeeAppraisalForm form = getFormEntity(employeeAppraisalFormId);

        if (form.getStatus() != EmployeeAppraisalStatus.DEPT_HEAD_PENDING
                && form.getStatus() != EmployeeAppraisalStatus.HR_PENDING) {
            throw new BadRequestException("Only Dept Head pending or HR pending forms can be returned to Manager.");
        }

        User user = getUser(actionByUserId);
        EmployeeAppraisalStatus previousStatus = form.getStatus();

        form.setStatus(EmployeeAppraisalStatus.RETURNED);
        form.setLocked(false);

        EmployeeAppraisalForm saved = formRepository.save(form);

        addHistory(
                saved,
                previousStatus,
                EmployeeAppraisalStatus.RETURNED,
                user,
                "RETURN_TO_MANAGER",
                note
        );

        return mapForm(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeAppraisalFormResponse getForm(Integer employeeAppraisalFormId) {
        return mapForm(getFormEntity(employeeAppraisalFormId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getPmHistory(Integer pmUserId) {
        return formRepository.findByProjectManagerIdAndStatusNotOrderByUpdatedAtDesc(pmUserId, EmployeeAppraisalStatus.PM_DRAFT)
                .stream()
                .map(this::mapForm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getDeptHeadQueue(Integer departmentId) {
        return formRepository.findByDepartmentIdAndStatus(
                        departmentId,
                        EmployeeAppraisalStatus.DEPT_HEAD_PENDING
                )
                .stream()
                .map(this::mapForm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getDeptHeadHistory(Integer deptHeadUserId) {
        return formRepository.findByDepartmentHeadIdOrderByUpdatedAtDesc(deptHeadUserId)
                .stream()
                .map(this::mapForm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getHrReviewQueue() {
        return formRepository.findByStatus(EmployeeAppraisalStatus.HR_PENDING)
                .stream()
                .sorted(Comparator.comparing(
                        EmployeeAppraisalForm::getUpdatedAt,
                        Comparator.nullsLast(Date::compareTo)
                ).reversed())
                .map(this::mapForm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getHrReviewedRecords() {
        return formRepository.findByStatusOrderByHrApprovedAtDesc(EmployeeAppraisalStatus.COMPLETED)
                .stream()
                .map(this::mapForm)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeAppraisalFormResponse> getEmployeeVisibleForms(Integer employeeId) {
        return formRepository.findByEmployeeIdAndVisibleToEmployeeTrueOrderByHrApprovedAtDesc(employeeId)
                .stream()
                .map(this::mapForm)
                .toList();
    }

    private Set<Integer> getActiveEmployeeLevelEmployeeIds() {
        return userRepository.findActiveUsersByNormalizedRoleNames(List.of("EMPLOYEE"))
                .stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .collect(Collectors.toSet());
    }

    private boolean isEmployeeLevelCandidate(Employee employee, Set<Integer> employeeLevelEmployeeIds) {
        if (employee == null || employee.getId() == null) {
            return false;
        }
        // Keep backwards compatibility for databases that do not have role rows yet.
        if (employeeLevelEmployeeIds == null || employeeLevelEmployeeIds.isEmpty()) {
            return true;
        }
        return employeeLevelEmployeeIds.contains(employee.getId());
    }

    private void collectManagerTeamEmployees(Integer managerUserId, List<Employee> candidates, Set<Integer> seenEmployeeIds) {
        if (managerUserId == null) {
            return;
        }

        List<Team> managerTeams = new ArrayList<>();
        managerTeams.addAll(teamRepository.findByProjectManagerIdAndStatusIgnoreCase(managerUserId, "Active"));
        managerTeams.addAll(teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(managerUserId, "Active"));

        managerTeams.stream()
                .filter(Objects::nonNull)
                .filter(Team::isActiveTeam)
                .forEach(team -> collectTeamEmployees(team, managerUserId, candidates, seenEmployeeIds));
    }

    private void collectTeamEmployees(Team team, Integer managerUserId, List<Employee> candidates, Set<Integer> seenEmployeeIds) {
        addUserEmployeeCandidate(candidates, seenEmployeeIds, team.getTeamLeader(), managerUserId);

        if (team.getTeamMembers() == null) {
            return;
        }

        team.getTeamMembers()
                .stream()
                .filter(Objects::nonNull)
                .filter(member -> member.getEndedDate() == null)
                .map(TeamMember::getMemberUser)
                .forEach(memberUser -> addUserEmployeeCandidate(candidates, seenEmployeeIds, memberUser, managerUserId));
    }

    private void addUserEmployeeCandidate(List<Employee> candidates, Set<Integer> seenEmployeeIds, User user, Integer managerUserId) {
        if (user == null || user.getEmployeeId() == null || Boolean.FALSE.equals(user.getActive())) {
            return;
        }

        if (managerUserId != null && Objects.equals(user.getId(), managerUserId)) {
            return;
        }

        employeeRepository.findWithDepartmentsById(user.getEmployeeId())
                .ifPresent(employee -> addCandidate(candidates, seenEmployeeIds, employee));
    }

    private void collectDepartmentNoTeamEmployees(
            AppraisalCycle cycle,
            User managerUser,
            List<Employee> candidates,
            Set<Integer> seenEmployeeIds
    ) {
        Integer managerDepartmentId = resolveManagerDepartmentId(managerUser);
        if (managerDepartmentId == null) {
            return;
        }

        try {
            ensureCycleTargetsDepartment(cycle, managerDepartmentId);
        } catch (BadRequestException ex) {
            return;
        }

        employeeRepository.findCurrentByWorkingDepartmentId(managerDepartmentId, false)
                .stream()
                .filter(Objects::nonNull)
                .filter(employee -> !Objects.equals(employee.getId(), managerUser.getEmployeeId()))
                .filter(employee -> isEmployeeInManagerDepartment(employee, managerDepartmentId))
                .filter(this::hasNoActiveTeamMembership)
                .forEach(employee -> addCandidate(candidates, seenEmployeeIds, employee));
    }

    private Integer resolveManagerDepartmentId(User managerUser) {
        if (managerUser == null) {
            return null;
        }
        if (managerUser.getDepartmentId() != null) {
            return managerUser.getDepartmentId();
        }
        if (managerUser.getEmployeeId() == null) {
            return null;
        }
        return employeeRepository.findWithDepartmentsById(managerUser.getEmployeeId())
                .map(employee -> {
                    try {
                        return resolveEmployeeDepartment(employee, managerUser).getId();
                    } catch (RuntimeException ex) {
                        return null;
                    }
                })
                .orElse(null);
    }

    private boolean isEmployeeInManagerDepartment(Employee employee, Integer managerDepartmentId) {
        if (employee == null || employee.getId() == null || managerDepartmentId == null) {
            return false;
        }
        User employeeUser = userRepository.findActiveByEmployeeId(employee.getId()).orElse(null);
        try {
            Department employeeDepartment = resolveEmployeeDepartment(employee, employeeUser);
            return employeeDepartment != null && Objects.equals(employeeDepartment.getId(), managerDepartmentId);
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private boolean hasNoActiveTeamMembership(Employee employee) {
        if (employee == null || employee.getId() == null) {
            return false;
        }
        User employeeUser = userRepository.findActiveByEmployeeId(employee.getId()).orElse(null);
        if (employeeUser == null || employeeUser.getId() == null) {
            return true;
        }
        return !teamMemberRepository.existsActiveMembershipByMemberUserId(employeeUser.getId());
    }

    private void addCandidate(List<Employee> candidates, Set<Integer> seenEmployeeIds, Employee employee) {
        if (employee == null || employee.getId() == null || seenEmployeeIds.contains(employee.getId())) {
            return;
        }
        candidates.add(employee);
        seenEmployeeIds.add(employee.getId());
    }

    private AppraisalEmployeeOptionResponse toPmEmployeeOption(AppraisalCycle cycle, Employee employee) {
        User employeeUser = userRepository.findActiveByEmployeeId(employee.getId()).orElse(null);
        Department department = resolveEmployeeDepartment(employee, employeeUser);

        try {
            ensureCycleTargetsDepartment(cycle, department.getId());
        } catch (BadRequestException ex) {
            return null;
        }

        EmployeeAppraisalForm existingForm = formRepository
                .findByCycleIdAndEmployeeId(cycle.getId(), employee.getId())
                .orElse(null);

        if (existingForm != null
                && existingForm.getStatus() != EmployeeAppraisalStatus.PM_DRAFT
                && existingForm.getStatus() != EmployeeAppraisalStatus.RETURNED) {
            return null;
        }

        return new AppraisalEmployeeOptionResponse(
                employee.getId(),
                resolveEmployeeName(employee, employeeUser),
                resolveEmployeeCode(employeeUser),
                department.getId(),
                department.getDepartmentName(),
                employee.getPosition() != null ? employee.getPosition().getPositionTitle() : null,
                existingForm != null ? existingForm.getId() : null,
                existingForm != null ? existingForm.getStatus() : null
        );
    }

    private String resolveEmployeeCode(User employeeUser) {
        return employeeUser != null ? employeeUser.getEmployeeCode() : null;
    }

    private void ensureManagerCanReviewEmployee(User managerUser, Employee employee) {
        if (managerUser == null || managerUser.getId() == null || employee == null || employee.getId() == null) {
            throw new BadRequestException("This employee is not assigned to your team for appraisal review.");
        }

        Set<Integer> managerTeamEmployeeIds = new HashSet<>();
        List<Employee> managerTeamEmployees = new ArrayList<>();
        collectManagerTeamEmployees(managerUser.getId(), managerTeamEmployees, managerTeamEmployeeIds);

        if (managerTeamEmployeeIds.contains(employee.getId())) {
            return;
        }

        if (canManagerReviewDepartmentNoTeamEmployee(managerUser, employee)) {
            return;
        }

        throw new BadRequestException("Only employees from your assigned team, or same-department employees without an active team, can be selected for appraisal review.");
    }

    private boolean canManagerReviewDepartmentNoTeamEmployee(User managerUser, Employee employee) {
        Integer managerDepartmentId = resolveManagerDepartmentId(managerUser);
        return managerDepartmentId != null
                && isEmployeeInManagerDepartment(employee, managerDepartmentId)
                && hasNoActiveTeamMembership(employee);
    }

    private void notifyDepartmentHeads(EmployeeAppraisalForm form) {
        if (form.getDepartment() == null || form.getDepartment().getId() == null) {
            return;
        }
        String employeeName = form.getEmployeeNameSnapshot() != null ? form.getEmployeeNameSnapshot() : "Employee";
        String cycleName = form.getCycle() != null ? form.getCycle().getCycleName() : "Appraisal cycle";
        String title = "Manager Appraisal Submitted";
        String message = employeeName + " appraisal for " + cycleName + " is ready for Dept Head review.";

        userRepository.findActiveDepartmentHeadsByDepartmentId(form.getDepartment().getId())
                .forEach(deptHead -> notificationService.sendEventOnce(deptHead.getId(), NotificationEventKey.APPRAISAL_REVIEW_SUBMITTED, title, message, "APPRAISAL"));
    }


    private void ensureFormUnlockedOnly(EmployeeAppraisalForm form) {
        if (Boolean.TRUE.equals(form.getLocked())) {
            throw new BadRequestException("This appraisal form is locked and can only be viewed.");
        }
    }

    private void ensureFormAndCycleUnlocked(EmployeeAppraisalForm form) {
        if (Boolean.TRUE.equals(form.getLocked())) {
            throw new BadRequestException("This appraisal form is locked and can only be viewed.");
        }
        AppraisalCycle cycle = form.getCycle();
        autoLockCycleIfExpired(cycle);
        if (cycle != null && cycle.getStartDate() != null && LocalDate.now().isBefore(cycle.getStartDate())) {
            throw new BadRequestException("This appraisal cycle has not started yet. Manager review is view-only until the start date.");
        }
        if (cycle != null && Boolean.TRUE.equals(cycle.getLocked())) {
            throw new BadRequestException("This appraisal cycle is locked because the end date has been reached.");
        }
    }

    private SignaturePayload resolveWorkflowSignature(
            Long signatureId,
            String fallbackImageData,
            String fallbackImageType,
            Integer currentUserId,
            String requiredMessage
    ) {
        if (signatureId != null) {
            Signature signature = signatureRepository.findByIdAndUserIdAndIsActiveTrue(signatureId, Long.valueOf(currentUserId.longValue()))
                    .orElseThrow(() -> new BadRequestException("Selected signature is not available for the current user."));
            validateWorkflowSignatureImage(signature.getImageData(), signature.getImageType(), requiredMessage);
            return new SignaturePayload(signature.getImageData().trim(), signature.getImageType().trim().toLowerCase());
        }

        validateWorkflowSignatureImage(fallbackImageData, fallbackImageType, requiredMessage);
        return new SignaturePayload(fallbackImageData.trim(), fallbackImageType.trim().toLowerCase());
    }

    private SignaturePayload resolveOptionalWorkflowSignature(
            Long signatureId,
            String fallbackImageData,
            String fallbackImageType,
            Integer currentUserId
    ) {
        boolean hasFallback = fallbackImageData != null && !fallbackImageData.trim().isBlank()
                && fallbackImageType != null && !fallbackImageType.trim().isBlank();
        if (signatureId == null && !hasFallback) {
            return null;
        }
        return resolveWorkflowSignature(
                signatureId,
                fallbackImageData,
                fallbackImageType,
                currentUserId,
                "Signature image is invalid."
        );
    }

    private void ensureSubmissionDeadlineNotPassed(LocalDate deadline, String message) {
        if (deadline != null && LocalDate.now().isAfter(deadline)) {
            throw new BadRequestException(message);
        }
    }

    private LocalDate resolveManagerDeadline(AppraisalCycle cycle) {
        return cycle.getManagerSubmissionDeadline() != null
                ? cycle.getManagerSubmissionDeadline()
                : cycle.getSubmissionDeadline();
    }

    private LocalDate resolveDeptHeadDeadline(AppraisalCycle cycle) {
        return cycle.getDeptHeadSubmissionDeadline() != null
                ? cycle.getDeptHeadSubmissionDeadline()
                : cycle.getSubmissionDeadline();
    }

    private void validateWorkflowSignatureImage(String imageData, String imageType, String requiredMessage) {
        if (imageData == null || imageData.trim().isBlank() || imageType == null || imageType.trim().isBlank()) {
            throw new BadRequestException(requiredMessage);
        }
        if (imageData.length() > MAX_SIGNATURE_BASE64_LENGTH) {
            throw new BadRequestException("Signature image is too large.");
        }
        if (!ALLOWED_SIGNATURE_IMAGE_TYPES.contains(imageType.trim().toLowerCase())) {
            throw new BadRequestException("Only png, jpg, and jpeg signature images are supported.");
        }
    }

    private record SignaturePayload(String imageData, String imageType) {
    }

    private void notifyHrReviewers(EmployeeAppraisalForm form) {
        String employeeName = form.getEmployeeNameSnapshot() != null ? form.getEmployeeNameSnapshot() : "Employee";
        String cycleName = form.getCycle() != null ? form.getCycle().getCycleName() : "Appraisal cycle";
        String title = "Dept Head Appraisal Submitted";
        String message = employeeName + " appraisal for " + cycleName + " is ready for HR final review.";

        userRepository.findActiveUsersByNormalizedRoleNames(List.of("HR", "HUMAN_RESOURCES", "ADMIN"))
                .forEach(hrUser -> notificationService.sendEventOnce(hrUser.getId(), NotificationEventKey.APPRAISAL_REVIEW_SUBMITTED, title, message, "APPRAISAL"));
    }

    private void notifyEmployeeCompleted(EmployeeAppraisalForm form) {
        if (form.getEmployee() == null || form.getEmployee().getId() == null) {
            return;
        }
        User employeeUser = userRepository.findActiveByEmployeeId(form.getEmployee().getId()).orElse(null);
        if (employeeUser == null) {
            return;
        }
        String cycleName = form.getCycle() != null ? form.getCycle().getCycleName() : "Appraisal cycle";
        notificationService.sendEventOnce(
                employeeUser.getId(),
                NotificationEventKey.APPRAISAL_RESULT_PUBLISHED,
                "Appraisal Form Completed",
                cycleName + " has been approved by HR and is available for you to view.",
                "APPRAISAL"
        );
    }

    private AppraisalCycle getActiveCycle(Integer cycleId, boolean requireStarted) {
        AppraisalCycle cycle = cycleRepository.findById(cycleId)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal cycle not found with id: " + cycleId));

        autoLockCycleIfExpired(cycle);

        if (cycle.getStatus() != AppraisalCycleStatus.ACTIVE) {
            throw new BadRequestException("Only active appraisal cycles can be used for Manager review.");
        }

        if (Boolean.TRUE.equals(cycle.getLocked())) {
            throw new BadRequestException("Locked appraisal cycles cannot be used for Manager review.");
        }

        if (requireStarted && cycle.getStartDate() != null && LocalDate.now().isBefore(cycle.getStartDate())) {
            throw new BadRequestException("This appraisal cycle has not started yet. Manager review is view-only until the start date.");
        }

        return cycle;
    }

    private void autoLockCycleIfExpired(AppraisalCycle cycle) {
        if (cycle == null
                || cycle.getEndDate() == null
                || cycle.getStatus() != AppraisalCycleStatus.ACTIVE
                || Boolean.TRUE.equals(cycle.getLocked())
                || cycle.getEndDate().isAfter(LocalDate.now())) {
            return;
        }

        cycle.setLocked(true);
        cycle.setStatus(AppraisalCycleStatus.LOCKED);
        AppraisalCycle saved = cycleRepository.save(cycle);
        notifyManagersAndDeptHeadsCycleLocked(saved);
    }

    private void notifyManagersAndDeptHeadsCycleLocked(AppraisalCycle cycle) {
        String cycleName = cycle != null && cycle.getCycleName() != null && !cycle.getCycleName().isBlank()
                ? cycle.getCycleName()
                : "Appraisal Cycle";
        String title = "Appraisal Cycle Locked";
        String message = cycleName + " appraisal cycle has been locked.";

        Set<Integer> departmentIds = cycle == null || cycle.getCycleDepartments() == null
                ? Set.of()
                : cycle.getCycleDepartments().stream()
                  .map(AppraisalCycleDepartment::getDepartment)
                  .filter(Objects::nonNull)
                  .map(Department::getId)
                  .filter(Objects::nonNull)
                  .collect(Collectors.toCollection(LinkedHashSet::new));

        Set<Integer> notifiedUserIds = new LinkedHashSet<>();
        for (Integer departmentId : departmentIds) {
            userRepository.findActiveManagersByDepartmentId(departmentId).forEach(user -> {
                if (user != null && user.getId() != null && notifiedUserIds.add(user.getId())) {
                    notificationService.sendEventOnce(user.getId(), NotificationEventKey.APPRAISAL_CYCLE_LOCKED, title, message, "APPRAISAL", cycle.getId());
                }
            });
            userRepository.findActiveDepartmentHeadsByDepartmentId(departmentId).forEach(user -> {
                if (user != null && user.getId() != null && notifiedUserIds.add(user.getId())) {
                    notificationService.sendEventOnce(user.getId(), NotificationEventKey.APPRAISAL_CYCLE_LOCKED, title, message, "APPRAISAL", cycle.getId());
                }
            });
        }
    }

    private EmployeeAppraisalForm getFormEntity(Integer formId) {
        return formRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee appraisal form not found with id: " + formId));
    }

    private User getUser(Integer userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + userId));
    }

    private Department resolveEmployeeDepartment(Employee employee, User employeeUser) {
        if (employeeUser != null && employeeUser.getDepartmentId() != null) {
            return departmentRepository.findById(employeeUser.getDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException(
                            "Employee department not found with id: " + employeeUser.getDepartmentId()
                    ));
        }

        if (employee.getEmployeeDepartments() != null) {
            return employee.getEmployeeDepartments()
                    .stream()
                    .filter(employeeDepartment -> employeeDepartment.getEnddate() == null)
                    .map(this::resolveWorkingDepartment)
                    .filter(Objects::nonNull)
                    .findFirst()
                    .orElseThrow(() -> new BadRequestException("Employee has no active department."));
        }

        throw new BadRequestException("Employee has no active department.");
    }

    private Department resolveWorkingDepartment(EmployeeDepartment employeeDepartment) {
        if (employeeDepartment == null) {
            return null;
        }

        if (employeeDepartment.getParentDepartment() != null) {
            return employeeDepartment.getParentDepartment();
        }

        return employeeDepartment.getCurrentDepartment();
    }

    private void ensureCycleTargetsDepartment(AppraisalCycle cycle, Integer departmentId) {
        boolean matched = cycle.getCycleDepartments() != null
                && cycle.getCycleDepartments()
                .stream()
                .anyMatch(target ->
                        target.getDepartment() != null
                                && Objects.equals(target.getDepartment().getId(), departmentId)
                );

        if (!matched) {
            throw new BadRequestException("This appraisal cycle is not assigned to the employee department.");
        }
    }

    private String resolveEmployeeName(Employee employee, User employeeUser) {
        if (employeeUser != null
                && employeeUser.getFullName() != null
                && !employeeUser.getFullName().isBlank()) {
            return employeeUser.getFullName();
        }

        return ((employee.getFirstName() != null ? employee.getFirstName() : "") + " "
                + (employee.getLastName() != null ? employee.getLastName() : "")).trim();
    }

    private void savePmDraftRatings(EmployeeAppraisalForm form, List<AppraisalRatingInput> ratings) {
        savePmRatingsInternal(form, ratings, false);
    }

    private void savePmRatings(EmployeeAppraisalForm form, List<AppraisalRatingInput> ratings) {
        savePmRatingsInternal(form, ratings, true);
    }

    private void savePmRatingsInternal(EmployeeAppraisalForm form, List<AppraisalRatingInput> ratings, boolean requireValidRating) {
        if (ratings == null) {
            return;
        }

        List<AppraisalFormCriteria> templateCriteria =
                criteriaRepository.findActiveCriteriaByTemplateId(form.getCycle().getTemplate().getId());

        Map<Integer, AppraisalFormCriteria> criteriaById = templateCriteria
                .stream()
                .collect(Collectors.toMap(AppraisalFormCriteria::getId, Function.identity()));

        Map<Integer, EmployeeAppraisalCriteriaRating> existingRatingsByCriteriaId =
                ratingRepository.findByEmployeeAppraisalFormId(form.getId())
                        .stream()
                        .filter(rating -> rating.getCriteria() != null && rating.getCriteria().getId() != null)
                        .collect(Collectors.toMap(
                                rating -> rating.getCriteria().getId(),
                                Function.identity(),
                                (left, right) -> left
                        ));

        Set<Integer> touchedCriteriaIds = new HashSet<>();

        for (AppraisalRatingInput input : ratings) {
            if (input == null || input.getCriteriaId() == null || !criteriaById.containsKey(input.getCriteriaId())) {
                throw new BadRequestException("Invalid criteria id for this template: " + (input != null ? input.getCriteriaId() : null));
            }

            AppraisalFormCriteria criteria = criteriaById.get(input.getCriteriaId());
            Integer ratingValue = input.getRatingValue();
            touchedCriteriaIds.add(input.getCriteriaId());

            if (!requireValidRating && (ratingValue == null || ratingValue <= 0)) {
                EmployeeAppraisalCriteriaRating existing = existingRatingsByCriteriaId.get(input.getCriteriaId());
                if (existing != null) {
                    ratingRepository.delete(existing);
                }
                continue;
            }

            if (ratingValue == null) {
                throw new BadRequestException("Rating value is required for criteria id: " + input.getCriteriaId());
            }

            if (ratingValue < 1 || ratingValue > criteria.getMaxRating()) {
                throw new BadRequestException(
                        "Rating value must be between 1 and "
                                + criteria.getMaxRating()
                                + " for criteria id: "
                                + input.getCriteriaId()
                );
            }

            EmployeeAppraisalCriteriaRating rating = existingRatingsByCriteriaId.get(input.getCriteriaId());
            if (rating == null) {
                rating = new EmployeeAppraisalCriteriaRating();
                rating.setEmployeeAppraisalForm(form);
                rating.setCriteria(criteria);
            }
            rating.setRatingValue(ratingValue);
            rating.setComment(input.getComment());

            ratingRepository.save(rating);
        }

        if (requireValidRating) {
            existingRatingsByCriteriaId.forEach((criteriaId, rating) -> {
                if (!touchedCriteriaIds.contains(criteriaId)) {
                    ratingRepository.delete(rating);
                }
            });
        }
    }

    private void recalculateScore(EmployeeAppraisalForm form) {
        List<EmployeeAppraisalCriteriaRating> ratings =
                ratingRepository.findByEmployeeAppraisalFormId(form.getId());

        int totalPoints = ratings
                .stream()
                .mapToInt(EmployeeAppraisalCriteriaRating::getRatingValue)
                .sum();

        int maxPossible = ratings
                .stream()
                .map(EmployeeAppraisalCriteriaRating::getCriteria)
                .filter(Objects::nonNull)
                .mapToInt(criteria -> criteria.getMaxRating() != null ? criteria.getMaxRating() : 5)
                .sum();

        int answeredCount = ratings.size();

        double scorePercent = maxPossible > 0
                ? (totalPoints * 100.0) / maxPossible
                : 0.0;

        int roundedScore = (int) Math.round(scorePercent);

        form.setTotalPoints(totalPoints);
        form.setAnsweredCriteriaCount(answeredCount);
        form.setScorePercent(Math.round(scorePercent * 100.0) / 100.0);
        form.setPerformanceLabel(resolvePerformanceLabel(form, roundedScore));
    }


    private String resolvePerformanceLabel(EmployeeAppraisalForm form, int roundedScore) {
        if (form != null && form.getCycle() != null && form.getCycle().getTemplate() != null) {
            Optional<AppraisalTemplateScoreBand> matchedBand = findTemplateScoreBand(form.getCycle().getTemplate(), roundedScore);
            if (matchedBand.isPresent()) {
                return matchedBand.get().getLabel();
            }
        }

        return resolveFallbackLabel(roundedScore);
    }

    private Optional<AppraisalTemplateScoreBand> findTemplateScoreBand(AppraisalFormTemplate template, int roundedScore) {
        if (template.getScoreBands() == null || template.getScoreBands().isEmpty()) {
            return Optional.empty();
        }

        return template.getScoreBands()
                .stream()
                .filter(band -> band.getActive() == null || band.getActive())
                .filter(band -> band.getMinScore() != null && band.getMaxScore() != null)
                .filter(band -> roundedScore >= band.getMinScore() && roundedScore <= band.getMaxScore())
                .sorted(Comparator.comparing(
                        AppraisalTemplateScoreBand::getSortOrder,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .findFirst();
    }

    private String resolveFallbackLabel(int roundedScore) {
        if (roundedScore >= 86) {
            return "Outstanding";
        }

        if (roundedScore >= 71) {
            return "Exceeds Requirements";
        }

        if (roundedScore >= 60) {
            return "Meet Requirement";
        }

        if (roundedScore >= 40) {
            return "Need Improvement";
        }

        return "Unsatisfactory";
    }

    private synchronized void upsertReview(
            EmployeeAppraisalForm form,
            AppraisalReviewStage stage,
            User reviewer,
            String recommendation,
            String comment,
            String signatureImageData,
            String signatureImageType,
            AppraisalDecision decision
    ) {
        upsertReview(form, stage, reviewer, recommendation, comment, signatureImageData, signatureImageType, decision, true);
    }

    private synchronized void upsertReview(
            EmployeeAppraisalForm form,
            AppraisalReviewStage stage,
            User reviewer,
            String recommendation,
            String comment,
            String signatureImageData,
            String signatureImageType,
            AppraisalDecision decision,
            boolean submitted
    ) {
        AppraisalReview review = reviewRepository
                .findByEmployeeAppraisalFormIdAndReviewStage(form.getId(), stage)
                .orElseGet(AppraisalReview::new);

        review.setEmployeeAppraisalForm(form);
        review.setReviewStage(stage);
        review.setReviewerUser(reviewer);
        review.setRecommendation(recommendation);
        review.setComment(comment);
        review.setSignatureImageData(signatureImageData);
        review.setSignatureImageType(signatureImageType);
        review.setDecision(decision);

        Date actionTime = new Date();
        // Keep submitted_at non-null even for draft rows so existing local databases
        // with the old NOT NULL constraint do not fail with a 500 during auto-save.
        // The decision column remains the source of truth: DRAFT = saved draft,
        // APPROVED/SUBMITTED = final stage submission.
        if (submitted || review.getSubmittedAt() == null) {
            review.setSubmittedAt(actionTime);
        }

        reviewRepository.save(review);
    }

    private void addHistory(
            EmployeeAppraisalForm form,
            EmployeeAppraisalStatus from,
            EmployeeAppraisalStatus to,
            User user,
            String actionName,
            String note
    ) {
        EmployeeAppraisalHistory history = new EmployeeAppraisalHistory();

        history.setEmployeeAppraisalForm(form);
        history.setFromStatus(from);
        history.setToStatus(to);
        history.setActionByUser(user);
        history.setActionName(actionName);
        history.setNote(note);

        historyRepository.save(history);
    }

    private String safeRecommendation(AppraisalReviewSubmitRequest request) {
        return request != null ? request.getRecommendation() : null;
    }

    private String safeComment(AppraisalReviewSubmitRequest request) {
        return request != null ? request.getComment() : null;
    }

    private EmployeeAppraisalFormResponse mapForm(EmployeeAppraisalForm form) {
        EmployeeAppraisalFormResponse response = new EmployeeAppraisalFormResponse();

        response.setId(form.getId());
        response.setCycleId(form.getCycle() != null ? form.getCycle().getId() : null);
        response.setCycleName(form.getCycle() != null ? form.getCycle().getCycleName() : null);
        response.setCycleType(form.getCycle() != null ? form.getCycle().getCycleType() : null);
        response.setCycleYear(form.getCycle() != null ? form.getCycle().getCycleYear() : null);
        response.setCycleStartDate(form.getCycle() != null ? form.getCycle().getStartDate() : null);
        response.setCycleEndDate(form.getCycle() != null ? form.getCycle().getEndDate() : null);
        response.setCycleSubmissionDeadline(form.getCycle() != null ? form.getCycle().getSubmissionDeadline() : null);
        response.setCycleManagerSubmissionDeadline(form.getCycle() != null ? resolveManagerDeadline(form.getCycle()) : null);
        response.setCycleDeptHeadSubmissionDeadline(form.getCycle() != null ? resolveDeptHeadDeadline(form.getCycle()) : null);
        response.setCycleLocked(form.getCycle() != null ? form.getCycle().getLocked() : null);
        response.setEmployeeId(form.getEmployee() != null ? form.getEmployee().getId() : null);
        response.setEmployeeName(form.getEmployeeNameSnapshot());
        response.setEmployeeCode(form.getEmployeeCodeSnapshot());
        response.setDepartmentId(form.getDepartment() != null ? form.getDepartment().getId() : null);
        response.setDepartmentName(form.getDepartmentNameSnapshot());
        response.setPositionName(form.getPositionSnapshot());
        response.setAssessmentDate(form.getAssessmentDate());
        response.setEffectiveDate(form.getEffectiveDate());
        response.setStatus(form.getStatus());
        response.setTotalPoints(form.getTotalPoints());
        response.setAnsweredCriteriaCount(form.getAnsweredCriteriaCount());
        response.setScorePercent(form.getScorePercent());
        response.setPerformanceLabel(form.getPerformanceLabel());
        response.setVisibleToEmployee(form.getVisibleToEmployee());
        response.setLocked(form.getLocked());
        response.setPmSubmittedAt(form.getPmSubmittedAt());
        response.setDeptHeadSubmittedAt(form.getDeptHeadSubmittedAt());
        response.setHrApprovedAt(form.getHrApprovedAt());

        List<AppraisalReview> reviews = reviewRepository.findByEmployeeAppraisalFormIdOrderByCreatedAtAsc(form.getId());
        reviews.forEach(review -> {
            if (review.getReviewStage() == AppraisalReviewStage.PM) {
                response.setManagerCheckedByEmployeeId(displayEmployeeId(review.getReviewerUser()));
            } else if (review.getReviewStage() == AppraisalReviewStage.DEPT_HEAD) {
                response.setDeptHeadCheckedByEmployeeId(displayEmployeeId(review.getReviewerUser()));
            } else if (review.getReviewStage() == AppraisalReviewStage.HR) {
                response.setHrCheckedByEmployeeId(displayEmployeeId(review.getReviewerUser()));
            }
        });

        if (form.getCycle() != null && form.getCycle().getTemplate() != null) {
            response.setScoreBands(mapTemplateScoreBands(form.getCycle().getTemplate()));
        }

        response.setSections(mapSectionsWithRatings(form));

        response.setReviews(
                reviews.stream()
                        .map(this::mapReview)
                        .toList()
        );

        return response;
    }


    private List<AppraisalScoreBandResponse> mapTemplateScoreBands(AppraisalFormTemplate template) {
        if (template == null || template.getScoreBands() == null || template.getScoreBands().isEmpty()) {
            return defaultScoreBands();
        }

        return template.getScoreBands()
                .stream()
                .filter(band -> band.getActive() == null || band.getActive())
                .sorted(Comparator.comparing(
                        AppraisalTemplateScoreBand::getSortOrder,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .map(band -> new AppraisalScoreBandResponse(
                        band.getId(),
                        band.getMinScore(),
                        band.getMaxScore(),
                        band.getLabel(),
                        band.getDescription(),
                        band.getSortOrder(),
                        band.getActive()
                ))
                .toList();
    }

    private List<AppraisalScoreBandResponse> defaultScoreBands() {
        List<AppraisalScoreBandResponse> defaults = new ArrayList<>();
        defaults.add(new AppraisalScoreBandResponse(null, 86, 100, "Outstanding", "Performance exceptional and far exceeds expectations.", 1, true));
        defaults.add(new AppraisalScoreBandResponse(null, 71, 85, "Exceeds Requirements", "Performance is consistent and clearly meets essential requirements.", 2, true));
        defaults.add(new AppraisalScoreBandResponse(null, 60, 70, "Meet Requirement", "Performance is satisfactory and meets requirements of the job.", 3, true));
        defaults.add(new AppraisalScoreBandResponse(null, 40, 59, "Need Improvement", "Performance is inconsistent. Supervision and training are needed.", 4, true));
        defaults.add(new AppraisalScoreBandResponse(null, 0, 39, "Unsatisfactory", "Performance does not meet the minimum requirement of the job.", 5, true));
        return defaults;
    }

    private List<AppraisalSectionResponse> mapSectionsWithRatings(EmployeeAppraisalForm form) {
        Integer templateId = form.getCycle().getTemplate().getId();

        Map<Integer, EmployeeAppraisalCriteriaRating> ratingsByCriteriaId =
                ratingRepository.findByEmployeeAppraisalFormId(form.getId())
                        .stream()
                        .collect(Collectors.toMap(
                                rating -> rating.getCriteria().getId(),
                                Function.identity()
                        ));

        return sectionRepository.findByTemplateIdWithCriteria(templateId)
                .stream()
                .filter(section -> section.getActive() == null || section.getActive())
                .sorted(Comparator.comparing(
                        AppraisalSection::getSortOrder,
                        Comparator.nullsLast(Integer::compareTo)
                ))
                .map(section -> {
                    AppraisalSectionResponse sectionResponse = new AppraisalSectionResponse();

                    sectionResponse.setId(section.getId());
                    sectionResponse.setSectionName(section.getSectionName());
                    sectionResponse.setDescription(section.getDescription());
                    sectionResponse.setSortOrder(section.getSortOrder());
                    sectionResponse.setActive(section.getActive());

                    sectionResponse.setCriteria(
                            section.getCriteria()
                                    .stream()
                                    .filter(criteria -> criteria.getActive() == null || criteria.getActive())
                                    .sorted(Comparator.comparing(
                                            AppraisalFormCriteria::getSortOrder,
                                            Comparator.nullsLast(Integer::compareTo)
                                    ))
                                    .map(criteria -> {
                                        EmployeeAppraisalCriteriaRating rating =
                                                ratingsByCriteriaId.get(criteria.getId());

                                        return new AppraisalCriterionResponse(
                                                criteria.getId(),
                                                criteria.getCriteriaText(),
                                                criteria.getDescription(),
                                                criteria.getSortOrder(),
                                                criteria.getMaxRating(),
                                                criteria.getRatingRequired(),
                                                criteria.getActive(),
                                                rating != null ? rating.getRatingValue() : null,
                                                rating != null ? rating.getComment() : null
                                        );
                                    })
                                    .toList()
                    );

                    return sectionResponse;
                })
                .toList();
    }

    private AppraisalReviewResponse mapReview(AppraisalReview review) {
        return new AppraisalReviewResponse(
                review.getId(),
                review.getReviewStage(),
                review.getReviewerUser() != null ? review.getReviewerUser().getId() : null,
                review.getReviewerUser() != null ? review.getReviewerUser().getFullName() : null,
                displayEmployeeId(review.getReviewerUser()),
                review.getRecommendation(),
                review.getComment(),
                review.getSignatureImageData(),
                review.getSignatureImageType(),
                review.getDecision(),
                review.getSubmittedAt()
        );
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
}