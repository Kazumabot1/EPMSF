package com.epms.service.impl;

import com.epms.dto.AccountProvisionResult;
import com.epms.dto.EmployeeDepartmentTransferPreviewDto;
import com.epms.dto.EmployeeRequestDto;
import com.epms.dto.EmployeeResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeAuditHistory;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.Position;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeAuditHistoryRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.EmployeeService;
import com.epms.service.EmployeeKpiWorkflowService;
import com.epms.service.NotificationService;
import com.epms.service.UserAccountProvisioningService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class EmployeeServiceImpl implements EmployeeService {

    private final EmployeeRepository employeeRepository;
    private final PositionRepository positionRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final EmployeeAuditHistoryRepository employeeAuditHistoryRepository;
    private final UserAccountProvisioningService userAccountProvisioningService;
    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final NotificationService notificationService;
    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeResponseDto> getAllEmployees(boolean includeInactive) {
        List<Employee> employees = includeInactive
                ? employeeRepository.findAll()
                : employeeRepository.findAllActiveWithDepartments();

        return employees.stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponseDto getEmployeeById(Integer id) {
        Employee emp = employeeRepository.findWithDepartmentsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        return mapToDto(emp);
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeDepartmentTransferPreviewDto previewDepartmentTransfer(
            Integer id,
            Integer currentDepartmentId,
            Integer parentDepartmentId
    ) {
        Employee employee = employeeRepository.findWithDepartmentsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        Department newCurrentDepartment = requireDepartment(currentDepartmentId, "Current department");
        Department newParentDepartment = resolveParentDepartment(parentDepartmentId, newCurrentDepartment);
        Department newWorkingDepartment = getWorkingDepartment(newCurrentDepartment, newParentDepartment);

        EmployeeDepartment activeAssignment = getActiveAssignment(employee).orElse(null);
        Department oldWorkingDepartment = getWorkingDepartment(activeAssignment);

        EmployeeDepartmentTransferPreviewDto preview = new EmployeeDepartmentTransferPreviewDto();
        preview.setEmployeeId(employee.getId());
        preview.setEmployeeName(employeeName(employee));
        preview.setOldWorkingDepartmentId(oldWorkingDepartment != null ? oldWorkingDepartment.getId() : null);
        preview.setOldWorkingDepartmentName(oldWorkingDepartment != null ? oldWorkingDepartment.getDepartmentName() : null);
        preview.setNewWorkingDepartmentId(newWorkingDepartment != null ? newWorkingDepartment.getId() : null);
        preview.setNewWorkingDepartmentName(newWorkingDepartment != null ? newWorkingDepartment.getDepartmentName() : null);

        boolean workingDepartmentChanged = !Objects.equals(
                oldWorkingDepartment != null ? oldWorkingDepartment.getId() : null,
                newWorkingDepartment != null ? newWorkingDepartment.getId() : null
        );

        preview.setWorkingDepartmentChanged(workingDepartmentChanged);

        if (!workingDepartmentChanged) {
            preview.setMessage("Working department is not changed.");
            preview.setRequiresConfirmation(false);
            preview.setRequiresTeamSelection(false);
            preview.setBlocked(false);
            return preview;
        }

        Optional<User> linkedUserOpt = userRepository.findByEmployeeId(employee.getId());

        if (linkedUserOpt.isEmpty()) {
            preview.setMessage("Working department will be changed. No linked user account/team assignment was found.");
            preview.setRequiresConfirmation(false);
            preview.setRequiresTeamSelection(false);
            preview.setBlocked(false);
            return preview;
        }

        User linkedUser = linkedUserOpt.get();

        Team activeLeaderTeam = getFirstActiveLeaderTeam(linkedUser.getId());
        Team activeMemberTeam = getFirstActiveMemberTeam(linkedUser.getId());
        Team oldActiveTeam = activeLeaderTeam != null ? activeLeaderTeam : activeMemberTeam;

        if (oldActiveTeam != null) {
            preview.setOldTeamId(oldActiveTeam.getId());
            preview.setOldTeamName(oldActiveTeam.getTeamName());
        }

        if (activeLeaderTeam != null) {
            preview.setBlocked(true);
            preview.setBlockingReason(
                    employeeName(employee)
                            + " is currently the Team Leader of active team \""
                            + activeLeaderTeam.getTeamName()
                            + "\". Please assign another team leader or deactivate the team first."
            );
            preview.setMessage(preview.getBlockingReason());
            return preview;
        }

        if (activeMemberTeam != null && isImportantTeamRole(linkedUser)) {
            preview.setBlocked(true);
            preview.setBlockingReason(
                    employeeName(employee)
                            + " is currently assigned to active team \""
                            + activeMemberTeam.getTeamName()
                            + "\" with an important position. Please remove or replace this employee from that team first."
            );
            preview.setMessage(preview.getBlockingReason());
            return preview;
        }

        List<Team> teamsInNewDepartment = teamRepository.findByDepartmentId(newWorkingDepartment.getId());

        List<EmployeeDepartmentTransferPreviewDto.TeamOptionDto> teamOptions =
                teamsInNewDepartment.stream()
                        .sorted(Comparator.comparing(
                                team -> team.getTeamName() == null ? "" : team.getTeamName(),
                                String.CASE_INSENSITIVE_ORDER
                        ))
                        .map(team -> new EmployeeDepartmentTransferPreviewDto.TeamOptionDto(
                                team.getId(),
                                team.getTeamName(),
                                team.getStatus(),
                                isActiveTeam(team)
                        ))
                        .toList();

        preview.setTeams(teamOptions);

        boolean hasActiveTeamInNewDepartment = teamsInNewDepartment.stream().anyMatch(this::isActiveTeam);

        if (oldActiveTeam != null) {
            preview.setRequiresConfirmation(true);
            preview.setRequiresTeamSelection(hasActiveTeamInNewDepartment);

            if (hasActiveTeamInNewDepartment) {
                preview.setMessage(
                        employeeName(employee)
                                + " is already in active team \""
                                + oldActiveTeam.getTeamName()
                                + "\". Changing the working department requires choosing a team in the new department."
                );
            } else {
                preview.setMessage(
                        employeeName(employee)
                                + " is already in active team \""
                                + oldActiveTeam.getTeamName()
                                + "\". The new department has no active team yet, so the employee will be removed from the old team and HR can create a new team later."
                );
            }
        } else {
            preview.setRequiresConfirmation(false);
            preview.setRequiresTeamSelection(false);
            preview.setMessage("Working department will be changed.");
        }

        preview.setBlocked(false);
        return preview;
    }

    @Override
    @Transactional
    public EmployeeResponseDto createEmployee(EmployeeRequestDto request) {
        validateLoginAccountRequest(request);

        Department currentDepartment = requireDepartment(
                request.effectiveCurrentDepartmentId(),
                "Current department"
        );
        Department parentDepartment = resolveParentDepartment(
                request.getParentDepartmentId(),
                currentDepartment
        );
        Department workingDepartment = getWorkingDepartment(currentDepartment, parentDepartment);

        Employee employee = new Employee();
        copyRequestToEntity(request, employee);

        if (employee.getActive() == null) {
            employee.setActive(true);
        }

        Employee saved = employeeRepository.save(employee);
        syncDepartmentAssignment(currentDepartment, parentDepartment, saved);

        AccountProvisionResult provision = null;

        if (Boolean.TRUE.equals(request.getCreateLoginAccount())) {
            provision = userAccountProvisioningService.provisionFromEmployee(
                    saved,
                    roleNameFromPosition(saved.getPosition()),
                    Boolean.TRUE.equals(request.getSendTemporaryPasswordEmail()),
                    request.getDashboard()
            );

            syncLinkedUserFromEmployee(
                    saved,
                    workingDepartment != null ? workingDepartment.getId() : null,
                    request.getDashboard()
            );
        }

        EmployeeResponseDto dto = getEmployeeById(saved.getId());
        mergeAccountProvisioning(dto, provision);

        return dto;
    }

    @Override
    @Transactional
    public EmployeeResponseDto updateEmployee(Integer id, EmployeeRequestDto request) {
        validateLoginAccountRequest(request);

        Employee employee = employeeRepository.findWithDepartmentsById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        Position oldPosition = employee.getPosition();
        Integer oldPositionId = oldPosition != null ? oldPosition.getId() : null;
        String oldPositionTitle = oldPosition != null ? oldPosition.getPositionTitle() : null;
        String oldPositionLevelCode = oldPosition != null && oldPosition.getLevel() != null
                ? oldPosition.getLevel().getLevelCode()
                : null;
        String oldRoleName = oldPosition != null && oldPosition.getRole() != null
                ? oldPosition.getRole().getName()
                : null;

        EmployeeDepartment oldAssignment = getActiveAssignment(employee).orElse(null);
        Department oldCurrentDepartment = oldAssignment != null ? oldAssignment.getCurrentDepartment() : null;
        Department oldParentDepartment = oldAssignment != null ? oldAssignment.getParentDepartment() : null;
        Department oldWorkingDepartment = getWorkingDepartment(oldAssignment);

        Department currentDepartment = requireDepartment(
                request.effectiveCurrentDepartmentId(),
                "Current department"
        );
        Department parentDepartment = resolveParentDepartment(
                request.getParentDepartmentId(),
                currentDepartment
        );
        Department newWorkingDepartment = getWorkingDepartment(currentDepartment, parentDepartment);

        boolean workingDepartmentChanged = !Objects.equals(
                oldWorkingDepartment != null ? oldWorkingDepartment.getId() : null,
                newWorkingDepartment != null ? newWorkingDepartment.getId() : null
        );

        EmployeeDepartmentTransferPreviewDto preview = previewDepartmentTransfer(
                id,
                currentDepartment.getId(),
                parentDepartment != null ? parentDepartment.getId() : null
        );

        if (Boolean.TRUE.equals(preview.getBlocked())) {
            throw new BusinessValidationException(preview.getBlockingReason());
        }

        if (workingDepartmentChanged && Boolean.TRUE.equals(preview.getRequiresConfirmation())
                && !Boolean.TRUE.equals(request.getConfirmDepartmentTransfer())) {
            throw new BusinessValidationException(preview.getMessage());
        }

        if (workingDepartmentChanged && Boolean.TRUE.equals(preview.getRequiresTeamSelection())
                && request.getTransferTeamId() == null) {
            throw new BusinessValidationException("Please select a team in the new working department.");
        }

        Team oldTeam = null;
        Team newTeam = null;

        Optional<User> linkedUserOpt = userRepository.findByEmployeeId(employee.getId());

        if (workingDepartmentChanged && linkedUserOpt.isPresent()) {
            User linkedUser = linkedUserOpt.get();

            oldTeam = getFirstActiveMemberTeam(linkedUser.getId());

            if (request.getTransferTeamId() != null) {
                newTeam = validateTransferTeam(
                        request.getTransferTeamId(),
                        newWorkingDepartment,
                        linkedUser
                );
            }
        }

        copyRequestToEntity(request, employee);

        Employee saved = employeeRepository.save(employee);
        Integer newPositionId = saved.getPosition() != null ? saved.getPosition().getId() : null;
        syncDepartmentAssignment(currentDepartment, parentDepartment, saved);

        AccountProvisionResult provision = null;

        if (Boolean.TRUE.equals(request.getCreateLoginAccount())) {
            provision = userAccountProvisioningService.provisionFromEmployee(
                    saved,
                    roleNameFromPosition(saved.getPosition()),
                    Boolean.TRUE.equals(request.getSendTemporaryPasswordEmail()),
                    request.getDashboard()
            );
        }

        syncLinkedUserFromEmployee(
                saved,
                newWorkingDepartment != null ? newWorkingDepartment.getId() : null,
                request.getDashboard()
        );

        recordEmployeeAuditChanges(
                saved,
                oldPositionTitle,
                oldPositionLevelCode,
                oldRoleName,
                oldCurrentDepartment,
                oldParentDepartment,
                oldWorkingDepartment,
                currentDepartment,
                parentDepartment,
                newWorkingDepartment
        );

        if (workingDepartmentChanged && linkedUserOpt.isPresent()) {
            applyTeamTransfer(linkedUserOpt.get(), oldTeam, newTeam);
            sendDepartmentTransferNotifications(
                    saved,
                    linkedUserOpt.get(),
                    oldWorkingDepartment,
                    newWorkingDepartment,
                    oldTeam,
                    newTeam
            );
        }

        employeeKpiWorkflowService.handleEmployeePositionChanged(saved.getId(), oldPositionId, newPositionId);

        EmployeeResponseDto dto = getEmployeeById(id);
        mergeAccountProvisioning(dto, provision);

        return dto;
    }

    @Override
    @Transactional
    public EmployeeResponseDto deactivateEmployee(Integer id) {
        Employee employee = employeeRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + id));

        if (Boolean.FALSE.equals(employee.getActive())) {
            throw new BusinessValidationException("Employee is already inactive.");
        }

        employee.setActive(false);
        employeeRepository.save(employee);

        findLinkedUserByEmployeeOrEmail(employee).ifPresent(user -> {
            user.setEmployeeId(employee.getId());
            user.setActive(false);
            user.setUpdatedAt(new Date());
            userRepository.save(user);
        });

        return getEmployeeById(id);
    }

    private void syncLinkedUserFromEmployee(
            Employee employee,
            Integer workingDepartmentId,
            String requestedDashboard
    ) {
        findLinkedUserByEmployeeOrEmail(employee).ifPresent(user -> {
            String firstName = employee.getFirstName() != null ? employee.getFirstName().trim() : "";
            String lastName = employee.getLastName() != null ? employee.getLastName().trim() : "";
            String fullName = (firstName + " " + lastName).trim();

            user.setEmployeeId(employee.getId());
            user.setFullName(fullName.isBlank() ? null : fullName);
            user.setEmail(trimToNull(employee.getEmail()));
            user.setEmployeeCode(trimToNull(employee.getStaffNrc()));
            user.setPosition(employee.getPosition());

            /*
             * users.department_id is still used by dashboard/security/sidebar flows.
             * It should follow the working department:
             * parentDepartment if present, otherwise currentDepartment.
             */
            user.setDepartmentId(workingDepartmentId);

            user.setDashboard(
                    userAccountProvisioningService.resolveDashboardForEmployee(
                            employee.getPosition(),
                            roleNameFromPosition(employee.getPosition()),
                            requestedDashboard
                    )
            );

            user.setActive(employee.getActive() == null || employee.getActive());
            user.setUpdatedAt(new Date());

            userRepository.save(user);
            syncUserRoleFromPosition(user, employee.getPosition());
        });
    }

    private Optional<User> findLinkedUserByEmployeeOrEmail(Employee employee) {
        if (employee == null) {
            return Optional.empty();
        }

        if (employee.getId() != null) {
            Optional<User> byEmployeeId = userRepository.findByEmployeeId(employee.getId());

            if (byEmployeeId.isPresent()) {
                return byEmployeeId;
            }
        }

        String email = trimToNull(employee.getEmail());

        if (email == null) {
            return Optional.empty();
        }

        return userRepository.findByEmail(email.toLowerCase());
    }

    private void validateLoginAccountRequest(EmployeeRequestDto request) {
        if (!Boolean.TRUE.equals(request.getCreateLoginAccount())) {
            return;
        }

        if (!userAccountProvisioningService.isValidWorkEmail(request.getEmail())) {
            throw new BusinessValidationException(
                    "A valid work email is required when create login account is enabled.");
        }
    }

    private void mergeAccountProvisioning(EmployeeResponseDto dto, AccountProvisionResult provision) {
        if (provision == null) {
            return;
        }

        dto.setAccountProvisioningMessage(provision.getMessage());
        dto.setAccountProvisioningSuccess(provision.isSuccess());
        dto.setAccountProvisioningSmtpError(provision.getSmtpErrorDetail());
    }

    private void copyRequestToEntity(EmployeeRequestDto request, Employee employee) {
        employee.setFirstName(trimToNull(request.getFirstName()));
        employee.setLastName(trimToNull(request.getLastName()));
        employee.setPhoneNumber(trimToNull(request.getPhoneNumber()));
        employee.setEmail(trimToNull(request.getEmail()));
        employee.setStaffNrc(trimToNull(request.getStaffNrc()));
        employee.setGender(trimToNull(request.getGender()));
        employee.setRace(trimToNull(request.getRace()));
        employee.setReligion(trimToNull(request.getReligion()));
        employee.setDateOfBirth(request.getDateOfBirth());
        employee.setContactAddress(trimToNull(request.getContactAddress()));
        employee.setPermanentAddress(trimToNull(request.getPermanentAddress()));
        employee.setMaritalStatus(trimToNull(request.getMaritalStatus()));
        employee.setSpouseName(trimToNull(request.getSpouseName()));
        employee.setSpouseNrc(trimToNull(request.getSpouseNrc()));
        employee.setFatherName(trimToNull(request.getFatherName()));
        employee.setFatherNrc(trimToNull(request.getFatherNrc()));

        applyPosition(request.getPositionId(), employee);
    }

    private void applyPosition(Integer positionId, Employee employee) {
        if (positionId == null) {
            employee.setPosition(null);
            return;
        }

        Position position = positionRepository.findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + positionId));

        employee.setPosition(position);
    }

    private Department requireDepartment(Integer departmentId, String label) {
        if (departmentId == null) {
            throw new BusinessValidationException(label + " is required.");
        }

        return departmentRepository.findById(departmentId)
                .orElseThrow(() -> new ResourceNotFoundException(label + " not found with id: " + departmentId));
    }

    private Department resolveParentDepartment(Integer parentDepartmentId, Department currentDepartment) {
        if (parentDepartmentId == null) {
            return null;
        }

        if (currentDepartment != null && Objects.equals(parentDepartmentId, currentDepartment.getId())) {
            throw new BusinessValidationException("Parent Department cannot be the same as Current Department.");
        }

        return departmentRepository.findById(parentDepartmentId)
                .orElseThrow(() -> new ResourceNotFoundException("Parent department not found with id: " + parentDepartmentId));
    }

    private void syncDepartmentAssignment(
            Department currentDepartment,
            Department parentDepartment,
            Employee employee
    ) {
        List<EmployeeDepartment> history = employee.getEmployeeDepartments() != null
                ? new ArrayList<>(employee.getEmployeeDepartments())
                : new ArrayList<>();

        Optional<EmployeeDepartment> currentOpt = history.stream()
                .filter(item -> item.getEnddate() == null)
                .max(Comparator.comparing(
                        item -> item.getStartdate() == null ? new Date(0) : item.getStartdate()
                ));

        if (currentDepartment == null) {
            currentOpt.ifPresent(this::closeDepartmentAssignment);
            return;
        }

        Integer newCurrentDepartmentId = currentDepartment.getId();
        Integer newParentDepartmentId = parentDepartment != null ? parentDepartment.getId() : null;

        if (currentOpt.isPresent()) {
            EmployeeDepartment active = currentOpt.get();

            Integer oldCurrentDepartmentId = active.getCurrentDepartment() != null
                    ? active.getCurrentDepartment().getId()
                    : null;

            Integer oldParentDepartmentId = active.getParentDepartment() != null
                    ? active.getParentDepartment().getId()
                    : null;

            boolean sameCurrent = Objects.equals(oldCurrentDepartmentId, newCurrentDepartmentId);
            boolean sameParent = Objects.equals(oldParentDepartmentId, newParentDepartmentId);

            if (sameCurrent && sameParent) {
                return;
            }

            closeDepartmentAssignment(active);
        }

        EmployeeDepartment row = new EmployeeDepartment();
        row.setEmployee(employee);
        row.setStartdate(new Date());
        row.setEnddate(null);
        row.setCurrentDepartment(currentDepartment);
        row.setParentDepartment(parentDepartment);
        row.setAssignBy("HR");

        employeeDepartmentRepository.save(row);

        if (employee.getEmployeeDepartments() != null) {
            employee.getEmployeeDepartments().add(row);
        }
    }

    private void closeDepartmentAssignment(EmployeeDepartment row) {
        row.setEnddate(new Date());
        employeeDepartmentRepository.save(row);
    }

    private Team validateTransferTeam(Integer teamId, Department newWorkingDepartment, User user) {
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + teamId));

        if (!isActiveTeam(team)) {
            throw new BusinessValidationException("Selected team is inactive. Please select an active team.");
        }

        if (team.getDepartment() == null || newWorkingDepartment == null
                || !Objects.equals(team.getDepartment().getId(), newWorkingDepartment.getId())) {
            throw new BusinessValidationException("Selected team does not belong to the new working department.");
        }

        if (team.getTeamLeader() != null && Objects.equals(team.getTeamLeader().getId(), user.getId())) {
            throw new BusinessValidationException("Employee cannot be added as a member of a team they lead.");
        }

        return team;
    }

    private void applyTeamTransfer(User user, Team oldTeam, Team newTeam) {
        if (user == null || user.getId() == null) {
            return;
        }

        if (oldTeam != null) {
            List<TeamMember> memberships = teamMemberRepository.findByMemberUserId(user.getId());

            for (TeamMember membership : memberships) {
                if (membership.getTeam() != null
                        && Objects.equals(membership.getTeam().getId(), oldTeam.getId())) {
                    teamMemberRepository.delete(membership);
                }
            }
        }

        if (newTeam == null) {
            return;
        }

        List<TeamMember> existingMemberships = teamMemberRepository.findByMemberUserId(user.getId());

        for (TeamMember membership : existingMemberships) {
            if (membership.getTeam() != null
                    && Objects.equals(membership.getTeam().getId(), newTeam.getId())) {
                return;
            }
        }

        TeamMember newMember = new TeamMember();
        newMember.setTeam(newTeam);
        newMember.setMemberUser(user);
        newMember.setStartedDate(new Date());
        newMember.setEndedDate(null);

        teamMemberRepository.save(newMember);
    }

    private void sendDepartmentTransferNotifications(
            Employee employee,
            User employeeUser,
            Department oldDepartment,
            Department newDepartment,
            Team oldTeam,
            Team newTeam
    ) {
        String employeeName = employeeName(employee);
        String oldDepartmentName = oldDepartment != null ? oldDepartment.getDepartmentName() : "No department";
        String newDepartmentName = newDepartment != null ? newDepartment.getDepartmentName() : "No department";
        String oldTeamName = oldTeam != null ? oldTeam.getTeamName() : "No active team";
        String newTeamName = newTeam != null ? newTeam.getTeamName() : "No active team assigned yet";

        String title = "Employee Transfer Notice";
        String message = employeeName
                + " has been transferred from "
                + oldDepartmentName
                + " / "
                + oldTeamName
                + " to "
                + newDepartmentName
                + " / "
                + newTeamName
                + ". Please review related team responsibilities, KPI, PIP, and 1:1 planning.";

        Set<Integer> recipientIds = new HashSet<>();

        /*
         * Department Heads from old and new working departments.
         */
        if (oldDepartment != null && oldDepartment.getId() != null) {
            userRepository.findActiveDepartmentHeadsByDepartmentId(oldDepartment.getId())
                    .forEach(user -> recipientIds.add(user.getId()));
        }

        if (newDepartment != null && newDepartment.getId() != null) {
            userRepository.findActiveDepartmentHeadsByDepartmentId(newDepartment.getId())
                    .forEach(user -> recipientIds.add(user.getId()));
        }

        if (employeeUser != null) {
            recipientIds.add(employeeUser.getId());

            if (employeeUser.getManagerId() != null) {
                recipientIds.add(employeeUser.getManagerId());
            }
        }

        recipientIds.stream()
                .filter(Objects::nonNull)
                .forEach(userId -> notificationService.send(userId, title, message, "GENERAL"));
    }

    private void addTeamRecipients(Set<Integer> recipientIds, Team team) {
        if (team == null) {
            return;
        }

        if (team.getTeamLeader() != null && isActiveUser(team.getTeamLeader())) {
            recipientIds.add(team.getTeamLeader().getId());
        }

        if (team.getTeamMembers() == null) {
            return;
        }

        for (TeamMember member : team.getTeamMembers()) {
            if (member == null || member.getEndedDate() != null) {
                continue;
            }

            User memberUser = member.getMemberUser();

            if (memberUser != null && isActiveUser(memberUser)) {
                recipientIds.add(memberUser.getId());
            }
        }
    }

    private boolean isActiveUser(User user) {
        return user != null && (user.getActive() == null || Boolean.TRUE.equals(user.getActive()));
    }

    private Team getFirstActiveLeaderTeam(Integer userId) {
        if (userId == null) {
            return null;
        }

        List<Team> teams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(userId, "Active");
        return teams.isEmpty() ? null : teams.get(0);
    }

    private Team getFirstActiveMemberTeam(Integer userId) {
        if (userId == null) {
            return null;
        }

        List<TeamMember> memberships = teamMemberRepository.findByMemberUserId(userId);

        for (TeamMember membership : memberships) {
            if (membership.getTeam() != null && isActiveTeam(membership.getTeam())) {
                return membership.getTeam();
            }
        }

        return null;
    }

    private boolean isImportantTeamRole(User user) {
        return hasPositionPermission(user, "teamAssignAsLeader")
                || hasPositionPermission(user, "teamAssignAsPm");
    }

    private boolean isActiveTeam(Team team) {
        return team != null
                && team.getStatus() != null
                && team.getStatus().equalsIgnoreCase("Active");
    }

    private Optional<EmployeeDepartment> getActiveAssignment(Employee employee) {
        if (employee == null || employee.getEmployeeDepartments() == null) {
            return Optional.empty();
        }

        return employee.getEmployeeDepartments()
                .stream()
                .filter(Objects::nonNull)
                .filter(item -> item.getEnddate() == null)
                .max(Comparator.comparing(
                        item -> item.getStartdate() == null ? new Date(0) : item.getStartdate()
                ));
    }

    private EmployeeDepartment getLatestAssignment(Employee employee) {
        if (employee == null || employee.getEmployeeDepartments() == null) {
            return null;
        }

        return employee.getEmployeeDepartments()
                .stream()
                .filter(Objects::nonNull)
                .max(Comparator.comparing(
                        item -> item.getStartdate() == null ? new Date(0) : item.getStartdate()
                ))
                .orElse(null);
    }

    private Department getWorkingDepartment(EmployeeDepartment assignment) {
        if (assignment == null) {
            return null;
        }

        if (assignment.getParentDepartment() != null) {
            return assignment.getParentDepartment();
        }

        return assignment.getCurrentDepartment();
    }

    private Department getWorkingDepartment(Department currentDepartment, Department parentDepartment) {
        return parentDepartment != null ? parentDepartment : currentDepartment;
    }

    private EmployeeResponseDto mapToDto(Employee emp) {
        EmployeeDepartment activeAssignment = getActiveAssignment(emp).orElse(null);
        EmployeeDepartment latestAssignment = activeAssignment != null
                ? activeAssignment
                : getLatestAssignment(emp);

        Department currentDept = null;
        Department parentDept = null;
        Department workingDept = null;

        String assignedBy = null;
        Date departmentStartDate = null;
        Date departmentEndDate = null;

        if (latestAssignment != null) {
            currentDept = latestAssignment.getCurrentDepartment();
            parentDept = latestAssignment.getParentDepartment();
            workingDept = getWorkingDepartment(latestAssignment);

            assignedBy = latestAssignment.getAssignBy();
            departmentStartDate = latestAssignment.getStartdate();
            departmentEndDate = latestAssignment.getEnddate();
        }

        String firstName = emp.getFirstName() != null ? emp.getFirstName() : "";
        String lastName = emp.getLastName() != null ? emp.getLastName() : "";
        String fullName = (firstName + " " + lastName).trim();

        Integer positionId = null;
        String positionTitle = null;
        String positionLevelCode = null;

        if (emp.getPosition() != null) {
            positionId = emp.getPosition().getId();
            positionTitle = emp.getPosition().getPositionTitle();

            if (emp.getPosition().getLevel() != null) {
                positionLevelCode = emp.getPosition().getLevel().getLevelCode();
            }
        }

        User linkedUser = userRepository.findByEmployeeId(emp.getId()).orElse(null);

        int departmentHistoryCount = emp.getEmployeeDepartments() == null
                ? 0
                : emp.getEmployeeDepartments().size();

        EmployeeResponseDto dto = new EmployeeResponseDto();

        dto.setId(emp.getId());
        dto.setFirstName(emp.getFirstName());
        dto.setLastName(emp.getLastName());
        dto.setFullName(fullName);
        dto.setPhoneNumber(emp.getPhoneNumber());
        dto.setEmail(emp.getEmail());
        dto.setStaffNrc(emp.getStaffNrc());
        dto.setGender(emp.getGender());
        dto.setRace(emp.getRace());
        dto.setReligion(emp.getReligion());
        dto.setDateOfBirth(emp.getDateOfBirth());
        dto.setMaritalStatus(emp.getMaritalStatus());
        dto.setSpouseName(emp.getSpouseName());
        dto.setSpouseNrc(emp.getSpouseNrc());
        dto.setFatherName(emp.getFatherName());
        dto.setFatherNrc(emp.getFatherNrc());
        dto.setActive(emp.getActive());
        dto.setContactAddress(emp.getContactAddress());
        dto.setPermanentAddress(emp.getPermanentAddress());

        dto.setPositionId(positionId);
        dto.setPositionTitle(positionTitle);
        dto.setPositionLevelCode(positionLevelCode);

        dto.setCurrentDepartmentId(currentDept != null ? currentDept.getId() : null);
        dto.setCurrentDepartment(currentDept != null ? currentDept.getDepartmentName() : null);

        dto.setParentDepartmentId(parentDept != null ? parentDept.getId() : null);
        dto.setParentDepartment(parentDept != null ? parentDept.getDepartmentName() : null);

        dto.setWorkingDepartmentId(workingDept != null ? workingDept.getId() : null);
        dto.setWorkingDepartment(workingDept != null ? workingDept.getDepartmentName() : null);

        dto.setAssignedBy(assignedBy);
        dto.setDepartmentStartDate(departmentStartDate);
        dto.setDepartmentEndDate(departmentEndDate);
        dto.setDepartmentHistoryCount(departmentHistoryCount);

        dto.setUserId(linkedUser != null ? linkedUser.getId() : null);
        dto.setLoginAccountCreated(linkedUser != null);
        dto.setMustChangePassword(linkedUser != null ? linkedUser.getMustChangePassword() : null);

        dto.setAccountProvisioningMessage(null);
        dto.setAccountProvisioningSuccess(null);
        dto.setAccountProvisioningSmtpError(null);

        return dto;
    }

    @Override
    @Transactional(readOnly = true)
    public List<EmployeeResponseDto> getMyDepartmentEmployees(boolean includeInactive) {
        Integer departmentId = requireCurrentDepartmentId();

        return employeeRepository
                .findCurrentByWorkingDepartmentId(departmentId, includeInactive)
                .stream()
                .map(this::mapToDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public EmployeeResponseDto getMyDepartmentEmployeeById(Integer id) {
        EmployeeResponseDto dto = getEmployeeById(id);
        Integer departmentId = requireCurrentDepartmentId();

        if (dto.getWorkingDepartmentId() == null || !dto.getWorkingDepartmentId().equals(departmentId)) {
            throw new BusinessValidationException("You can only access employees from your own department.");
        }

        return dto;
    }

    private Integer requireCurrentDepartmentId() {
        UserPrincipal currentUser = SecurityUtils.currentUser();

        if (currentUser.getDepartmentId() == null) {
            throw new BusinessValidationException("Current department head has no assigned department.");
        }

        return currentUser.getDepartmentId();
    }

    private String employeeName(Employee employee) {
        if (employee == null) {
            return "Employee";
        }

        String firstName = employee.getFirstName() == null ? "" : employee.getFirstName().trim();
        String lastName = employee.getLastName() == null ? "" : employee.getLastName().trim();
        String fullName = (firstName + " " + lastName).trim();

        if (!fullName.isBlank()) {
            return fullName;
        }

        if (employee.getEmail() != null && !employee.getEmail().trim().isBlank()) {
            return employee.getEmail().trim();
        }

        return "Employee #" + employee.getId();
    }

    private void syncUserRoleFromPosition(User user, Position position) {
        if (user == null || user.getId() == null) {
            return;
        }

        Integer roleId = position != null && position.getRole() != null
                ? position.getRole().getId()
                : roleRepository.findByNameIgnoreCase("EMPLOYEE").map(com.epms.entity.Role::getId).orElse(null);

        if (roleId == null) {
            return;
        }

        userRoleRepository.deleteAll(userRoleRepository.findByUserId(user.getId()));

        UserRole userRole = new UserRole();
        userRole.setUserId(user.getId());
        userRole.setRoleId(roleId);
        userRoleRepository.save(userRole);
    }

    private boolean hasPositionPermission(User user, String permissionField) {
        if (user == null || user.getPosition() == null || user.getPosition().getPermissions() == null) {
            return false;
        }

        return switch (permissionField) {
            case "teamAssignAsLeader" -> Boolean.TRUE.equals(user.getPosition().getPermissions().getTeamAssignAsLeader());
            case "teamAssignAsPm" -> Boolean.TRUE.equals(user.getPosition().getPermissions().getTeamAssignAsPm());
            default -> false;
        };
    }

    private void recordEmployeeAuditChanges(
            Employee employee,
            String oldPositionTitle,
            String oldPositionLevelCode,
            String oldRoleName,
            Department oldCurrentDepartment,
            Department oldParentDepartment,
            Department oldWorkingDepartment,
            Department newCurrentDepartment,
            Department newParentDepartment,
            Department newWorkingDepartment
    ) {
        String newPositionTitle = employee.getPosition() != null ? employee.getPosition().getPositionTitle() : null;
        String newPositionLevelCode = employee.getPosition() != null && employee.getPosition().getLevel() != null
                ? employee.getPosition().getLevel().getLevelCode()
                : null;
        String newRoleName = employee.getPosition() != null && employee.getPosition().getRole() != null
                ? employee.getPosition().getRole().getName()
                : "EMPLOYEE";

        Integer editorId = safeCurrentUserId();

        saveEmployeeAudit(employee, "position", oldPositionTitle, newPositionTitle, editorId);
        saveEmployeeAudit(employee, "position_level", oldPositionLevelCode, newPositionLevelCode, editorId);
        saveEmployeeAudit(employee, "role", oldRoleName, newRoleName, editorId);
        saveEmployeeAudit(employee, "current_department",
                oldCurrentDepartment != null ? oldCurrentDepartment.getDepartmentName() : null,
                newCurrentDepartment != null ? newCurrentDepartment.getDepartmentName() : null,
                editorId);
        saveEmployeeAudit(employee, "parent_department",
                oldParentDepartment != null ? oldParentDepartment.getDepartmentName() : null,
                newParentDepartment != null ? newParentDepartment.getDepartmentName() : null,
                editorId);
        saveEmployeeAudit(employee, "working_department",
                oldWorkingDepartment != null ? oldWorkingDepartment.getDepartmentName() : null,
                newWorkingDepartment != null ? newWorkingDepartment.getDepartmentName() : null,
                editorId);
    }

    private void saveEmployeeAudit(
            Employee employee,
            String fieldName,
            String oldValue,
            String newValue,
            Integer editorId
    ) {
        if (employee == null || employee.getId() == null || Objects.equals(nullToBlank(oldValue), nullToBlank(newValue))) {
            return;
        }

        EmployeeAuditHistory history = new EmployeeAuditHistory();
        history.setEmployeeId(employee.getId());
        history.setFieldName(fieldName);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setEditedBy(editorId);
        history.setEditedAt(new Date());
        history.setReason("Employee profile updated");
        employeeAuditHistoryRepository.save(history);
    }

    private Integer safeCurrentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private String roleNameFromPosition(Position position) {
        if (position != null && position.getRole() != null && position.getRole().getName() != null) {
            return position.getRole().getName();
        }

        return "EMPLOYEE";
    }

    private String nullToBlank(String value) {
        return value == null ? "" : value;
    }

    private String trimToNull(String value) {
        if (value == null) {
            return null;
        }

        String t = value.trim();
        return t.isEmpty() ? null : t;
    }
}
