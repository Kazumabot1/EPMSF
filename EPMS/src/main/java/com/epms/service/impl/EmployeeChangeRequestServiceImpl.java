package com.epms.service.impl;

import com.epms.dto.EmployeeChangeRequestDtos;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeAssessment;
import com.epms.entity.EmployeeChangeRequest;
import com.epms.entity.EmployeeChangeRequestAudit;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.EmployeeKpiForm;
import com.epms.entity.Position;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.AssessmentStatus;
import com.epms.entity.enums.EmployeeAppraisalStatus;
import com.epms.entity.enums.EmployeeChangeRequestStatus;
import com.epms.entity.enums.EmployeeChangeRequestType;
import com.epms.entity.enums.EmployeeKpiStatus;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeAppraisalFormRepository;
import com.epms.repository.EmployeeAssessmentRepository;
import com.epms.repository.EmployeeChangeRequestAuditRepository;
import com.epms.repository.EmployeeChangeRequestRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.EmployeeKpiFormRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.PipRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.EmployeeChangeRequestService;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

import com.epms.entity.EmployeeAuditHistory;
import com.epms.entity.Role;
import com.epms.entity.UserRole;
import com.epms.repository.EmployeeAuditHistoryRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.service.UserAccountProvisioningService;

import java.util.Date;
import java.util.Objects;

import com.epms.entity.ContinuousFeedback;
import com.epms.entity.EmployeeAuditHistory;
import com.epms.entity.Pip;
import com.epms.repository.ContinuousFeedbackRepository;

