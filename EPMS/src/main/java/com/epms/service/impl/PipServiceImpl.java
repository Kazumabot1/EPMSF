
package com.epms.service.impl;

import com.epms.dto.PipCreateRequestDto;
import com.epms.dto.PipDetailResponseDto;
import com.epms.dto.PipEligibleEmployeeDto;
import com.epms.dto.PipFinishRequestDto;
import com.epms.dto.PipPhaseRequestDto;
import com.epms.dto.PipPhaseResponseDto;
import com.epms.dto.PipPhaseUpdateRequestDto;
import com.epms.dto.PipUpdateHistoryDto;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.Pip;
import com.epms.entity.PipPhase;
import com.epms.entity.PipUpdate;
import com.epms.entity.Role;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.notification.NotificationEventKey;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.PipPhaseRepository;
import com.epms.repository.PipRepository;
import com.epms.repository.PipUpdateRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.NotificationService;
import com.epms.service.PipService;
import com.epms.service.PositionPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

/**
 * Why this file is fixed:
 * - Adds department name into PIP response so frontend can show it in cards/details.
 * - PIP employee dropdown now includes department name.
 * - Department Head PIP selection now uses employee working department:
 *      parentdepartment if present, otherwise currentdepartment.
 * - PIP creator can still always view/edit their own created PIPs.
 */
@Service
@RequiredArgsConstructor
public class PipServiceImpl implements PipService {

    private static final int WORD_LIMIT = 1000;
    private static final int MAX_PHASE_COUNT = 12;

    private static final Set<String> PHASE_STATUSES = Set.of(
            "HASNT_STARTED_YET",
            "ONGOING",
            "COMPLETED"
    );

    private static final DateTimeFormatter NOTIFICATION_DATE =
            DateTimeFormatter.ofPattern("h:mm a d.M.yyyy");

    private final PipRepository pipRepository;
    private final PipPhaseRepository pipPhaseRepository;
    private final PipUpdateRepository pipUpdateRepository;
    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final TeamRepository teamRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final DepartmentRepository departmentRepository;
    private final NotificationService notificationService;
    private final PositionPermissionService positionPermissionService;

