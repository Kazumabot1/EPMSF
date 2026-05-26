package com.epms.service;

import com.epms.dto.OneOnOneAccessContextResponseDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.dto.TeamEmployeeOptionResponseDto;
import com.epms.dto.TeamOptionResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TeamAccessService {

    private final TeamRepository teamRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionPermissionService positionPermissionService;

    @Transactional(readOnly = true)
    public OneOnOneAccessContextResponseDto getOneOnOneContext() {
        UserPrincipal current = SecurityUtils.currentUser();
        boolean canCreate = positionPermissionService.currentUserHasPermission("oneOnOneCreate");
        boolean canSelectDepartment = positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection");
        boolean canSelectAnyTeamInDefaultDepartment = positionPermissionService.currentUserHasPermission("oneOnOneTeamSelection");

        if (!canCreate) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("NO_CREATE")
                    .canCreate(false)
                    .canSelectDepartment(false)
                    .canSelectTeam(false)
                    .teamRequired(false)
                    .canUseDepartmentEmployeeScope(false)
                    .build();
        }

        Optional<Department> defaultDepartment = resolveDefaultDepartment(current);

        if (isHr(current) || isAdmin(current)) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("DEPARTMENT_SELECTION")
                    .departmentId(defaultDepartment.map(Department::getId).orElse(null))
                    .departmentName(defaultDepartment.map(Department::getDepartmentName).orElse(null))
                    .canCreate(true)
                    .canSelectDepartment(true)
                    .canSelectTeam(true)
                    .teamRequired(false)
                    .canUseDepartmentEmployeeScope(true)
                    .build();
        }

        if (isDepartmentHead(current)) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("DEPARTMENT_SCOPE")
                    .departmentId(defaultDepartment.map(Department::getId).orElse(null))
                    .departmentName(defaultDepartment.map(Department::getDepartmentName).orElse(null))
                    .canCreate(true)
                    .canSelectDepartment(false)
                    .canSelectTeam(true)
                    .teamRequired(false)
                    .canUseDepartmentEmployeeScope(true)
                    .build();
        }

        if (isManager(current)) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("DIRECT_REPORTS")
                    .departmentId(defaultDepartment.map(Department::getId).orElse(null))
                    .departmentName(defaultDepartment.map(Department::getDepartmentName).orElse(null))
                    .canCreate(true)
                    .canSelectDepartment(false)
                    .canSelectTeam(false)
                    .teamRequired(false)
                    .canUseDepartmentEmployeeScope(true)
                    .build();
        }

        if (canSelectDepartment) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("DEPARTMENT_SELECTION")
                    .departmentId(defaultDepartment.map(Department::getId).orElse(null))
                    .departmentName(defaultDepartment.map(Department::getDepartmentName).orElse(null))
                    .canCreate(true)
                    .canSelectDepartment(true)
                    .canSelectTeam(true)
                    .teamRequired(false)
                    .canUseDepartmentEmployeeScope(true)
                    .build();
        }

        if (canSelectAnyTeamInDefaultDepartment) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("TEAM_SELECTION")
                    .departmentId(defaultDepartment.map(Department::getId).orElse(null))
                    .departmentName(defaultDepartment.map(Department::getDepartmentName).orElse(null))
                    .canCreate(true)
                    .canSelectDepartment(false)
                    .canSelectTeam(true)
                    .teamRequired(false)
                    .canUseDepartmentEmployeeScope(true)
                    .build();
        }

        return OneOnOneAccessContextResponseDto.builder()
                .accessMode("MANAGED_TEAM_ONLY")
                .departmentId(defaultDepartment.map(Department::getId).orElse(null))
                .departmentName(defaultDepartment.map(Department::getDepartmentName).orElse(null))
                .canCreate(true)
                .canSelectDepartment(false)
                .canSelectTeam(true)
                .teamRequired(true)
                .canUseDepartmentEmployeeScope(false)
                .build();
    }

    @Transactional(readOnly = true)
    public List<TeamOptionResponseDto> getOneOnOneTeamOptions(Integer departmentId) {
        assertCanCreateOneOnOne();

        UserPrincipal current = SecurityUtils.currentUser();
        boolean canSelectDepartment = positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection");
        boolean canSelectAnyTeamInDefaultDepartment = positionPermissionService.currentUserHasPermission("oneOnOneTeamSelection");

        if (isHr(current) || isAdmin(current) || canSelectDepartment || isDepartmentHead(current) || canSelectAnyTeamInDefaultDepartment) {
            Integer allowedDepartmentId = requireAllowedOneOnOneDepartment(departmentId);
            return findActiveTeamsByDepartment(allowedDepartmentId);
        }

        return getManagedTeams(SecurityUtils.currentUserId()).stream()
                .map(this::toTeamOption)
                .sorted(Comparator.comparing(TeamOptionResponseDto::getTeamName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamOptionResponseDto> getManagedTeamOptionsForCurrentUser() {
        assertCanCreateOneOnOne();

        return getManagedTeams(SecurityUtils.currentUserId()).stream()
                .map(this::toTeamOption)
                .sorted(Comparator.comparing(TeamOptionResponseDto::getTeamName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    @Transactional(readOnly = true)
    public List<TeamEmployeeOptionResponseDto> getActiveEmployeesForTeamScope(Integer teamId, Integer departmentId) {
        Team team = requireTeamWithinOneOnOneScope(teamId, departmentId);
        return getActiveEmployeeOptions(team);
    }

    @Transactional(readOnly = true)
    public List<TeamEmployeeOptionResponseDto> getActiveEmployeesForManagedTeam(Integer teamId) {
        Team team = requireManagedTeam(teamId, SecurityUtils.currentUserId());
        return getActiveEmployeeOptions(team);
    }

    @Transactional(readOnly = true)
    public List<TeamEmployeeOptionResponseDto> getActiveEmployeesForDepartmentScope(Integer departmentId) {
        assertCanCreateOneOnOne();

        UserPrincipal current = SecurityUtils.currentUser();
        List<Employee> employees;

        if (isManager(current)) {
            employees = findDirectReportEmployees(current.getId());
        } else {
            Integer allowedDepartmentId = requireAllowedOneOnOneDepartment(departmentId);
            employees = employeeRepository.findActiveDropdownEmployeesByDepartmentId(allowedDepartmentId);
        }

        Integer currentEmployeeId = currentEmployeeId(current).orElse(null);

        return employees.stream()
                .filter(this::isActiveEmployee)
                .filter(employee -> !Objects.equals(employee.getId(), currentEmployeeId))
                .filter(employee -> isAllowedOneOnOneTarget(current, employee))
                .map(this::toEmployeeOption)
                .sorted(Comparator
                        .comparing(TeamEmployeeOptionResponseDto::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(TeamEmployeeOptionResponseDto::getLastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    @Transactional(readOnly = true)
    public void validateOneOnOneCreateRequest(OneOnOneMeetingRequestDto request) {
        if (request == null) {
            throw new BusinessValidationException("Meeting request is required.");
        }
        if (request.getEmployeeId() == null) {
            throw new BusinessValidationException("Employee is required.");
        }

        assertCanCreateOneOnOne();

        UserPrincipal current = SecurityUtils.currentUser();
        Employee selectedEmployee = employeeRepository.findById(request.getEmployeeId())
                .orElseThrow(() -> new BusinessValidationException("Employee not found."));

        if (!isActiveEmployee(selectedEmployee)) {
            throw new BusinessValidationException("Selected employee is not active.");
        }

        currentEmployeeId(current).ifPresent(currentEmpId -> {
            if (Objects.equals(currentEmpId, selectedEmployee.getId())) {
                throw new UnauthorizedActionException("You cannot create a one-on-one meeting with yourself.");
            }
        });

        if (request.getTeamId() != null) {
            Team team = requireTeamWithinOneOnOneScope(request.getTeamId(), request.getDepartmentId());

            boolean existsInTeam = getActiveEmployeesFromTeam(team).stream()
                    .anyMatch(employee -> Objects.equals(employee.getId(), request.getEmployeeId()));

            if (!existsInTeam) {
                throw new UnauthorizedActionException("You can select only active employees from the selected team.");
            }

            if (!isAllowedOneOnOneTarget(current, selectedEmployee)) {
                throw new UnauthorizedActionException("Selected employee is outside your one-on-one meeting scope.");
            }

            return;
        }

        if (!canUseDepartmentEmployeeScope(current)) {
            throw new BusinessValidationException("Team is required.");
        }

        if (isManager(current)) {
            if (!isDirectReport(current.getId(), selectedEmployee)) {
                throw new UnauthorizedActionException("Managers can create one-on-one meetings only with employees assigned to them.");
            }
            return;
        }

        Integer allowedDepartmentId = requireAllowedOneOnOneDepartment(request.getDepartmentId());

        if (!employeeBelongsToDepartment(selectedEmployee, allowedDepartmentId)) {
            throw new UnauthorizedActionException("You can create one-on-one meetings only with active employees from the allowed department.");
        }

        if (!isAllowedOneOnOneTarget(current, selectedEmployee)) {
            throw new UnauthorizedActionException("Selected employee is outside your one-on-one meeting scope.");
        }
    }

    @Transactional(readOnly = true)
    public Team requireManagedTeam(Integer teamId, Integer currentUserId) {
        if (teamId == null) {
            throw new BusinessValidationException("Team is required.");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new BusinessValidationException("Team not found."));

        if (!isActiveTeam(team)) {
            throw new BusinessValidationException("Selected team is not active.");
        }

        if (!isManagedByUser(team, currentUserId)) {
            throw new UnauthorizedActionException("You can access only your own teams.");
        }

        return team;
    }

    @Transactional(readOnly = true)
    public Employee requireActiveEmployeeInManagedTeam(Integer teamId, Integer employeeId, Integer currentUserId) {
        Team team = requireManagedTeam(teamId, currentUserId);

        return getActiveEmployeesFromTeam(team).stream()
                .filter(employee -> Objects.equals(employee.getId(), employeeId))
                .findFirst()
                .orElseThrow(() -> new UnauthorizedActionException("You can select only active employees from your own team."));
    }

    private Team requireTeamWithinOneOnOneScope(Integer teamId, Integer requestedDepartmentId) {
        if (teamId == null) {
            throw new BusinessValidationException("Team is required.");
        }

        assertCanCreateOneOnOne();

        UserPrincipal current = SecurityUtils.currentUser();
        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new BusinessValidationException("Team not found."));

        if (!isActiveTeam(team)) {
            throw new BusinessValidationException("Selected team is not active.");
        }

        boolean canSelectDepartment = positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection");
        boolean canSelectAnyTeamInDefaultDepartment = positionPermissionService.currentUserHasPermission("oneOnOneTeamSelection");

        if (isHr(current) || isAdmin(current) || canSelectDepartment || isDepartmentHead(current) || canSelectAnyTeamInDefaultDepartment) {
            Integer allowedDepartmentId = requireAllowedOneOnOneDepartment(requestedDepartmentId);
            Integer teamDepartmentId = team.getDepartment() == null ? null : team.getDepartment().getId();

            if (!Objects.equals(teamDepartmentId, allowedDepartmentId)) {
                throw new UnauthorizedActionException("Selected team is outside the allowed department.");
            }

            return team;
        }

        if (!isManagedByUser(team, SecurityUtils.currentUserId())) {
            throw new UnauthorizedActionException("You can access only teams you lead or manage.");
        }

        return team;
    }

    private Integer requireAllowedOneOnOneDepartment(Integer requestedDepartmentId) {
        UserPrincipal current = SecurityUtils.currentUser();
        boolean canSelectDepartment = positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection");

        if (isHr(current) || isAdmin(current)) {
            if (requestedDepartmentId == null) {
                throw new BusinessValidationException("Department is required.");
            }
            return requestedDepartmentId;
        }

        if (isDepartmentHead(current) || isManager(current)) {
            Department defaultDepartment = resolveDefaultDepartment(current)
                    .orElseThrow(() -> new BusinessValidationException("Your account has no assigned department for one-on-one meetings."));

            if (requestedDepartmentId != null && !Objects.equals(requestedDepartmentId, defaultDepartment.getId())) {
                throw new UnauthorizedActionException("You can create one-on-one meetings only in your assigned department.");
            }

            return defaultDepartment.getId();
        }

        if (canSelectDepartment) {
            if (requestedDepartmentId == null) {
                throw new BusinessValidationException("Department is required.");
            }
            return requestedDepartmentId;
        }

        Department defaultDepartment = resolveDefaultDepartment(current)
                .orElseThrow(() -> new BusinessValidationException("Your account has no assigned department for one-on-one meetings."));

        if (requestedDepartmentId != null && !Objects.equals(requestedDepartmentId, defaultDepartment.getId())) {
            throw new UnauthorizedActionException("You can create one-on-one meetings only in your assigned department.");
        }

        return defaultDepartment.getId();
    }

    private boolean canUseDepartmentEmployeeScope(UserPrincipal current) {
        return isHr(current)
                || isAdmin(current)
                || isDepartmentHead(current)
                || isManager(current)
                || positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection")
                || positionPermissionService.currentUserHasPermission("oneOnOneTeamSelection");
    }

    private void assertCanCreateOneOnOne() {
        boolean canCreate = positionPermissionService.currentUserHasPermission("oneOnOneCreate");
        if (!canCreate) {
            throw new UnauthorizedActionException("Your position does not have permission to create one-on-one meetings.");
        }
    }

    private Optional<Department> resolveDefaultDepartment(UserPrincipal current) {
        Optional<User> user = userRepository.findById(current.getId());
        if (user.isPresent()) {
            if (user.get().getDepartmentId() != null) {
                Optional<Department> accountDepartment = departmentRepository.findById(user.get().getDepartmentId());
                if (accountDepartment.isPresent()) {
                    return accountDepartment;
                }
            }

            if (user.get().getEmployeeId() != null) {
                Optional<Employee> employee = employeeRepository.findById(user.get().getEmployeeId());
                if (employee.isPresent()) {
                    Optional<Department> workingDepartment = employee.get().getEmployeeDepartments()
                            .stream()
                            .filter(ed -> ed.getEnddate() == null)
                            .findFirst()
                            .map(this::workingDepartmentFromAssignment)
                            .filter(Objects::nonNull);

                    if (workingDepartment.isPresent()) {
                        return workingDepartment;
                    }
                }
            }
        }

        if (current.getDepartmentId() != null) {
            return departmentRepository.findById(current.getDepartmentId());
        }

        return Optional.empty();
    }

    private Department workingDepartmentFromAssignment(EmployeeDepartment assignment) {
        if (assignment == null) {
            return null;
        }

        if (assignment.getParentDepartment() != null) {
            return assignment.getParentDepartment();
        }

        return assignment.getCurrentDepartment();
    }

    private List<TeamOptionResponseDto> findActiveTeamsByDepartment(Integer departmentId) {
        return teamRepository.findByDepartmentIdAndStatusIgnoreCase(departmentId, "Active")
                .stream()
                .map(this::toTeamOption)
                .sorted(Comparator.comparing(TeamOptionResponseDto::getTeamName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private List<Team> getManagedTeams(Integer currentUserId) {
        Map<Integer, Team> teams = new LinkedHashMap<>();

        teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(currentUserId, "Active")
                .forEach(team -> teams.put(team.getId(), team));

        teamRepository.findByProjectManagerIdAndStatusIgnoreCase(currentUserId, "Active")
                .forEach(team -> teams.put(team.getId(), team));

        return teams.values().stream().toList();
    }

    private List<TeamEmployeeOptionResponseDto> getActiveEmployeeOptions(Team team) {
        Integer currentEmployeeId = currentEmployeeId(SecurityUtils.currentUser()).orElse(null);

        return getActiveEmployeesFromTeam(team).stream()
                .filter(employee -> !Objects.equals(employee.getId(), currentEmployeeId))
                .filter(employee -> isAllowedOneOnOneTarget(SecurityUtils.currentUser(), employee))
                .map(employee -> {
                    User user = findUserByEmployeeId(team, employee.getId());

                    return TeamEmployeeOptionResponseDto.builder()
                            .id(employee.getId())
                            .employeeId(employee.getId())
                            .userId(user == null ? null : user.getId())
                            .firstName(employee.getFirstName())
                            .lastName(employee.getLastName())
                            .email(employee.getEmail())
                            .positionTitle(employee.getPosition() == null ? null : employee.getPosition().getPositionTitle())
                            .build();
                })
                .sorted(Comparator
                        .comparing(TeamEmployeeOptionResponseDto::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(TeamEmployeeOptionResponseDto::getLastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    private List<Employee> getActiveEmployeesFromTeam(Team team) {
        Map<Integer, Employee> employees = new LinkedHashMap<>();

        addActiveEmployeeFromUser(employees, team.getTeamLeader());
        addActiveEmployeeFromUser(employees, team.getProjectManager());

        team.getTeamMembers().stream()
                .filter(member -> member.getEndedDate() == null)
                .map(TeamMember::getMemberUser)
                .forEach(user -> addActiveEmployeeFromUser(employees, user));

        return employees.values().stream().toList();
    }

    private void addActiveEmployeeFromUser(Map<Integer, Employee> employees, User user) {
        if (user == null || user.getEmployeeId() == null) {
            return;
        }

        if (user.getActive() != null && !Boolean.TRUE.equals(user.getActive())) {
            return;
        }

        employeeRepository.findById(user.getEmployeeId())
                .filter(this::isActiveEmployee)
                .ifPresent(employee -> employees.put(employee.getId(), employee));
    }

    private User findUserByEmployeeId(Team team, Integer employeeId) {
        if (team.getTeamLeader() != null && Objects.equals(team.getTeamLeader().getEmployeeId(), employeeId)) {
            return team.getTeamLeader();
        }

        if (team.getProjectManager() != null && Objects.equals(team.getProjectManager().getEmployeeId(), employeeId)) {
            return team.getProjectManager();
        }

        return team.getTeamMembers().stream()
                .map(TeamMember::getMemberUser)
                .filter(Objects::nonNull)
                .filter(user -> Objects.equals(user.getEmployeeId(), employeeId))
                .findFirst()
                .orElseGet(() -> userRepository.findActiveByEmployeeId(employeeId).orElse(null));
    }

    private TeamEmployeeOptionResponseDto toEmployeeOption(Employee employee) {
        User user = userRepository.findActiveByEmployeeId(employee.getId()).orElse(null);

        return TeamEmployeeOptionResponseDto.builder()
                .id(employee.getId())
                .employeeId(employee.getId())
                .userId(user == null ? null : user.getId())
                .firstName(employee.getFirstName())
                .lastName(employee.getLastName())
                .email(employee.getEmail())
                .positionTitle(employee.getPosition() == null ? null : employee.getPosition().getPositionTitle())
                .build();
    }

    private TeamOptionResponseDto toTeamOption(Team team) {
        return TeamOptionResponseDto.builder()
                .id(team.getId())
                .teamName(team.getTeamName())
                .departmentId(team.getDepartment() == null ? null : team.getDepartment().getId())
                .departmentName(team.getDepartment() == null ? null : team.getDepartment().getDepartmentName())
                .teamLeaderId(team.getTeamLeader() == null ? null : team.getTeamLeader().getId())
                .teamLeaderName(displayUser(team.getTeamLeader()))
                .projectManagerId(team.getProjectManager() == null ? null : team.getProjectManager().getId())
                .projectManagerName(displayUser(team.getProjectManager()))
                .build();
    }

    private boolean isActiveTeam(Team team) {
        return team.getStatus() != null && team.getStatus().equalsIgnoreCase("Active");
    }

    private boolean isActiveEmployee(Employee employee) {
        return employee != null && (employee.getActive() == null || Boolean.TRUE.equals(employee.getActive()));
    }

    private boolean isManagedByUser(Team team, Integer userId) {
        return team.getTeamLeader() != null && Objects.equals(team.getTeamLeader().getId(), userId)
                || team.getProjectManager() != null && Objects.equals(team.getProjectManager().getId(), userId);
    }

    private List<Employee> findDirectReportEmployees(Integer managerUserId) {
        return userRepository.findByManagerIdAndActiveTrue(managerUserId).stream()
                .filter(user -> user.getEmployeeId() != null)
                .map(user -> employeeRepository.findById(user.getEmployeeId()))
                .flatMap(Optional::stream)
                .filter(this::isActiveEmployee)
                .toList();
    }

    private boolean isDirectReport(Integer managerUserId, Employee employee) {
        if (employee == null) {
            return false;
        }

        return userRepository.findActiveByEmployeeId(employee.getId())
                .map(user -> Objects.equals(user.getManagerId(), managerUserId))
                .orElse(false);
    }

    private boolean employeeBelongsToDepartment(Employee employee, Integer departmentId) {
        if (employee == null || departmentId == null) {
            return false;
        }

        Set<Integer> departmentIds = employeeDepartmentIds(employee);
        return departmentIds.contains(departmentId);
    }

    private Set<Integer> employeeDepartmentIds(Employee employee) {
        Set<Integer> ids = new LinkedHashSet<>();

        if (employee == null) {
            return ids;
        }

        employee.getEmployeeDepartments().stream()
                .filter(ed -> ed.getEnddate() == null)
                .forEach(ed -> {
                    if (ed.getCurrentDepartment() != null) {
                        ids.add(ed.getCurrentDepartment().getId());
                    }
                    if (ed.getParentDepartment() != null) {
                        ids.add(ed.getParentDepartment().getId());
                    }
                });

        userRepository.findActiveByEmployeeId(employee.getId())
                .map(User::getDepartmentId)
                .filter(Objects::nonNull)
                .ifPresent(ids::add);

        return ids;
    }

    private Optional<Integer> currentEmployeeId(UserPrincipal current) {
        return userRepository.findById(current.getId())
                .map(User::getEmployeeId)
                .filter(Objects::nonNull);
    }

    private boolean isAllowedOneOnOneTarget(UserPrincipal current, Employee employee) {
        if (employee == null) {
            return false;
        }

        if (isManager(current)) {
            return isDirectReport(current.getId(), employee);
        }

        if (isDepartmentHead(current)) {
            Integer allowedDepartmentId = resolveDefaultDepartment(current).map(Department::getId).orElse(null);
            return allowedDepartmentId != null && employeeBelongsToDepartment(employee, allowedDepartmentId);
        }

        if (isHr(current)) {
            return !targetHasAnyRole(employee, Set.of("ADMIN", "CEO", "EXECUTIVE", "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT"));
        }

        return true;
    }

    private boolean targetHasAnyRole(Employee employee, Set<String> roleNames) {
        if (employee == null) {
            return false;
        }

        User user = userRepository.findActiveByEmployeeId(employee.getId()).orElse(null);
        if (user == null || user.getId() == null) {
            return false;
        }

        return userRepository.findNormalizedRoleNamesByUserId(user.getId()).stream()
                .map(this::normalizeRole)
                .anyMatch(roleNames::contains);
    }

    private boolean isAdmin(UserPrincipal current) {
        return hasRole(current, Set.of("ADMIN", "SYSTEM_ADMIN", "SYSTEM_ADMINISTRATOR"));
    }

    private boolean isHr(UserPrincipal current) {
        return hasRole(current, Set.of("HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES", "HR_ADMIN", "HR_MANAGER"));
    }

    private boolean isDepartmentHead(UserPrincipal current) {
        return hasRole(current, Set.of("DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT"));
    }

    private boolean isManager(UserPrincipal current) {
        return hasRole(current, Set.of("MANAGER", "PROJECT_MANAGER", "TEAM_MANAGER"));
    }

    private boolean hasRole(UserPrincipal current, Set<String> candidates) {
        if (current == null || current.getRoles() == null) {
            return false;
        }

        return current.getRoles().stream()
                .map(this::normalizeRole)
                .anyMatch(candidates::contains);
    }

    private String normalizeRole(String value) {
        if (value == null) {
            return "";
        }

        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();
    }

    private String displayUser(User user) {
        if (user == null) {
            return null;
        }

        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }

        return "User #" + user.getId();
    }
}