import java.util.HashMap;
import java.util.Map;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class EmployeeChangeRequestServiceImpl implements EmployeeChangeRequestService {

    private static final Set<EmployeeKpiStatus> CLOSED_KPI_STATUSES = Set.of(
            EmployeeKpiStatus.FINALIZED,
            EmployeeKpiStatus.CLOSED
    );

    private static final Set<EmployeeAppraisalStatus> BLOCKING_APPRAISAL_STATUSES = Set.of(
            EmployeeAppraisalStatus.PM_DRAFT,
            EmployeeAppraisalStatus.DEPT_HEAD_PENDING,
            EmployeeAppraisalStatus.HR_PENDING,
            EmployeeAppraisalStatus.RETURNED
    );

    private static final Set<AssessmentStatus> BLOCKING_ASSESSMENT_STATUSES = Set.of(
            AssessmentStatus.DRAFT,
            AssessmentStatus.SUBMITTED,
            AssessmentStatus.PENDING_MANAGER,
            AssessmentStatus.PENDING_DEPARTMENT_HEAD,
            AssessmentStatus.PENDING_HR,
            AssessmentStatus.DECLINED,
            AssessmentStatus.REJECTED
    );

    private static final Set<String> WORKFORCE_CHANGE_TARGET_ROLES = Set.of(
            "EMPLOYEE",
            "MANAGER",
            "PROJECT_MANAGER",
            "TEAM_MANAGER",
            "PM"
    );


    private final EmployeeChangeRequestRepository requestRepository;
    private final EmployeeChangeRequestAuditRepository auditRepository;
    private final EmployeeRepository employeeRepository;
    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final UserRepository userRepository;
    private final EmployeeKpiFormRepository employeeKpiFormRepository;
    private final PipRepository pipRepository;
    private final EmployeeAppraisalFormRepository employeeAppraisalFormRepository;
    private final EmployeeAssessmentRepository employeeAssessmentRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamRepository teamRepository;
    private final NotificationService notificationService;

    private final EmployeeAuditHistoryRepository employeeAuditHistoryRepository;
    private final UserAccountProvisioningService userAccountProvisioningService;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;

    private final ContinuousFeedbackRepository continuousFeedbackRepository;
    private final EmployeeAuditHistoryRepository  froemployeeAuditHistoryRepository;


    @Override
    @Transactional(readOnly = true)
    public List<EmployeeChangeRequestDtos.WorkforceEmployeeResponse> getWorkforceEmployees() {
        return employeeRepository.findAllActiveWithDepartments()
                .stream()
                .filter(this::isAllowedWorkforceTargetEmployeeForList)
                .map(this::toWorkforceEmployeeResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeChangeRequestDtos.WorkforcePositionResponse> getWorkforcePositions() {
        return positionRepository.findAllByOrderByPositionTitleAsc()
                .stream()
                .filter(position -> position.getStatus() == null || Boolean.TRUE.equals(position.getStatus()))
                .filter(this::isAllowedWorkforceTargetPositionForList)
                .map(this::toWorkforcePositionResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeChangeRequestDtos.WorkforceDepartmentResponse> getWorkforceDepartments() {
        return departmentRepository.findAll()
                .stream()
                .filter(department -> department.getStatus() == null || Boolean.TRUE.equals(department.getStatus()))
                .sorted(Comparator.comparing(
                        department -> department.getDepartmentName() == null ? "" : department.getDepartmentName(),
                        String.CASE_INSENSITIVE_ORDER
                ))
                .map(this::toWorkforceDepartmentResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeChangeRequestDtos.SummaryResponse> getAllForHr() {
        return requestRepository.findAllByOrderByRequestedAtDesc()
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeChangeRequestDtos.SummaryResponse> getPendingForHrAdmin() {
        return requestRepository.findByStatusOrderByRequestedAtDesc(EmployeeChangeRequestStatus.PENDING)
                .stream()
                .map(this::toSummary)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeChangeRequestDtos.DetailResponse getDetail(Long requestId) {
        EmployeeChangeRequest request = findRequest(requestId);

        return EmployeeChangeRequestDtos.DetailResponse.builder()
                .request(toSummary(request))
                .audits(auditRepository.findByRequestIdOrderByPerformedAtDesc(requestId)
                        .stream()
                        .map(this::toAuditResponse)
                        .toList())
                .build();
    }

    @Override
    @Transactional
    public EmployeeChangeRequestDtos.SummaryResponse createPositionChangeRequest(
            EmployeeChangeRequestDtos.PositionChangeCreateRequest request
    ) {
        if (request == null) {
            throw new BadRequestException("Position change request is required.");
        }

        if (request.getEmployeeId() == null) {
            throw new BadRequestException("Employee is required.");
        }

        if (request.getNewPositionId() == null) {
            throw new BadRequestException("New position is required.");
        }

        String reason = cleanRequiredReason(request.getReason(), "Please write the reason for this position change.");

        Employee employee = findEmployee(request.getEmployeeId());
        assertAllowedWorkforceTargetEmployee(employee);

        Position newPosition = positionRepository.findById(request.getNewPositionId())
                .orElseThrow(() -> new ResourceNotFoundException("New position not found."));
        assertAllowedWorkforceTargetPosition(newPosition);

        if (employee.getPosition() != null
                && employee.getPosition().getId() != null
                && employee.getPosition().getId().equals(newPosition.getId())) {
            throw new BadRequestException("This employee is already assigned to the selected position.");
        }

        assertNoPendingRequest(employee.getId(), EmployeeChangeRequestType.POSITION_CHANGE);

        ValidationResult validation = validateChangeAllowed(employee, EmployeeChangeRequestType.POSITION_CHANGE);

        User requester = currentUser();

        EmployeeChangeRequest changeRequest = new EmployeeChangeRequest();
        changeRequest.setEmployee(employee);
        changeRequest.setRequestType(EmployeeChangeRequestType.POSITION_CHANGE);
        changeRequest.setStatus(EmployeeChangeRequestStatus.PENDING);
        changeRequest.setRequestedByUser(requester);
        changeRequest.setRequestReason(reason);

        changeRequest.setOldPosition(employee.getPosition());
        changeRequest.setNewPosition(newPosition);

        DepartmentSnapshot snapshot = activeDepartmentSnapshot(employee.getId());
        changeRequest.setOldCurrentDepartment(snapshot.currentDepartment());
        changeRequest.setOldParentDepartment(snapshot.parentDepartment());
        changeRequest.setOldWorkingDepartment(snapshot.workingDepartment());

        changeRequest.setValidationSummary(validation.validationSummary());
        changeRequest.setBlockingSummary(null);

        EmployeeChangeRequest saved = requestRepository.save(changeRequest);
        saveAudit(saved, "CREATED", null, saved.getStatus(), requester, reason, "HR submitted a position change request.");

        return toSummary(saved);
    }

    @Override
    @Transactional
    public EmployeeChangeRequestDtos.SummaryResponse createDepartmentChangeRequest(
            EmployeeChangeRequestDtos.DepartmentChangeCreateRequest request
    ) {
        if (request == null) {
            throw new BadRequestException("Department change request is required.");
        }

        if (request.getEmployeeId() == null) {
            throw new BadRequestException("Employee is required.");
        }

        String reason = cleanRequiredReason(request.getReason(), "Please write the reason for this department change.");

        Employee employee = findEmployee(request.getEmployeeId());
        assertAllowedWorkforceTargetEmployee(employee);

        DepartmentSnapshot oldSnapshot = activeDepartmentSnapshot(employee.getId());

        Department newCurrentDepartment = request.getNewCurrentDepartmentId() == null
                ? oldSnapshot.currentDepartment()
                : departmentRepository.findById(request.getNewCurrentDepartmentId())
                .orElseThrow(() -> new ResourceNotFoundException("New current department not found."));

        if (newCurrentDepartment == null) {
            throw new BadRequestException("New current department is required when the employee has no current department yet.");
        }

        Department newParentDepartment = null;

        if (request.getNewParentDepartmentId() != null) {
            newParentDepartment = departmentRepository.findById(request.getNewParentDepartmentId())
                    .orElseThrow(() -> new ResourceNotFoundException("New parent department not found."));
        }

        Integer oldCurrentId = oldSnapshot.currentDepartment() == null ? null : oldSnapshot.currentDepartment().getId();
        Integer oldParentId = oldSnapshot.parentDepartment() == null ? null : oldSnapshot.parentDepartment().getId();
        Integer newParentId = newParentDepartment == null ? null : newParentDepartment.getId();

        if (oldCurrentId != null
                && oldCurrentId.equals(newCurrentDepartment.getId())
                && ((oldParentId == null && newParentId == null)
                || (oldParentId != null && oldParentId.equals(newParentId)))) {
            throw new BadRequestException("This employee is already assigned to the selected department structure.");
        }

        assertNoPendingRequest(employee.getId(), EmployeeChangeRequestType.DEPARTMENT_CHANGE);

        ValidationResult validation = validateChangeAllowed(employee, EmployeeChangeRequestType.DEPARTMENT_CHANGE);

        User requester = currentUser();

        EmployeeChangeRequest changeRequest = new EmployeeChangeRequest();
        changeRequest.setEmployee(employee);
        changeRequest.setRequestType(EmployeeChangeRequestType.DEPARTMENT_CHANGE);
        changeRequest.setStatus(EmployeeChangeRequestStatus.PENDING);
        changeRequest.setRequestedByUser(requester);
        changeRequest.setRequestReason(reason);

        changeRequest.setOldPosition(employee.getPosition());

        changeRequest.setOldCurrentDepartment(oldSnapshot.currentDepartment());
        changeRequest.setOldParentDepartment(oldSnapshot.parentDepartment());
        changeRequest.setOldWorkingDepartment(oldSnapshot.workingDepartment());

        changeRequest.setNewCurrentDepartment(newCurrentDepartment);
        changeRequest.setNewParentDepartment(newParentDepartment);
        changeRequest.setNewWorkingDepartment(newParentDepartment != null ? newParentDepartment : newCurrentDepartment);

        changeRequest.setValidationSummary(validation.validationSummary());
        changeRequest.setBlockingSummary(null);

        EmployeeChangeRequest saved = requestRepository.save(changeRequest);
        saveAudit(saved, "CREATED", null, saved.getStatus(), requester, reason, "HR submitted a department change request.");

        return toSummary(saved);
    }

    @Override
    @Transactional
    public EmployeeChangeRequestDtos.SummaryResponse approveByHrAdmin(
            Long requestId,
            EmployeeChangeRequestDtos.ReviewRequest reviewRequest
    ) {
        String reason = cleanRequiredReason(
                reviewRequest == null ? null : reviewRequest.getReason(),
                "HR Admin approval reason is required."
        );

        EmployeeChangeRequest request = findRequest(requestId);

        if (request.getStatus() != EmployeeChangeRequestStatus.PENDING) {
            throw new BadRequestException("Only pending employee change requests can be approved.");
        }

        /*
         * Re-check blockers at approval time.
         * This prevents HR Admin from approving a request that became unsafe after HR submitted it.
         */
        ValidationResult validation = validateChangeAllowed(request.getEmployee(), request.getRequestType());

        User reviewer = currentUser();

        EmployeeChangeRequestStatus oldStatus = request.getStatus();

        request.setStatus(EmployeeChangeRequestStatus.APPROVED);
        request.setReviewedByUser(reviewer);
        request.setReviewedAt(java.time.LocalDateTime.now());
        request.setCeoReviewReason(reason);
        request.setValidationSummary(validation.validationSummary());

        saveAudit(
                request,
                "APPROVED",
                oldStatus,
                EmployeeChangeRequestStatus.APPROVED,
                reviewer,
                reason,
                "HR Admin approved this workforce change request."
        );

        if (request.getRequestType() == EmployeeChangeRequestType.POSITION_CHANGE) {
            applyApprovedPositionChange(request, reviewer, reason);
        } else if (request.getRequestType() == EmployeeChangeRequestType.DEPARTMENT_CHANGE) {
            applyApprovedDepartmentChange(request, reviewer, reason);
        }

        EmployeeChangeRequestStatus approvedStatus = request.getStatus();
        request.setStatus(EmployeeChangeRequestStatus.APPLIED);

        saveAudit(
                request,
                "APPLIED",
                approvedStatus,
                EmployeeChangeRequestStatus.APPLIED,
                reviewer,
                reason,
                "Approved workforce change was applied to the employee profile."
        );

        EmployeeChangeRequest saved = requestRepository.save(request);
        notifyAfterDecision(saved, true);

        return toSummary(saved);
    }

    @Override
    @Transactional
    public EmployeeChangeRequestDtos.SummaryResponse rejectByHrAdmin(
            Long requestId,
            EmployeeChangeRequestDtos.ReviewRequest reviewRequest
    ) {
        String reason = cleanRequiredReason(
                reviewRequest == null ? null : reviewRequest.getReason(),
                "HR Admin rejection reason is required."
        );

        EmployeeChangeRequest request = findRequest(requestId);

        if (request.getStatus() != EmployeeChangeRequestStatus.PENDING) {
            throw new BadRequestException("Only pending employee change requests can be rejected.");
        }

        User reviewer = currentUser();
        EmployeeChangeRequestStatus oldStatus = request.getStatus();

        request.setStatus(EmployeeChangeRequestStatus.REJECTED);
        request.setReviewedByUser(reviewer);
        request.setReviewedAt(java.time.LocalDateTime.now());
        request.setCeoReviewReason(reason);

        saveAudit(
                request,
                "REJECTED",
                oldStatus,
                EmployeeChangeRequestStatus.REJECTED,
                reviewer,
                reason,
                "HR Admin rejected this workforce change request."
        );

        EmployeeChangeRequest saved = requestRepository.save(request);
        notifyAfterDecision(saved, false);

        return toSummary(saved);
    }

    private void applyApprovedPositionChange(
            EmployeeChangeRequest request,
            User ceo,
            String reason
    ) {
        Employee employee = request.getEmployee();

        if (employee == null || employee.getId() == null) {
            throw new BadRequestException("Employee is missing from this change request.");
        }

        Position oldPosition = employee.getPosition();
        Position newPosition = request.getNewPosition();

        if (newPosition == null || newPosition.getId() == null) {
            throw new BadRequestException("New position is missing from this change request.");
        }

        employee.setPosition(newPosition);
        employeeRepository.save(employee);

        saveEmployeeAudit(
                employee,
                "position",
                positionName(oldPosition),
                positionName(newPosition),
                ceo.getId(),
                reason
        );

        saveEmployeeAudit(
                employee,
                "position_level",
                positionLevelCode(oldPosition),
                positionLevelCode(newPosition),
                ceo.getId(),
                reason
        );

        saveEmployeeAudit(
                employee,
                "role",
                roleName(oldPosition),
                roleName(newPosition),
                ceo.getId(),
                reason
        );

        userRepository.findByEmployeeId(employee.getId()).ifPresent(user -> {
            user.setPosition(newPosition);
            user.setDashboard(
                    userAccountProvisioningService.resolveDashboardForEmployee(
                            newPosition,
                            roleName(newPosition),
                            null
                    )
            );
            user.setUpdatedAt(new Date());

            userRepository.save(user);
            syncUserRoleFromPosition(user, newPosition);
        });
    }

    private void applyApprovedDepartmentChange(
            EmployeeChangeRequest request,
            User ceo,
            String reason
    ) {
        Employee employee = request.getEmployee();

        if (employee == null || employee.getId() == null) {
            throw new BadRequestException("Employee is missing from this change request.");
        }

        Department oldCurrentDepartment = request.getOldCurrentDepartment();
        Department oldParentDepartment = request.getOldParentDepartment();
        Department oldWorkingDepartment = request.getOldWorkingDepartment();

        Department newCurrentDepartment = request.getNewCurrentDepartment();
        Department newParentDepartment = request.getNewParentDepartment();
        Department newWorkingDepartment = request.getNewWorkingDepartment();

        if (newCurrentDepartment == null || newCurrentDepartment.getId() == null) {
            throw new BadRequestException("New current department is missing from this change request.");
        }

        employeeDepartmentRepository.findActiveAssignmentsForEmployeeId(employee.getId())
                .forEach(active -> {
                    active.setEnddate(new Date());
                    employeeDepartmentRepository.save(active);
                });

        EmployeeDepartment newAssignment = new EmployeeDepartment();
        newAssignment.setEmployee(employee);
        newAssignment.setCurrentDepartment(newCurrentDepartment);
        newAssignment.setParentDepartment(newParentDepartment);
        newAssignment.setStartdate(new Date());
        newAssignment.setEnddate(null);
        newAssignment.setAssignBy("HR Admin Approval");

        employeeDepartmentRepository.save(newAssignment);

        if (employee.getEmployeeDepartments() != null) {
            employee.getEmployeeDepartments().add(newAssignment);
        }

        saveEmployeeAudit(
                employee,
                "current_department",
                departmentName(oldCurrentDepartment),
                departmentName(newCurrentDepartment),
                ceo.getId(),
                reason
        );

        saveEmployeeAudit(
                employee,
                "parent_department",
                departmentName(oldParentDepartment),
                departmentName(newParentDepartment),
                ceo.getId(),
                reason
        );

        saveEmployeeAudit(
                employee,
                "working_department",
                departmentName(oldWorkingDepartment),
                departmentName(newWorkingDepartment),
                ceo.getId(),
                reason
        );

        Integer workingDepartmentId = newWorkingDepartment != null
                ? newWorkingDepartment.getId()
                : newCurrentDepartment.getId();

        userRepository.findByEmployeeId(employee.getId()).ifPresent(user -> {
            user.setDepartmentId(workingDepartmentId);
            user.setUpdatedAt(new Date());
            userRepository.save(user);
        });
    }

    private void syncUserRoleFromPosition(User user, Position position) {
        if (user == null || user.getId() == null) {
            return;
        }

        Integer roleId = position != null && position.getRole() != null
                ? position.getRole().getId()
                : roleRepository.findByNameIgnoreCase("EMPLOYEE").map(Role::getId).orElse(null);

        if (roleId == null) {
            return;
        }

        userRoleRepository.deleteAll(userRoleRepository.findByUserId(user.getId()));

        UserRole userRole = new UserRole();
        userRole.setUserId(user.getId());
        userRole.setRoleId(roleId);

        userRoleRepository.save(userRole);
    }

    private void saveEmployeeAudit(
            Employee employee,
            String fieldName,
            String oldValue,
            String newValue,
            Integer editorId,
            String reason
    ) {
        if (employee == null
                || employee.getId() == null
                || Objects.equals(nullToBlank(oldValue), nullToBlank(newValue))) {
            return;
        }

        EmployeeAuditHistory history = new EmployeeAuditHistory();
        history.setEmployeeId(employee.getId());
        history.setFieldName(fieldName);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setEditedBy(editorId);
        history.setEditedAt(new Date());
        history.setReason(reason);

        employeeAuditHistoryRepository.save(history);
    }
    private void notifyAfterDecision(EmployeeChangeRequest request, boolean approved) {
        Employee employee = request.getEmployee();

        String typeLabel = readableType(request.getRequestType());
        String employeeLabel = employeeName(employee);
        String title = approved
                ? "Workforce change approved"
                : "Workforce change rejected";

        String message = approved
                ? employeeLabel + "'s " + typeLabel + " request was approved by HR Admin and applied."
                : employeeLabel + "'s " + typeLabel + " request was rejected by HR Admin. Reason: "
                + nullToBlank(request.getCeoReviewReason());

        Integer referenceId = request.getId() == null ? null : request.getId().intValue();

        if (request.getRequestedByUser() != null && request.getRequestedByUser().getId() != null) {
            notificationService.send(
                    request.getRequestedByUser().getId(),
                    title,
                    message,
                    "WORKFORCE_CHANGE",
                    referenceId
            );
        }

        if (employee != null && employee.getId() != null) {
            userRepository.findActiveByEmployeeId(employee.getId()).ifPresent(user ->
                    notificationService.send(
                            user.getId(),
                            title,
                            message,
                            "WORKFORCE_CHANGE",
                            referenceId
                    )
            );
        }
    }

    private String positionLevelCode(Position position) {
        if (position == null || position.getLevel() == null) {
            return null;
        }

        return position.getLevel().getLevelCode();
    }

    private String roleName(Position position) {
        if (position == null || position.getRole() == null || position.getRole().getName() == null) {
            return "EMPLOYEE";
        }

        return position.getRole().getName();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeChangeRequestDtos.EmployeeChangeProfileResponse getEmployeeChangeProfile(Integer employeeId) {
        if (employeeId == null) {
            throw new BadRequestException("Employee id is required.");
        }

        Employee employee = findEmployee(employeeId);
        User employeeUser = userRepository.findActiveByEmployeeId(employee.getId()).orElse(null);

        DepartmentSnapshot departmentSnapshot = activeDepartmentSnapshot(employee.getId());

        List<EmployeeKpiForm> kpis = employeeKpiFormRepository.findRecentByEmployeeIdWithDetail(employee.getId());
        List<EmployeeChangeRequestDtos.KpiSnapshot> kpiSnapshots = kpis
                .stream()
                .map(this::toKpiSnapshot)
                .toList();

        EmployeeChangeRequestDtos.KpiSnapshot currentOrLatestKpi = kpis
                .stream()
                .filter(kpi -> kpi.getStatus() != null && !CLOSED_KPI_STATUSES.contains(kpi.getStatus()))
                .findFirst()
                .map(this::toKpiSnapshot)
                .orElse(kpiSnapshots.isEmpty() ? null : kpiSnapshots.get(0));

        List<Pip> pips = employeeUser == null
                ? List.of()
                : pipRepository.findByEmployeeUserIdOrderByCreatedAtDesc(employeeUser.getId());

        List<EmployeeChangeRequestDtos.PipSnapshot> pipSnapshots = pips
                .stream()
                .map(this::toPipSnapshot)
                .toList();

        EmployeeChangeRequestDtos.PipSnapshot currentOrLatestPip = pips
                .stream()
                .filter(pip -> Boolean.TRUE.equals(pip.getStatus()))
                .findFirst()
                .map(this::toPipSnapshot)
                .orElse(pipSnapshots.isEmpty() ? null : pipSnapshots.get(0));

        List<EmployeeChangeRequestDtos.FeedbackSnapshot> feedbackSnapshots =
                continuousFeedbackRepository.findByEmployeeIdOrderByCreatedAtDesc(employee.getId())
                        .stream()
                        .map(this::toFeedbackSnapshot)
                        .toList();

        List<EmployeeChangeRequestDtos.DepartmentHistorySnapshot> departmentHistory =
                employeeDepartmentRepository.findHistoryByEmployeeId(employee.getId())
                        .stream()
                        .map(this::toDepartmentHistorySnapshot)
                        .toList();

        EmployeeChangeRequestDtos.DepartmentHistorySnapshot currentDepartmentAssignment =
                departmentHistory
                        .stream()
                        .filter(item -> Boolean.TRUE.equals(item.getActive()))
                        .findFirst()
                        .orElse(null);

        List<EmployeeChangeRequestDtos.TeamHistorySnapshot> teamHistory = buildTeamHistory(employeeUser);

        EmployeeChangeRequestDtos.TeamHistorySnapshot activeTeam =
                teamHistory
                        .stream()
                        .filter(item -> item.getEndedDate() == null || item.getEndedDate().isBlank())
                        .filter(item -> item.getStatus() == null || item.getStatus().equalsIgnoreCase("Active"))
                        .findFirst()
                        .orElse(null);

        List<EmployeeChangeRequestDtos.EmployeeAuditSnapshot> auditHistory =
                employeeAuditHistoryRepository.findByEmployeeIdOrderByEditedAtDesc(employee.getId())
                        .stream()
                        .map(this::toEmployeeAuditSnapshot)
                        .toList();

        EmployeeChangeRequestDtos.EmployeeSnapshot employeeSnapshot =
                EmployeeChangeRequestDtos.EmployeeSnapshot.builder()
                        .employeeId(employee.getId())
                        .employeeName(employeeName(employee))
                        .employeeEmail(employee.getEmail())
                        .userId(employeeUser == null ? null : employeeUser.getId())
                        .userEmail(employeeUser == null ? null : employeeUser.getEmail())
                        .positionId(employee.getPosition() == null ? null : employee.getPosition().getId())
                        .positionName(positionName(employee.getPosition()))
                        .positionLevel(positionLevelCode(employee.getPosition()))
                        .roleName(roleName(employee.getPosition()))
                        .currentDepartmentId(departmentSnapshot.currentDepartment() == null ? null : departmentSnapshot.currentDepartment().getId())
                        .currentDepartmentName(departmentName(departmentSnapshot.currentDepartment()))
                        .parentDepartmentId(departmentSnapshot.parentDepartment() == null ? null : departmentSnapshot.parentDepartment().getId())
                        .parentDepartmentName(departmentName(departmentSnapshot.parentDepartment()))
                        .workingDepartmentId(departmentSnapshot.workingDepartment() == null ? null : departmentSnapshot.workingDepartment().getId())
                        .workingDepartmentName(departmentName(departmentSnapshot.workingDepartment()))
                        .activeTeamName(activeTeam == null ? "No Active Team" : activeTeam.getTeamName())
                        .build();

        return EmployeeChangeRequestDtos.EmployeeChangeProfileResponse.builder()
                .employee(employeeSnapshot)
                .currentOrLatestKpi(currentOrLatestKpi)
                .allKpis(kpiSnapshots)
                .currentOrLatestPip(currentOrLatestPip)
                .allPips(pipSnapshots)
                .latestContinuousFeedback(feedbackSnapshots.isEmpty() ? null : feedbackSnapshots.get(0))
                .allContinuousFeedback(feedbackSnapshots)
                .activeTeam(activeTeam)
                .teamHistory(teamHistory)
                .currentDepartmentAssignment(currentDepartmentAssignment)
                .departmentHistory(departmentHistory)
                .auditHistory(auditHistory)
                .build();
    }

    private ValidationResult validateChangeAllowed(Employee employee, EmployeeChangeRequestType requestType) {
        List<String> blockers = new ArrayList<>();

        List<EmployeeKpiForm> openKpis = employeeKpiFormRepository.findOpenByEmployeeIdWithDetail(
                employee.getId(),
                CLOSED_KPI_STATUSES
        );

        if (!openKpis.isEmpty()) {
            blockers.add("This employee has active KPI work that is not finalized or closed.");
            notifyKpiOwnersForBlockedChange(employee, openKpis, requestType);
        }

        User employeeUser = userRepository.findActiveByEmployeeId(employee.getId()).orElse(null);

        if (employeeUser != null && pipRepository.existsByEmployeeUserIdAndStatusTrue(employeeUser.getId())) {
            blockers.add("This employee has an active PIP. Finish or close the PIP before requesting this change.");
        }

        if (employeeAppraisalFormRepository.existsByEmployeeIdAndStatusIn(employee.getId(), BLOCKING_APPRAISAL_STATUSES)) {
            blockers.add("This employee has an active appraisal workflow. Complete or reject the appraisal before requesting this change.");
        }

        if (employeeAssessmentRepository.existsByEmployeeIdAndStatusIn(employee.getId(), BLOCKING_ASSESSMENT_STATUSES)) {
            blockers.add("This employee has an active self-assessment workflow. Complete or close the self-assessment before requesting this change.");
        }

        List<String> activeTeams = activeTeamLabels(employeeUser);

        String teamNote = activeTeams.isEmpty()
                ? ""
                : " Note: this employee is currently connected to active team work: "
                + String.join(", ", activeTeams)
                + ". Existing team assignment will remain, but future team selection must follow current team eligibility.";

        if (!blockers.isEmpty()) {
            return new ValidationResult(
                    "Warning for HR Admin review: "
                            + String.join(" ", blockers)
                            + teamNote
            );
        }

        return new ValidationResult(
                "Ready for HR Admin approval. No active KPI, PIP, appraisal, or self-assessment blockers were found."
                        + teamNote
        );
    }

    private void notifyKpiOwnersForBlockedChange(
            Employee employee,
            List<EmployeeKpiForm> openKpis,
            EmployeeChangeRequestType requestType
    ) {
        String employeeName = employeeName(employee);
        String changeLabel = readableType(requestType);

        String title = "Workforce change blocked by active KPI";
        String message = employeeName + " has an active KPI that must be finalized before HR can request a "
                + changeLabel + ". Please review and finalize the KPI when it is ready.";

        LinkedHashSet<Integer> recipientIds = new LinkedHashSet<>();

        userRepository.findActiveByEmployeeId(employee.getId())
                .map(User::getId)
                .ifPresent(recipientIds::add);

        for (EmployeeKpiForm form : openKpis) {
            if (form.getEvaluators() != null) {
                form.getEvaluators().forEach(evaluator -> {
                    if (evaluator.getEvaluatorUser() != null && evaluator.getEvaluatorUser().getId() != null) {
                        recipientIds.add(evaluator.getEvaluatorUser().getId());
                    }
                });
            }
        }

        for (Integer userId : recipientIds) {
            notificationService.sendOnce(userId, title, message, "WORKFORCE_CHANGE", employee.getId());
        }
    }

    private List<String> activeTeamLabels(User employeeUser) {
        if (employeeUser == null || employeeUser.getId() == null) {
            return List.of();
        }

        LinkedHashSet<String> labels = new LinkedHashSet<>();

        teamMemberRepository.findActiveMembershipsByMemberUserId(employeeUser.getId())
                .forEach(member -> {
                    Team team = member.getTeam();
                    if (team != null) {
                        labels.add(teamLabel(team, "Member"));
                    }
                });

        teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(employeeUser.getId(), "Active")
                .forEach(team -> labels.add(teamLabel(team, "Team Leader")));

        teamRepository.findByProjectManagerIdAndStatusIgnoreCase(employeeUser.getId(), "Active")
                .forEach(team -> labels.add(teamLabel(team, "Project Manager")));

        return labels.stream().toList();
    }

    private String teamLabel(Team team, String role) {
        String name = team.getTeamName() == null || team.getTeamName().isBlank()
                ? "Team #" + team.getId()
                : team.getTeamName();

        return name + " (" + role + ")";
    }

    private String buildBlockerMessage(EmployeeChangeRequestType requestType, List<String> blockers) {
        String action = requestType == EmployeeChangeRequestType.POSITION_CHANGE
                ? "position change"
                : "department change";

        return "This employee cannot be submitted for " + action + " yet. "
                + String.join(" ", blockers);
    }

    private void assertNoPendingRequest(Integer employeeId, EmployeeChangeRequestType type) {
        boolean exists = requestRepository.existsByEmployeeIdAndRequestTypeAndStatus(
                employeeId,
                type,
                EmployeeChangeRequestStatus.PENDING
        );

        if (exists) {
            throw new BadRequestException("This employee already has a pending " + readableType(type) + " request.");
        }
    }

    private String cleanRequiredReason(String value, String message) {
        String clean = value == null ? "" : value.trim();

        if (clean.isBlank()) {
            throw new BadRequestException(message);
        }

        if (clean.length() < 10) {
            throw new BadRequestException("Reason must be at least 10 characters.");
        }

        return clean;
    }

    private void assertAllowedWorkforceTargetEmployee(Employee employee) {
        if (employee == null) {
            throw new BadRequestException("Employee is required.");
        }

        if (!isAllowedWorkforceTargetRole(roleName(employee.getPosition()))) {
            throw new BadRequestException(
                    "Workforce changes are allowed only for Employee and Manager roles."
            );
        }
    }

    private void assertAllowedWorkforceTargetPosition(Position position) {
        if (position == null) {
            throw new BadRequestException("Position is required.");
        }

        if (!isAllowedWorkforceTargetRole(roleName(position))) {
            throw new BadRequestException(
                    "Target position must be connected to Employee or Manager role."
            );
        }
    }

    private boolean isAllowedWorkforceTargetRole(String roleName) {
        return WORKFORCE_CHANGE_TARGET_ROLES.contains(normalizeRoleName(roleName));
    }

    private String normalizeRoleName(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        return value.trim()
                .toUpperCase()
                .replace('-', '_')
                .replace(' ', '_');
    }

    private Employee findEmployee(Integer employeeId) {
        return employeeRepository.findWithDepartmentsById(employeeId)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found."));
    }

    private EmployeeChangeRequest findRequest(Long requestId) {
        if (requestId == null) {
            throw new ResourceNotFoundException("Change request id is required.");
        }

        return requestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Change request not found."));
    }

    private User currentUser() {
        Integer userId = SecurityUtils.currentUserId();

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found."));
    }

    private DepartmentSnapshot activeDepartmentSnapshot(Integer employeeId) {
        return employeeDepartmentRepository.findActiveAssignmentsForEmployeeId(employeeId)
                .stream()
                .max(Comparator.comparing(EmployeeDepartment::getStartdate, Comparator.nullsLast(Comparator.naturalOrder())))
                .map(ed -> new DepartmentSnapshot(
                        ed.getCurrentDepartment(),
                        ed.getParentDepartment(),
                        ed.getParentDepartment() != null ? ed.getParentDepartment() : ed.getCurrentDepartment()
                ))
                .orElseGet(() -> new DepartmentSnapshot(null, null, null));
    }

    private void saveAudit(
            EmployeeChangeRequest request,
            String action,
            EmployeeChangeRequestStatus oldStatus,
            EmployeeChangeRequestStatus newStatus,
            User performer,
            String reason,
            String details
    ) {
        EmployeeChangeRequestAudit audit = new EmployeeChangeRequestAudit();
        audit.setRequest(request);
        audit.setAction(action);
        audit.setOldStatus(oldStatus);
        audit.setNewStatus(newStatus);
        audit.setPerformedByUser(performer);
        audit.setReason(reason);
        audit.setDetails(details);

        auditRepository.save(audit);
    }

    private boolean isAllowedWorkforceTargetEmployeeForList(Employee employee) {
        if (employee == null || Boolean.FALSE.equals(employee.getActive())) {
            return false;
        }

        return isAllowedWorkforceTargetRole(roleName(employee.getPosition()));
    }

    private boolean isAllowedWorkforceTargetPositionForList(Position position) {
        if (position == null || Boolean.FALSE.equals(position.getStatus())) {
            return false;
        }

        return isAllowedWorkforceTargetRole(roleName(position));
    }

    private EmployeeChangeRequestDtos.WorkforceEmployeeResponse toWorkforceEmployeeResponse(Employee employee) {
        User user = employee == null || employee.getId() == null
                ? null
                : userRepository.findActiveByEmployeeId(employee.getId()).orElse(null);

        Position position = employee == null ? null : employee.getPosition();
        DepartmentSnapshot snapshot = employee == null || employee.getId() == null
                ? new DepartmentSnapshot(null, null, null)
                : activeDepartmentSnapshot(employee.getId());

        Department currentDepartment = snapshot.currentDepartment();
        Department parentDepartment = snapshot.parentDepartment();
        Department workingDepartment = snapshot.workingDepartment();
        List<String> activeTeams = activeTeamLabels(user);
        String fullName = employeeName(employee);

        return EmployeeChangeRequestDtos.WorkforceEmployeeResponse.builder()
                .id(employee == null ? null : employee.getId())
                .employeeId(employee == null ? null : employee.getId())
                .userId(user == null ? null : user.getId())
                .firstName(employee == null ? null : employee.getFirstName())
                .lastName(employee == null ? null : employee.getLastName())
                .fullName(fullName)
                .name(fullName)
                .email(employee == null ? null : employee.getEmail())
                .workEmail(employee == null ? null : employee.getEmail())
                .positionId(position == null ? null : position.getId())
                .positionTitle(positionName(position))
                .positionName(positionName(position))
                .roleName(roleName(position))
                .role(roleName(position))
                .dashboard(user == null ? null : user.getDashboard())
                .currentDepartmentId(currentDepartment == null ? null : currentDepartment.getId())
                .departmentId(workingDepartment == null ? null : workingDepartment.getId())
                .departmentName(departmentName(workingDepartment))
                .currentDepartmentName(departmentName(currentDepartment))
                .parentDepartmentId(parentDepartment == null ? null : parentDepartment.getId())
                .parentDepartmentName(departmentName(parentDepartment))
                .workingDepartmentId(workingDepartment == null ? null : workingDepartment.getId())
                .workingDepartmentName(departmentName(workingDepartment))
                .teamName(activeTeams.isEmpty() ? null : String.join(", ", activeTeams))
                .activeTeamName(activeTeams.isEmpty() ? null : String.join(", ", activeTeams))
                .active(employee == null ? null : !Boolean.FALSE.equals(employee.getActive()))
                .build();
    }

    private EmployeeChangeRequestDtos.WorkforcePositionResponse toWorkforcePositionResponse(Position position) {
        return EmployeeChangeRequestDtos.WorkforcePositionResponse.builder()
                .id(position == null ? null : position.getId())
                .positionTitle(positionName(position))
                .title(positionName(position))
                .positionName(positionName(position))
                .levelCode(positionLevelCode(position))
                .roleName(roleName(position))
                .status(position == null ? null : !Boolean.FALSE.equals(position.getStatus()))
                .build();
    }

    private EmployeeChangeRequestDtos.WorkforceDepartmentResponse toWorkforceDepartmentResponse(Department department) {
        return EmployeeChangeRequestDtos.WorkforceDepartmentResponse.builder()
                .id(department == null ? null : department.getId())
                .departmentName(departmentName(department))
                .name(departmentName(department))
                .departmentCode(department == null ? null : department.getDepartmentCode())
                .status(department == null ? null : !Boolean.FALSE.equals(department.getStatus()))
                .build();
    }

    private EmployeeChangeRequestDtos.SummaryResponse toSummary(EmployeeChangeRequest request) {
        if (request == null) {
            return null;
        }

        Employee employee = request.getEmployee();

        return EmployeeChangeRequestDtos.SummaryResponse.builder()
                .id(request.getId())
                .requestType(request.getRequestType())
                .status(request.getStatus())
                .employeeId(employee == null ? null : employee.getId())
                .employeeName(employeeName(employee))
                .employeeEmail(employee == null ? null : employee.getEmail())
                .requestedByName(userName(request.getRequestedByUser()))
                .reviewedByName(userName(request.getReviewedByUser()))
                .requestedAt(request.getRequestedAt())
                .reviewedAt(request.getReviewedAt())
                .oldPositionName(positionName(request.getOldPosition()))
                .newPositionName(positionName(request.getNewPosition()))
                .oldCurrentDepartmentName(departmentName(request.getOldCurrentDepartment()))
                .newCurrentDepartmentName(departmentName(request.getNewCurrentDepartment()))
                .oldParentDepartmentName(departmentName(request.getOldParentDepartment()))
                .newParentDepartmentName(departmentName(request.getNewParentDepartment()))
                .oldWorkingDepartmentName(departmentName(request.getOldWorkingDepartment()))
                .newWorkingDepartmentName(departmentName(request.getNewWorkingDepartment()))
                .oldTeamName(request.getOldTeamName())
                .requestReason(request.getRequestReason())
                .hrAdminReviewReason(request.getCeoReviewReason())
                .ceoReviewReason(request.getCeoReviewReason())
                .validationSummary(request.getValidationSummary())
                .blockingSummary(request.getBlockingSummary())
                .build();
    }

    private EmployeeChangeRequestDtos.AuditResponse toAuditResponse(EmployeeChangeRequestAudit audit) {
        return EmployeeChangeRequestDtos.AuditResponse.builder()
                .id(audit.getId())
                .action(audit.getAction())
                .oldStatus(audit.getOldStatus())
                .newStatus(audit.getNewStatus())
                .performedByName(userName(audit.getPerformedByUser()))
                .performedAt(audit.getPerformedAt())
                .reason(audit.getReason())
                .details(audit.getDetails())
                .build();
    }

    private EmployeeChangeRequestDtos.KpiSnapshot toKpiSnapshot(EmployeeKpiForm form) {
        if (form == null) {
            return null;
        }

        String title = form.getKpiForm() == null ? "KPI #" + form.getId() : form.getKpiForm().getTitle();
        String cycleName = form.getKpiTemplateCycle() == null ? "-" : form.getKpiTemplateCycle().getCycleName();

        String periodName = "-";
        if (form.getCyclePeriod() != null && form.getCyclePeriod().getPeriodNumber() != null) {
            periodName = "Period " + form.getCyclePeriod().getPeriodNumber();
        }

        return EmployeeChangeRequestDtos.KpiSnapshot.builder()
                .id(form.getId())
                .title(title)
                .status(form.getStatus() == null ? "-" : form.getStatus().name())
                .cycleName(cycleName)
                .periodName(periodName)
                .assignedAt(stringValue(form.getAssignedAt()))
                .finalizedAt(stringValue(form.getFinalizedAt()))
                .totalScore(form.getTotalScore())
                .totalWeightedScore(form.getTotalWeightedScore())
                .build();
    }

    private EmployeeChangeRequestDtos.PipSnapshot toPipSnapshot(Pip pip) {
        if (pip == null) {
            return null;
        }

        return EmployeeChangeRequestDtos.PipSnapshot.builder()
                .id(pip.getId())
                .goal(pip.getGoal())
                .expectedOutcomes(pip.getExpectedOutcomes())
                .comments(pip.getComments())
                .active(pip.getStatus())
                .startDate(stringValue(pip.getStartDate()))
                .endDate(stringValue(pip.getEndDate()))
                .createdAt(stringValue(pip.getCreatedAt()))
                .finishedAt(stringValue(pip.getFinishedAt()))
                .phaseCount(pip.getPhases() == null ? 0 : pip.getPhases().size())
                .build();
    }

    private EmployeeChangeRequestDtos.FeedbackSnapshot toFeedbackSnapshot(ContinuousFeedback feedback) {
        if (feedback == null) {
            return null;
        }

        return EmployeeChangeRequestDtos.FeedbackSnapshot.builder()
                .id(feedback.getId())
                .category(feedback.getCategory())
                .rating(feedback.getRating())
                .feedbackText(feedback.getFeedbackText())
                .giverName(userName(feedback.getGiverUser()))
                .teamName(feedback.getTeam() == null ? "-" : feedback.getTeam().getTeamName())
                .createdAt(stringValue(feedback.getCreatedAt()))
                .build();
    }

    private EmployeeChangeRequestDtos.DepartmentHistorySnapshot toDepartmentHistorySnapshot(EmployeeDepartment department) {
        if (department == null) {
            return null;
        }

        Department current = department.getCurrentDepartment();
        Department parent = department.getParentDepartment();
        Department working = parent != null ? parent : current;

        return EmployeeChangeRequestDtos.DepartmentHistorySnapshot.builder()
                .id(department.getId())
                .currentDepartmentId(current == null ? null : current.getId())
                .currentDepartmentName(departmentName(current))
                .parentDepartmentId(parent == null ? null : parent.getId())
                .parentDepartmentName(departmentName(parent))
                .workingDepartmentId(working == null ? null : working.getId())
                .workingDepartmentName(departmentName(working))
                .startDate(stringValue(department.getStartdate()))
                .endDate(stringValue(department.getEnddate()))
                .assignedBy(department.getAssignBy())
                .active(department.getEnddate() == null)
                .build();
    }

    private List<EmployeeChangeRequestDtos.TeamHistorySnapshot> buildTeamHistory(User employeeUser) {
        if (employeeUser == null || employeeUser.getId() == null) {
            return List.of();
        }

        Map<String, EmployeeChangeRequestDtos.TeamHistorySnapshot> results = new HashMap<>();

        teamMemberRepository.findByMemberUserId(employeeUser.getId()).forEach(member -> {
            Team team = member.getTeam();

            if (team == null) {
                return;
            }

            String key = "MEMBER-" + team.getId() + "-" + stringValue(member.getStartedDate()) + "-" + stringValue(member.getEndedDate());

            results.put(key, EmployeeChangeRequestDtos.TeamHistorySnapshot.builder()
                    .teamId(team.getId())
                    .teamName(team.getTeamName())
                    .roleInTeam("Member")
                    .departmentName(team.getDepartment() == null ? "-" : team.getDepartment().getDepartmentName())
                    .status(team.getStatus())
                    .startedDate(stringValue(member.getStartedDate()))
                    .endedDate(stringValue(member.getEndedDate()))
                    .build());
        });

        teamRepository.findByTeamLeaderId(employeeUser.getId()).forEach(team -> {
            String key = "LEADER-" + team.getId();

            results.put(key, EmployeeChangeRequestDtos.TeamHistorySnapshot.builder()
                    .teamId(team.getId())
                    .teamName(team.getTeamName())
                    .roleInTeam("Team Leader")
                    .departmentName(team.getDepartment() == null ? "-" : team.getDepartment().getDepartmentName())
                    .status(team.getStatus())
                    .startedDate(stringValue(team.getCreatedDate()))
                    .endedDate(team.isActiveTeam() ? null : "Inactive")
                    .build());
        });

        teamRepository.findByProjectManagerId(employeeUser.getId()).forEach(team -> {
            String key = "PM-" + team.getId();

            results.put(key, EmployeeChangeRequestDtos.TeamHistorySnapshot.builder()
                    .teamId(team.getId())
                    .teamName(team.getTeamName())
                    .roleInTeam("Project Manager")
                    .departmentName(team.getDepartment() == null ? "-" : team.getDepartment().getDepartmentName())
                    .status(team.getStatus())
                    .startedDate(stringValue(team.getCreatedDate()))
                    .endedDate(team.isActiveTeam() ? null : "Inactive")
                    .build());
        });

        return results.values()
                .stream()
                .toList();
    }

    private EmployeeChangeRequestDtos.EmployeeAuditSnapshot toEmployeeAuditSnapshot(EmployeeAuditHistory history) {
        if (history == null) {
            return null;
        }

        String editorName = "-";

        if (history.getEditedBy() != null) {
            editorName = userRepository.findById(history.getEditedBy())
                    .map(this::userName)
                    .orElse("User #" + history.getEditedBy());
        }

        return EmployeeChangeRequestDtos.EmployeeAuditSnapshot.builder()
                .id(history.getId())
                .fieldName(history.getFieldName())
                .oldValue(history.getOldValue())
                .newValue(history.getNewValue())
                .editedByName(editorName)
                .editedAt(stringValue(history.getEditedAt()))
                .reason(history.getReason())
                .build();
    }

    private String stringValue(Object value) {
        return value == null ? null : String.valueOf(value);
    }

    private String employeeName(Employee employee) {
        if (employee == null) {
            return "-";
        }

        String fullName = ((employee.getFirstName() == null ? "" : employee.getFirstName()) + " "
                + (employee.getLastName() == null ? "" : employee.getLastName())).trim();

        return fullName.isBlank() ? employee.getEmail() : fullName;
    }

    private String userName(User user) {
        if (user == null) {
            return "-";
        }

        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }

        return user.getEmail();
    }

    private String positionName(Position position) {
        return position == null ? "-" : position.getPositionTitle();
    }

    private String departmentName(Department department) {
        return department == null ? "-" : department.getDepartmentName();
    }

    private String readableType(EmployeeChangeRequestType type) {
        return switch (type) {
            case POSITION_CHANGE -> "position change";
            case DEPARTMENT_CHANGE -> "department change";
        };
    }

    private record DepartmentSnapshot(
            Department currentDepartment,
            Department parentDepartment,
            Department workingDepartment
    ) {
    }

    private record ValidationResult(String validationSummary) {
    }
}