    @Override
    public List<PipEligibleEmployeeDto> getEligibleEmployees() {
        User currentUser = getCurrentUser();

        if (isHr(currentUser)) {
            if (!positionPermissionService.currentUserHasPermission("pipCreate")) {
                return List.of();
            }

            return userRepository.findAll()
                    .stream()
                    .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
                    .filter(this::hasActiveEmployeeRecord)
                    .map(this::toEligibleEmployee)
                    .sorted(Comparator.comparing(PipEligibleEmployeeDto::getEmployeeName, String.CASE_INSENSITIVE_ORDER))
                    .toList();
        }

        List<User> candidates;

        if (isDepartmentHead(currentUser)) {
            if (currentUser.getDepartmentId() == null) {
                return List.of();
            }

            candidates = employeeDepartmentRepository
                    .findActiveUsersByWorkingDepartmentId(currentUser.getDepartmentId())
                    .stream()
                    .filter(user -> !isActiveMemberOfAnyTeam(user))
                    .toList();
        } else {
            candidates = getManagedTeamUsers(currentUser.getId());
        }

        return candidates.stream()
                .filter(user -> !Objects.equals(user.getId(), currentUser.getId()))
                .filter(this::hasActiveEmployeeRecord)
                .map(this::toEligibleEmployee)
                .sorted(Comparator.comparing(PipEligibleEmployeeDto::getEmployeeName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Override
    @Transactional
    public PipDetailResponseDto createPip(PipCreateRequestDto requestDto) {
        User currentUser = getCurrentUser();
        positionPermissionService.assertCurrentUserHasPermission("pipCreate");
        User employee = getUser(requestDto.getEmployeeUserId(), "Employee user not found.");

        if (!hasActiveEmployeeRecord(employee)) {
            throw new BusinessValidationException("Inactive employees cannot be selected for PIP.");
        }

        if (pipRepository.existsByEmployeeUserIdAndStatusTrue(employee.getId())) {
            throw new BusinessValidationException("This employee already has an active PIP currently.");
        }

        assertCanManageEmployee(currentUser, employee);
        validateCreateRequest(requestDto);

        Pip pip = new Pip();
        pip.setEmployeeUserId(employee.getId());
        pip.setCreatedByUserId(currentUser.getId());
        pip.setGoal(clean(requestDto.getGoal()));
        pip.setExpectedOutcomes(clean(requestDto.getExpectedOutcomes()));
        pip.setStartDate(requestDto.getStartDate());
        pip.setEndDate(requestDto.getEndDate());
        pip.setStatus(true);
        pip.setCreatedAt(LocalDateTime.now());

        for (PipPhaseRequestDto phaseRequest : requestDto.getPhases()) {
            PipPhase phase = new PipPhase();
            phase.setPhaseNumber(phaseRequest.getPhaseNumber());
            phase.setPhaseGoal(clean(phaseRequest.getPhaseGoal()));
            phase.setStartDate(phaseRequest.getStartDate());
            phase.setEndDate(phaseRequest.getEndDate());
            phase.setStatus("HASNT_STARTED_YET");
            phase.setCreatedAt(LocalDateTime.now());
            pip.addPhase(phase);
        }

        Pip saved = pipRepository.save(pip);

        addHistory(
                saved.getId(),
                null,
                "PIP_CREATED",
                null,
                "Created",
                "PIP created",
                currentUser.getId(),
                null
        );

        notificationService.sendEvent(
                employee.getId(),
                NotificationEventKey.PIP_CREATED,
                "PIP Created",
                displayName(currentUser) + " (" + positionName(currentUser) + ") created a PIP for you at "
                        + LocalDateTime.now().format(NOTIFICATION_DATE)
                        + ". The PIP will begin on " + saved.getStartDate() + ".",
                "PIP"
        );

        notificationService.sendEvent(
                currentUser.getId(),
                NotificationEventKey.PIP_CREATOR_CONFIRMATION,
                "PIP Created",
                "You created a PIP for " + displayName(employee)
                        + ". The PIP will begin on " + saved.getStartDate() + ".",
                "PIP"
        );

        return toDetail(saved, currentUser);
    }

    @Override
    public List<PipDetailResponseDto> getOngoingPips() {
        User currentUser = getCurrentUser();

        return filterVisible(pipRepository.findByStatusTrueOrderByCreatedAtDesc(), currentUser)
                .stream()
                .map(pip -> toDetail(pip, currentUser))
                .toList();
    }

    @Override
    public List<PipDetailResponseDto> getPastPips() {
        User currentUser = getCurrentUser();

        return filterVisible(pipRepository.findByStatusFalseOrderByEndDateDesc(), currentUser)
                .stream()
                .map(pip -> toDetail(pip, currentUser))
                .toList();
    }

    @Override
    public PipDetailResponseDto getPipById(Integer id) {
        User currentUser = getCurrentUser();
        Pip pip = getPip(id);

        if (!canView(currentUser, pip)) {
            throw new AccessDeniedException("You are not allowed to view this PIP.");
        }

        return toDetail(pip, currentUser);
    }

    @Override
    @Transactional
    public PipDetailResponseDto updatePhase(Integer pipId, Integer phaseId, PipPhaseUpdateRequestDto requestDto) {
        User currentUser = getCurrentUser();
        positionPermissionService.assertCurrentUserHasPermission("pipEdit");
        Pip pip = getPip(pipId);

        if (!Boolean.TRUE.equals(pip.getStatus())) {
            throw new BusinessValidationException("Finished PIPs are view-only and cannot be edited.");
        }

        if (!canEdit(currentUser, pip)) {
            throw new AccessDeniedException("You are not allowed to update this PIP.");
        }

        String newStatus = normalizePhaseStatus(requestDto.getStatus());
        String reason = cleanNullable(requestDto.getReasonNote());

        if (reason != null) {
            assertWordLimit(reason, "Reason/Note");
        }

        PipPhase phase = pipPhaseRepository.findById(phaseId)
                .orElseThrow(() -> new ResourceNotFoundException("PIP phase not found."));

        if (phase.getPip() == null || !Objects.equals(phase.getPip().getId(), pipId)) {
            throw new BusinessValidationException("Selected phase does not belong to this PIP.");
        }

        if (phase.getStartDate() != null && LocalDate.now().isBefore(phase.getStartDate())) {
            throw new BusinessValidationException("This PIP phase has not started yet. You can update it from " + phase.getStartDate() + ".");
        }

        String oldValue = phase.getStatus() + " | " + nullToBlank(phase.getReasonNote());

        phase.setStatus(newStatus);
        phase.setReasonNote(reason);
        phase.setUpdatedAt(LocalDateTime.now());
        phase.setUpdatedByUserId(currentUser.getId());
        pipPhaseRepository.save(phase);

        String newValue = newStatus + " | " + nullToBlank(reason);

        addHistory(
                pipId,
                phaseId,
                "PHASE_UPDATED",
                oldValue,
                newValue,
                reason,
                currentUser.getId(),
                newStatus
        );

        pip.setUpdatedAt(LocalDateTime.now());
        pipRepository.save(pip);

        User pipEmployee = getUser(pip.getEmployeeUserId(), "Employee user not found.");

        StringBuilder phaseNote = new StringBuilder();
        phaseNote.append("Phase ").append(phase.getPhaseNumber()).append(" of your PIP");

        String goalPrev = pipGoalPreview(pip.getGoal());
        if (!goalPrev.isEmpty()) {
            phaseNote.append(" \"").append(goalPrev).append("\"");
        }

        phaseNote.append(" was updated to ").append(phaseStatusForNotification(newStatus)).append(".");

        if (reason != null && !reason.isBlank()) {
            String note = reason.length() > 300 ? reason.substring(0, 297).trim() + "..." : reason;
            phaseNote.append(" Note: ").append(note);
        }

        notificationService.sendEvent(
                pipEmployee.getId(),
                NotificationEventKey.PIP_PHASE_UPDATED,
                "PIP Phase Updated",
                phaseNote.toString(),
                "PIP"
        );

        return toDetail(getPip(pipId), currentUser);
    }

    @Override
    @Transactional
    public PipDetailResponseDto finishPip(Integer id, PipFinishRequestDto requestDto) {
        User currentUser = getCurrentUser();
        positionPermissionService.assertCurrentUserHasPermission("pipEdit");
        Pip pip = getPip(id);

        if (!Boolean.TRUE.equals(pip.getStatus())) {
            throw new BusinessValidationException("This PIP is already finished.");
        }

        if (!canEdit(currentUser, pip)) {
            throw new AccessDeniedException("You are not allowed to finish this PIP.");
        }

        if (LocalDate.now().isBefore(pip.getEndDate())) {
            throw new BusinessValidationException("FINISH is available only after the PIP end date.");
        }

        String comments = clean(requestDto.getComments());
        assertWordLimit(comments, "Final comments");

        pip.setComments(comments);
        pip.setStatus(false);
        pip.setFinishedAt(LocalDateTime.now());
        pip.setFinishedByUserId(currentUser.getId());
        pip.setUpdatedAt(LocalDateTime.now());

        Pip saved = pipRepository.save(pip);

        addHistory(
                id,
                null,
                "PIP_FINISHED",
                "active",
                "finished",
                comments,
                currentUser.getId(),
                "FINISHED"
        );

        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");

        notificationService.sendEvent(
                employee.getId(),
                NotificationEventKey.PIP_ENDED,
                "PIP Ended",
                "Your PIP \"" + pip.getGoal() + "\" has been finished by "
                        + displayName(currentUser) + " (" + positionName(currentUser) + ").",
                "PIP"
        );

        notificationService.sendEvent(
                currentUser.getId(),
                NotificationEventKey.PIP_CREATOR_CONFIRMATION,
                "PIP Ended",
                "You finished the PIP for " + displayName(employee) + ".",
                "PIP"
        );

        return toDetail(saved, currentUser);
    }

    private void validateCreateRequest(PipCreateRequestDto request) {
        LocalDate today = LocalDate.now();

        if (request.getStartDate().isBefore(today)) {
            throw new BusinessValidationException("PIP start date cannot be in the past.");
        }

        if (request.getEndDate().isBefore(today)) {
            throw new BusinessValidationException("PIP end date cannot be in the past.");
        }

        if (!request.getEndDate().isAfter(request.getStartDate())) {
            throw new BusinessValidationException("PIP end date must be after start date.");
        }

        assertWordLimit(request.getGoal(), "PIP goal");
        assertWordLimit(request.getExpectedOutcomes(), "Expected outcomes");

        List<PipPhaseRequestDto> phases = request.getPhases().stream()
                .sorted(Comparator.comparing(PipPhaseRequestDto::getPhaseNumber))
                .toList();
        if (phases.isEmpty()) {
            throw new BusinessValidationException("At least one phase is required.");
        }

        if (phases.size() > MAX_PHASE_COUNT) {
            throw new BusinessValidationException("PIP can have at most " + MAX_PHASE_COUNT + " phases.");
        }


        LocalDate previousEnd = null;
        int expectedNumber = 1;

        for (PipPhaseRequestDto phase : phases) {
            if (!Objects.equals(phase.getPhaseNumber(), expectedNumber++)) {
                throw new BusinessValidationException("Phase numbers must be sequential starting from 1.");
            }

            assertWordLimit(phase.getPhaseGoal(), "Phase " + phase.getPhaseNumber() + " goal");

            if (phase.getStartDate().isBefore(today)) {
                throw new BusinessValidationException("Phase start date cannot be in the past.");
            }

            if (!phase.getEndDate().isAfter(phase.getStartDate())) {
                throw new BusinessValidationException("Phase end date must be after phase start date.");
            }

            if (phase.getStartDate().isBefore(request.getStartDate()) || phase.getEndDate().isAfter(request.getEndDate())) {
                throw new BusinessValidationException("Phase dates must be inside the PIP start and end dates.");
            }

            if (previousEnd != null && phase.getStartDate().isBefore(previousEnd)) {
                throw new BusinessValidationException("Next phase start date cannot be before previous phase end date.");
            }

            previousEnd = phase.getEndDate();
        }
    }

    private void assertCanManageEmployee(User manager, User employee) {
        if (manager == null || employee == null) {
            throw new BusinessValidationException("Invalid PIP users.");
        }

        if (Objects.equals(manager.getId(), employee.getId())) {
            throw new BusinessValidationException("You cannot create a PIP for yourself.");
        }

        if (isHr(manager)) {
            return;
        }

        if (isDepartmentHead(manager)) {
            if (manager.getDepartmentId() == null) {
                throw new BusinessValidationException("Department Head has no assigned department.");
            }

            boolean belongs = employeeDepartmentRepository.existsActiveUserInWorkingDepartment(
                    employee.getId(),
                    manager.getDepartmentId()
            );

            if (!belongs) {
                throw new BusinessValidationException("Department Head can create PIP only for employees in their own department.");
            }

            if (isActiveMemberOfAnyTeam(employee)) {
                throw new BusinessValidationException("Department Head can create PIP only for employees who do not have an active team.");
            }

            return;
        }

        if (!canManageByTeam(manager, employee)) {
            throw new BusinessValidationException("Manager or Team Leader can create PIP only for employees in their own team.");
        }
    }

    private List<Pip> filterVisible(List<Pip> pips, User currentUser) {
        return pips.stream()
                .filter(pip -> canView(currentUser, pip))
                .toList();
    }

    private boolean canView(User currentUser, Pip pip) {
        if (isHr(currentUser)) {
            return true;
        }

        if (Objects.equals(currentUser.getId(), pip.getEmployeeUserId())) {
            return true;
        }

        if (Objects.equals(currentUser.getId(), pip.getCreatedByUserId())) {
            return true;
        }

        return canEdit(currentUser, pip);
    }

    private boolean canEdit(User currentUser, Pip pip) {
        if (isHr(currentUser)) {
            return false;
        }

        if (Objects.equals(currentUser.getId(), pip.getEmployeeUserId())) {
            return false;
        }

        if (!positionPermissionService.currentUserHasPermission("pipEdit")) {
            return false;
        }

        if (Objects.equals(currentUser.getId(), pip.getCreatedByUserId())) {
            return true;
        }

        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");

        try {
            assertCanManageEmployee(currentUser, employee);
            return true;
        } catch (RuntimeException ex) {
            return false;
        }
    }

    private PipDetailResponseDto toDetail(Pip pip, User viewer) {
        User employee = getUser(pip.getEmployeeUserId(), "Employee user not found.");
        User creator = getUser(pip.getCreatedByUserId(), "Creator user not found.");

        User finishedBy = null;
        if (pip.getFinishedByUserId() != null) {
            finishedBy = userRepository.findById(pip.getFinishedByUserId()).orElse(null);
        }

        List<PipPhaseResponseDto> phaseDtos = pip.getPhases() == null
                ? List.of()
                : pip.getPhases().stream()
                  .sorted(Comparator.comparing(PipPhase::getPhaseNumber))
                  .map(this::toPhaseDto)
                  .toList();

        List<PipUpdateHistoryDto> updateDtos = pipUpdateRepository.findByPipIdOrderByUpdatedAtDesc(pip.getId())
                .stream()
                .map(this::toHistoryDto)
                .toList();

        boolean editable = Boolean.TRUE.equals(pip.getStatus()) && canEdit(viewer, pip);
        boolean finishable = editable && !LocalDate.now().isBefore(pip.getEndDate());

        return new PipDetailResponseDto(
                pip.getId(),
                pip.getEmployeeUserId(),
                displayName(employee),
                getWorkingDepartmentName(employee.getId()),
                pip.getCreatedByUserId(),
                displayName(creator),
                positionName(creator),
                pip.getGoal(),
                pip.getExpectedOutcomes(),
                pip.getComments(),
                pip.getStartDate(),
                pip.getEndDate(),
                pip.getStatus(),
                pip.getCreatedAt(),
                pip.getUpdatedAt(),
                pip.getFinishedAt(),
                pip.getFinishedByUserId(),
                finishedBy == null ? null : displayName(finishedBy),
                editable,
                finishable,
                phaseDtos,
                updateDtos
        );
    }

    private PipPhaseResponseDto toPhaseDto(PipPhase phase) {
        User updatedBy = null;

        if (phase.getUpdatedByUserId() != null) {
            updatedBy = userRepository.findById(phase.getUpdatedByUserId()).orElse(null);
        }

        return new PipPhaseResponseDto(
                phase.getId(),
                phase.getPhaseNumber(),
                phase.getPhaseGoal(),
                phase.getStartDate(),
                phase.getEndDate(),
                phase.getStatus(),
                phase.getReasonNote(),
                phase.getUpdatedAt(),
                phase.getUpdatedByUserId(),
                updatedBy == null ? null : displayName(updatedBy)
        );
    }

    private PipUpdateHistoryDto toHistoryDto(PipUpdate update) {
        User updatedBy = null;

        if (update.getUpdatedBy() != null) {
            updatedBy = userRepository.findById(update.getUpdatedBy()).orElse(null);
        }

        return new PipUpdateHistoryDto(
                update.getId(),
                update.getPhaseId(),
                update.getActionType(),
                update.getOldValue(),
                update.getNewValue(),
                update.getComments(),
                update.getUpdatedBy(),
                updatedBy == null ? null : displayName(updatedBy),
                update.getUpdatedAt()
        );
    }

    private void addHistory(
            Integer pipId,
            Integer phaseId,
            String actionType,
            String oldValue,
            String newValue,
            String comments,
            Integer updatedBy,
            String status
    ) {
        PipUpdate history = new PipUpdate();
        history.setPipId(pipId);
        history.setPhaseId(phaseId);
        history.setActionType(actionType);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setComments(comments);
        history.setUpdatedBy(updatedBy);
        history.setUpdatedAt(LocalDateTime.now());
        history.setStatus(status);

        pipUpdateRepository.save(history);
    }

    private PipEligibleEmployeeDto toEligibleEmployee(User user) {
        boolean hasActivePip = pipRepository.existsByEmployeeUserIdAndStatusTrue(user.getId());
        String departmentName = getWorkingDepartmentName(user.getId());

        return new PipEligibleEmployeeDto(
                user.getId(),
                displayName(user),
                user.getDepartmentId(),
                departmentName,
                hasActivePip,
                hasActivePip ? "Already have PIP currently" : null
        );
    }

    private Pip getPip(Integer id) {
        return pipRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("PIP not found."));
    }

    private User getCurrentUser() {
        return getUser(SecurityUtils.currentUserId(), "Current user not found.");
    }

    private User getUser(Integer id, String errorMessage) {
        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException(errorMessage));
    }

    private boolean hasActiveEmployeeRecord(User user) {
        if (user == null || !Boolean.TRUE.equals(user.getActive())) {
            return false;
        }

        if (user.getEmployeeId() == null) {
            return false;
        }

        return employeeRepository.findById(user.getEmployeeId())
                .map(employee -> employee.getActive() == null || Boolean.TRUE.equals(employee.getActive()))
                .orElse(false);
    }

    private String getWorkingDepartmentName(Integer userId) {
        if (userId == null) {
            return null;
        }

        return employeeDepartmentRepository.findWorkingDepartmentNamesByUserId(userId)
                .stream()
                .filter(name -> name != null && !name.trim().isEmpty())
                .findFirst()
                .orElseGet(() -> userRepository.findById(userId)
                        .map(User::getDepartmentId)
                        .flatMap(departmentRepository::findById)
                        .map(Department::getDepartmentName)
                        .orElse(null));
    }

    private List<User> getManagedTeamUsers(Integer managerUserId) {
        Map<Integer, User> users = new LinkedHashMap<>();

        getManagedTeams(managerUserId).forEach(team ->
                getActiveTeamMembers(team).forEach(user -> users.putIfAbsent(user.getId(), user))
        );

        return users.values().stream().toList();
    }

    private List<Team> getManagedTeams(Integer managerUserId) {
        if (managerUserId == null) {
            return List.of();
        }

        Map<Integer, Team> teams = new LinkedHashMap<>();

        teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(managerUserId, "Active")
                .forEach(team -> teams.putIfAbsent(team.getId(), team));

        teamRepository.findByProjectManagerIdAndStatusIgnoreCase(managerUserId, "Active")
                .forEach(team -> teams.putIfAbsent(team.getId(), team));

        return teams.values().stream().toList();
    }

    private List<User> getActiveTeamMembers(Team team) {
        if (team == null || team.getTeamMembers() == null) {
            return List.of();
        }

        return team.getTeamMembers().stream()
                .filter(member -> member.getEndedDate() == null)
                .map(TeamMember::getMemberUser)
                .filter(Objects::nonNull)
                .filter(user -> Boolean.TRUE.equals(user.getActive()))
                .toList();
    }

    private boolean canManageByTeam(User manager, User employee) {
        if (manager == null || employee == null) {
            return false;
        }

        return getManagedTeams(manager.getId()).stream()
                .anyMatch(team -> isActiveTeamMember(team, employee.getId()));
    }

    private boolean isActiveMemberOfAnyTeam(User employee) {
        if (employee == null || employee.getId() == null) {
            return false;
        }

        return teamRepository.findAll().stream()
                .filter(Team::isActiveTeam)
                .anyMatch(team -> isActiveTeamMember(team, employee.getId()));
    }

    private boolean isActiveTeamMember(Team team, Integer userId) {
        if (team == null || userId == null || team.getTeamMembers() == null) {
            return false;
        }

        return team.getTeamMembers().stream()
                .anyMatch(member -> member.getEndedDate() == null
                        && member.getMemberUser() != null
                        && Objects.equals(member.getMemberUser().getId(), userId));
    }


    private boolean isHr(User user) {
        return hasDashboard(user, "HR_DASHBOARD")
                || hasDashboard(user, "HRADMIN_DASHBOARD")
                || hasRole(user, "HR")
                || hasRole(user, "ROLE_HR")
                || hasRole(user, "HRADMIN")
                || hasRole(user, "ROLE_HRADMIN");
    }

    private boolean isDepartmentHead(User user) {
        return hasDashboard(user, "DEPARTMENT_HEAD_DASHBOARD")
                || hasRole(user, "DEPARTMENT_HEAD")
                || hasRole(user, "ROLE_DEPARTMENT_HEAD")
                || hasRole(user, "DepartmentHead")
                || hasRole(user, "Department Head");
    }

    private boolean hasRole(User user, String roleName) {
        if (user == null || user.getId() == null || roleName == null) {
            return false;
        }

        String expected = normalizeRole(roleName);

        if (user.getPosition() != null
                && user.getPosition().getRole() != null
                && user.getPosition().getRole().getName() != null
                && expected.equals(normalizeRole(user.getPosition().getRole().getName()))) {
            return true;
        }

        return userRoleRepository.findByUserId(user.getId()).stream()
                .map(UserRole::getRoleId)
                .filter(Objects::nonNull)
                .map(roleRepository::findById)
                .flatMap(Optional::stream)
                .map(Role::getName)
                .filter(Objects::nonNull)
                .map(this::normalizeRole)
                .anyMatch(expected::equals);
    }

    private boolean hasDashboard(User user, String dashboard) {
        return user != null
                && user.getDashboard() != null
                && dashboard != null
                && normalizeRole(user.getDashboard()).equals(normalizeRole(dashboard));
    }

    private String normalizeRole(String role) {
        return role.trim()
                .replace("ROLE_", "")
                .replace(" ", "_")
                .replace("-", "_")
                .toUpperCase(Locale.ROOT);
    }

    private String normalizePhaseStatus(String status) {
        if (status == null) {
            throw new BusinessValidationException("Phase status is required.");
        }

        String normalized = status.trim().toUpperCase(Locale.ROOT);

        if ("HAS_NOT_STARTED_YET".equals(normalized) || "NOT_STARTED".equals(normalized)) {
            normalized = "HASNT_STARTED_YET";
        }

        if (!PHASE_STATUSES.contains(normalized)) {
            throw new BusinessValidationException("Invalid phase status.");
        }

        return normalized;
    }

    private String pipGoalPreview(String goal) {
        if (goal == null || goal.isBlank()) {
            return "";
        }

        String g = goal.trim();
        return g.length() <= 120 ? g : g.substring(0, 117).trim() + "...";
    }

    private String phaseStatusForNotification(String normalizedStatus) {
        return switch (normalizedStatus) {
            case "HASNT_STARTED_YET" -> "Not started yet";
            case "ONGOING" -> "Ongoing";
            case "COMPLETED" -> "Completed";
            default -> normalizedStatus.replace('_', ' ').toLowerCase(Locale.ROOT);
        };
    }

    private void assertWordLimit(String value, String fieldName) {
        if (wordCount(value) > WORD_LIMIT) {
            throw new BusinessValidationException(fieldName + " cannot exceed 1000 words.");
        }
    }

    private int wordCount(String value) {
        if (value == null || value.trim().isEmpty()) {
            return 0;
        }

        return value.trim().split("\\s+").length;
    }

    private String clean(String value) {
        if (value == null || value.trim().isEmpty()) {
            throw new BusinessValidationException("Required text cannot be empty.");
        }

        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private String displayName(User user) {
        if (user == null) {
            return "Unknown";
        }

        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
            return user.getFullName().trim();
        }

        if (user.getEmail() != null) {
            return user.getEmail();
        }

        return "User #" + user.getId();
    }

    private String positionName(User user) {
        if (user == null || user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
            return "Employee";
        }

        return user.getPosition().getPositionTitle();
    }
}
