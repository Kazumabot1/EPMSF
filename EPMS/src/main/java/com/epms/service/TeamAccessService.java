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
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TeamAccessService {

    private static final Set<String> MANAGER_ROLES = Set.of(
            "MANAGER",
            "PROJECT_MANAGER",
            "TEAM_MANAGER"
    );

    private static final Set<String> DEPARTMENT_HEAD_ROLES = Set.of(
            "DEPARTMENT_HEAD",
            "DEPARTMENTHEAD",
            "DEPT_HEAD",
            "HEAD_OF_DEPARTMENT"
    );

    private static final Set<String> MANAGER_DASHBOARDS = Set.of("MANAGER_DASHBOARD");

    private static final Set<String> DEPARTMENT_HEAD_DASHBOARDS = Set.of(
            "DEPARTMENT_HEAD_DASHBOARD",
            "DEPARTMENTHEAD_DASHBOARD",
            "DEPT_HEAD_DASHBOARD"
    );

    private static final Set<String> EMPLOYEE_ROLES = Set.of("EMPLOYEE");

    private static final Set<String> EMPLOYEE_DASHBOARDS = Set.of("EMPLOYEE_DASHBOARD");

    private final TeamRepository teamRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final PositionPermissionService positionPermissionService;

    @Transactional(readOnly = true)
    public OneOnOneAccessContextResponseDto getOneOnOneContext() {
        UserPrincipal current = SecurityUtils.currentUser();
        boolean canCreate = !isEmployee(current)
                && (positionPermissionService.currentUserHasPermission("oneOnOneCreate")
                || isManagerOrDepartmentHead(current));

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

        Department defaultDepartment = resolveDefaultDepartment(current).orElse(null);
        Integer defaultDepartmentId = defaultDepartment == null ? null : defaultDepartment.getId();
        String defaultDepartmentName = defaultDepartment == null ? null : defaultDepartment.getDepartmentName();

        if (isDepartmentHead(current)) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("DEPARTMENT_HEAD_SCOPE")
                    .departmentId(defaultDepartmentId)
                    .departmentName(defaultDepartmentName)
                    .canCreate(true)
                    .canSelectDepartment(false)
                    .canSelectTeam(true)
                    .teamRequired(false)
                    .canUseDepartmentEmployeeScope(true)
                    .build();
        }

        if (isManager(current)) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("MANAGED_TEAM_ONLY")
                    .departmentId(defaultDepartmentId)
                    .departmentName(defaultDepartmentName)
                    .canCreate(true)
                    .canSelectDepartment(false)
                    .canSelectTeam(true)
                    .teamRequired(true)
                    .canUseDepartmentEmployeeScope(false)
                    .build();
        }

        boolean canSelectDepartment = positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection");
        boolean canSelectAnyTeamInDefaultDepartment = positionPermissionService.currentUserHasPermission("oneOnOneTeamSelection");

        if (canSelectDepartment) {
            return OneOnOneAccessContextResponseDto.builder()
                    .accessMode("DEPARTMENT_SELECTION")
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
                    .departmentId(defaultDepartmentId)
                    .departmentName(defaultDepartmentName)
                    .canCreate(true)
                    .canSelectDepartment(false)
                    .canSelectTeam(true)
                    .teamRequired(false)
                    .canUseDepartmentEmployeeScope(true)
                    .build();
        }

        return OneOnOneAccessContextResponseDto.builder()
                .accessMode("MANAGED_TEAM_ONLY")
                .departmentId(defaultDepartmentId)
                .departmentName(defaultDepartmentName)
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

        if (isDepartmentHead(current)) {
            Integer allowedDepartmentId = requireAllowedOneOnOneDepartment(departmentId);
            return findActiveTeamsByDepartment(allowedDepartmentId);
        }

        if (isManager(current)) {
            return getManagedTeams(SecurityUtils.currentUserId()).stream()
                    .map(this::toTeamOption)
                    .sorted(Comparator.comparing(TeamOptionResponseDto::getTeamName, String.CASE_INSENSITIVE_ORDER))
                    .toList();
        }

        boolean canSelectDepartment = positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection");
        boolean canSelectAnyTeamInDefaultDepartment = positionPermissionService.currentUserHasPermission("oneOnOneTeamSelection");

        if (canSelectDepartment || canSelectAnyTeamInDefaultDepartment) {
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

        if (!canUseDepartmentEmployeeScope()) {
            throw new UnauthorizedActionException("Please select one of your managed teams first.");
        }

        Integer allowedDepartmentId = requireAllowedOneOnOneDepartment(departmentId);

        return employeeRepository.findActiveDropdownEmployeesByDepartmentId(allowedDepartmentId)
                .stream()
                .filter(employee -> !isCurrentUserEmployee(employee))
                .map(this::toEmployeeOption)
                .sorted(Comparator
                        .comparing(TeamEmployeeOptionResponseDto::getFirstName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER))
                        .thenComparing(TeamEmployeeOptionResponseDto::getLastName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .toList();
    }

    @Transactional(readOnly = true)
    public void validateOneOnOneCreateRequest(OneOnOneMeetingRequestDto request) {
        if (request == null || request.getEmployeeId() == null) {
            throw new RuntimeException("Employee is required.");
        }

        assertCanCreateOneOnOne();

        if (isCurrentUserEmployeeId(request.getEmployeeId())) {
            throw new UnauthorizedActionException("You cannot create a one-on-one meeting with yourself.");
        }

        if (request.getTeamId() != null) {
            Team team = requireTeamWithinOneOnOneScope(request.getTeamId(), request.getDepartmentId());

            boolean existsInTeam = getActiveEmployeesFromTeam(team).stream()
                    .anyMatch(employee -> Objects.equals(employee.getId(), request.getEmployeeId()));

            if (!existsInTeam) {
                throw new UnauthorizedActionException("You can select only active employees from the selected team.");
            }

            return;
        }

        if (!canUseDepartmentEmployeeScope()) {
            throw new RuntimeException("Team is required.");
        }

        Integer allowedDepartmentId = requireAllowedOneOnOneDepartment(request.getDepartmentId());

        boolean exists = employeeRepository
                .findActiveDropdownEmployeesByDepartmentId(allowedDepartmentId)
                .stream()
                .anyMatch(employee -> Objects.equals(employee.getId(), request.getEmployeeId()));

        if (!exists) {
            throw new UnauthorizedActionException("You can create one-on-one meetings only with active employees from the allowed department.");
        }
    }

    @Transactional(readOnly = true)
    public Team requireManagedTeam(Integer teamId, Integer currentUserId) {
        if (teamId == null) {
            throw new RuntimeException("Team is required.");
        }

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found."));

        if (!isActiveTeam(team)) {
            throw new RuntimeException("Selected team is not active.");
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
            throw new RuntimeException("Team is required.");
        }

        assertCanCreateOneOnOne();

        Team team = teamRepository.findById(teamId)
                .orElseThrow(() -> new RuntimeException("Team not found."));

        if (!isActiveTeam(team)) {
            throw new RuntimeException("Selected team is not active.");
        }

        UserPrincipal current = SecurityUtils.currentUser();

        if (isDepartmentHead(current)) {
            Integer allowedDepartmentId = requireAllowedOneOnOneDepartment(requestedDepartmentId);
            Integer teamDepartmentId = team.getDepartment() == null ? null : team.getDepartment().getId();
            if (!Objects.equals(teamDepartmentId, allowedDepartmentId)) {
                throw new UnauthorizedActionException("Selected team is outside your department.");
            }
            return team;
        }

        if (isManager(current)) {
            if (!isManagedByUser(team, SecurityUtils.currentUserId())) {
                throw new UnauthorizedActionException("You can access only teams you lead or manage.");
            }
            return team;
        }

        boolean canSelectDepartment = positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection");
        boolean canSelectAnyTeamInDefaultDepartment = positionPermissionService.currentUserHasPermission("oneOnOneTeamSelection");

        if (canSelectDepartment || canSelectAnyTeamInDefaultDepartment) {
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

        if (isDepartmentHead(current) || isManager(current)) {
            Department defaultDepartment = resolveDefaultDepartment(current)
                    .orElseThrow(() -> new RuntimeException("Your account has no default department for one-on-one meetings."));
            if (requestedDepartmentId != null && !Objects.equals(requestedDepartmentId, defaultDepartment.getId())) {
                throw new UnauthorizedActionException("You can create one-on-one meetings only in your department.");
            }
            return defaultDepartment.getId();
        }

        boolean canSelectDepartment = positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection");

        if (canSelectDepartment) {
            if (requestedDepartmentId == null) {
                throw new RuntimeException("Department is required.");
            }
            return requestedDepartmentId;
        }

        Department defaultDepartment = resolveDefaultDepartment(current)
                .orElseThrow(() -> new RuntimeException("Your account has no default department for one-on-one meetings."));

        if (requestedDepartmentId != null && !Objects.equals(requestedDepartmentId, defaultDepartment.getId())) {
            throw new UnauthorizedActionException("You can create one-on-one meetings only in your default department.");
        }

        return defaultDepartment.getId();
    }

    private boolean canUseDepartmentEmployeeScope() {
        UserPrincipal current = SecurityUtils.currentUser();
        if (isDepartmentHead(current)) {
            return true;
        }
        if (isManager(current)) {
            return false;
        }
        return positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection")
                || positionPermissionService.currentUserHasPermission("oneOnOneTeamSelection");
    }

    private void assertCanCreateOneOnOne() {
        UserPrincipal current = SecurityUtils.currentUser();
        boolean canCreate = !isEmployee(current)
                && (positionPermissionService.currentUserHasPermission("oneOnOneCreate")
                || isManagerOrDepartmentHead(current));
        if (!canCreate) {
            throw new UnauthorizedActionException("Your position does not have permission to create one-on-one meetings.");
        }
    }

    private boolean isEmployee(UserPrincipal principal) {
        if (principal == null || isManagerOrDepartmentHead(principal)) {
            return false;
        }

        String dashboard = normalizeRoleToken(principal.getDashboard());
        if (EMPLOYEE_DASHBOARDS.contains(dashboard)) {
            return true;
        }

        if (principal.getRoles() != null) {
            for (String role : principal.getRoles()) {
                if (EMPLOYEE_ROLES.contains(normalizeRoleToken(role))) {
                    return true;
                }
            }
        }

        return false;
    }

    private boolean isManagerOrDepartmentHead(UserPrincipal principal) {
        return isDepartmentHead(principal) || isManager(principal);
    }

    private boolean isDepartmentHead(UserPrincipal principal) {
        if (principal == null) {
            return false;
        }

        String dashboard = normalizeRoleToken(principal.getDashboard());
        if (DEPARTMENT_HEAD_DASHBOARDS.contains(dashboard)) {
            return true;
        }

        if (principal.getRoles() != null) {
            for (String role : principal.getRoles()) {
                if (DEPARTMENT_HEAD_ROLES.contains(normalizeRoleToken(role))) {
                    return true;
                }
            }
        }

        return false;
    }

    private boolean isManager(UserPrincipal principal) {
        if (principal == null || isDepartmentHead(principal)) {
            return false;
        }

        String dashboard = normalizeRoleToken(principal.getDashboard());
        if (MANAGER_DASHBOARDS.contains(dashboard)) {
            return true;
        }

        if (principal.getRoles() != null) {
            for (String role : principal.getRoles()) {
                if (MANAGER_ROLES.contains(normalizeRoleToken(role))) {
                    return true;
                }
            }
        }

        return false;
    }

    private String normalizeRoleToken(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase();
    }

    private Optional<Department> resolveDefaultDepartment(UserPrincipal current) {
        Optional<User> user = userRepository.findById(current.getId());
        if (user.isPresent() && user.get().getEmployeeId() != null) {
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

        if (current.getDepartmentId() != null) {
            return departmentRepository.findById(current.getDepartmentId());
        }

        return Optional.empty();
    }

    private Department workingDepartmentFromAssignment(EmployeeDepartment assignment) {
        if (assignment == null) {
            return null;
        }

        if (assignment.getCurrentDepartment() != null) {
            return assignment.getCurrentDepartment();
        }

        return assignment.getParentDepartment();
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
        return getActiveEmployeesFromTeam(team).stream()
                .filter(employee -> !isCurrentUserEmployee(employee))
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

    private boolean isCurrentUserEmployee(Employee employee) {
        return employee != null && isCurrentUserEmployeeId(employee.getId());
    }

    private boolean isCurrentUserEmployeeId(Integer employeeId) {
        if (employeeId == null) {
            return false;
        }

        Integer currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null) {
            return false;
        }

        return userRepository.findById(currentUserId)
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(currentEmployeeId -> Objects.equals(currentEmployeeId, employeeId))
                .orElse(false);
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
