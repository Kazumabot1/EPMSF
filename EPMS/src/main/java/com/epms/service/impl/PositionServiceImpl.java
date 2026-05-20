package com.epms.service.impl;

import com.epms.dto.PositionDetailResponseDto;
import com.epms.dto.PositionPermissionDto;
import com.epms.dto.PositionRequestDto;
import com.epms.dto.PositionResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeDepartment;
import com.epms.entity.Position;
import com.epms.entity.PositionLevel;
import com.epms.entity.Role;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.PositionLevelRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import com.epms.service.PositionPermissionService;
import com.epms.service.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class PositionServiceImpl implements PositionService {

    private static final String ENTITY_TYPE = "POSITION";

    private final PositionRepository positionRepository;
    private final PositionLevelRepository positionLevelRepository;
    private final EmployeeRepository employeeRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final AuditLogService auditLogService;
    private final PositionPermissionService positionPermissionService;

    @Override
    @Transactional
    public PositionResponseDto create(PositionRequestDto dto) {
        PositionLevel level = getLevelById(dto.getLevelId());
        Role role = getRoleById(dto.getRoleId());

        Position position = new Position();
        position.setPositionTitle(normalizeRequired(dto.getPositionTitle(), "Position title is required."));
        position.setLevel(level);
        position.setRole(role);
        position.setDescription(normalizeText(dto.getDescription()));
        position.setStatus(dto.getStatus() != null ? dto.getStatus() : Boolean.TRUE);
        position.setCreatedBy(normalizeText(dto.getCreatedBy()));

        Position savedPosition = positionRepository.save(position);
        positionPermissionService.savePermissions(
                savedPosition.getId(),
                dto.getPermissions() != null ? dto.getPermissions() : new PositionPermissionDto()
        );
        return mapToResponseDto(savedPosition);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PositionResponseDto> getAll() {
        return positionRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PositionResponseDto getById(Integer id) {
        Position position = getPositionById(id);
        return mapToResponseDto(position);
    }

    @Override
    @Transactional(readOnly = true)
    public PositionDetailResponseDto getDetails(Integer id) {
        Position position = getPositionById(id);
        List<Employee> employees = employeeRepository.findByPositionIdForPositionDetails(id);
        List<User> usersWithPosition = userRepository.findByPositionIdForPositionDetails(id);

        Set<Integer> employeeIds = new LinkedHashSet<>();
        for (Employee employee : employees) {
            if (employee != null && employee.getId() != null) {
                employeeIds.add(employee.getId());
            }
        }

        Map<String, DepartmentUsageAccumulator> departmentUsage = new LinkedHashMap<>();
        Map<Integer, Department> departmentCache = new LinkedHashMap<>();
        List<PositionDetailResponseDto.EmployeeUsageDto> employeeDtos = new ArrayList<>();
        List<PositionDetailResponseDto.UserOnlyAccountDto> userOnlyDtos = new ArrayList<>();
        Set<Integer> teamIds = new LinkedHashSet<>();

        int activeEmployeeCount = 0;
        int inactiveEmployeeCount = 0;
        int loginAccountCount = 0;

        for (Employee employee : employees) {
            User linkedUser = employee.getId() == null
                    ? null
                    : userRepository.findByEmployeeId(employee.getId()).orElse(null);

            if (linkedUser != null) {
                loginAccountCount++;
            }

            boolean activeEmployee = activeValue(employee.getActive());
            if (activeEmployee) {
                activeEmployeeCount++;
            } else {
                inactiveEmployeeCount++;
            }

            EmployeeDepartment assignment = getActiveAssignment(employee);
            if (assignment == null) {
                assignment = getLatestAssignment(employee);
            }

            Department currentDepartment = assignment != null ? assignment.getCurrentDepartment() : null;
            Department workingDepartment = getWorkingDepartment(assignment);
            Department usageDepartment = workingDepartment != null
                    ? workingDepartment
                    : departmentForUser(linkedUser, departmentCache);

            TeamInfo teamInfo = teamInfoForUser(linkedUser);
            teamIds.addAll(teamInfo.teamIds());

            PositionDetailResponseDto.EmployeeUsageDto employeeDto = new PositionDetailResponseDto.EmployeeUsageDto();
            employeeDto.setEmployeeId(employee.getId());
            employeeDto.setUserId(linkedUser != null ? linkedUser.getId() : null);
            employeeDto.setEmployeeCode(linkedUser != null ? linkedUser.getEmployeeCode() : null);
            employeeDto.setFullName(employeeName(employee));
            employeeDto.setEmail(employee.getEmail());
            employeeDto.setPhoneNumber(employee.getPhoneNumber());
            employeeDto.setActive(activeEmployee);
            employeeDto.setLoginAccountCreated(linkedUser != null);
            employeeDto.setAccountStatus(linkedUser != null ? linkedUser.getAccountStatus() : null);
            employeeDto.setJoinDate(linkedUser != null ? linkedUser.getJoinDate() : null);
            employeeDto.setCurrentDepartmentId(currentDepartment != null ? currentDepartment.getId() : null);
            employeeDto.setCurrentDepartment(currentDepartment != null ? currentDepartment.getDepartmentName() : null);
            employeeDto.setWorkingDepartmentId(workingDepartment != null ? workingDepartment.getId() : null);
            employeeDto.setWorkingDepartment(workingDepartment != null ? workingDepartment.getDepartmentName() : null);
            employeeDto.setUsageDepartmentId(usageDepartment != null ? usageDepartment.getId() : null);
            employeeDto.setUsageDepartmentName(usageDepartment != null ? usageDepartment.getDepartmentName() : null);
            employeeDto.setDepartmentUsageLabel(departmentUsageLabel(currentDepartment, workingDepartment));
            employeeDto.setDepartmentStartDate(assignment != null ? assignment.getStartdate() : null);
            employeeDto.setDepartmentEndDate(assignment != null ? assignment.getEnddate() : null);
            employeeDto.setTeamNames(new ArrayList<>(teamInfo.teamNames()));
            employeeDto.setTeamRoles(new ArrayList<>(teamInfo.teamRoles()));
            employeeDtos.add(employeeDto);

            addDepartmentUsage(
                    departmentUsage,
                    usageDepartment,
                    true,
                    activeEmployee,
                    linkedUser != null,
                    false,
                    employeeDto.getFullName()
            );
        }

        for (User user : usersWithPosition) {
            if (user == null) {
                continue;
            }

            Integer linkedEmployeeId = user.getEmployeeId();
            if (linkedEmployeeId != null && employeeIds.contains(linkedEmployeeId)) {
                continue;
            }

            Department department = departmentForUser(user, departmentCache);
            TeamInfo teamInfo = teamInfoForUser(user);
            teamIds.addAll(teamInfo.teamIds());

            PositionDetailResponseDto.UserOnlyAccountDto accountDto = new PositionDetailResponseDto.UserOnlyAccountDto();
            accountDto.setUserId(user.getId());
            accountDto.setFullName(displayName(user));
            accountDto.setEmail(user.getEmail());
            accountDto.setEmployeeCode(user.getEmployeeCode());
            accountDto.setActive(activeValue(user.getActive()));
            accountDto.setAccountStatus(user.getAccountStatus());
            accountDto.setJoinDate(user.getJoinDate());
            accountDto.setDepartmentId(department != null ? department.getId() : user.getDepartmentId());
            accountDto.setDepartmentName(department != null ? department.getDepartmentName() : null);
            userOnlyDtos.add(accountDto);

            loginAccountCount++;
            addDepartmentUsage(
                    departmentUsage,
                    department,
                    false,
                    false,
                    true,
                    true,
                    accountDto.getFullName()
            );
        }

        PositionDetailResponseDto response = new PositionDetailResponseDto();
        PositionResponseDto summary = mapToResponseDto(position);
        response.setId(summary.getId());
        response.setPositionTitle(summary.getPositionTitle());
        response.setLevelId(summary.getLevelId());
        response.setLevelCode(summary.getLevelCode());
        response.setDescription(summary.getDescription());
        response.setStatus(summary.getStatus());
        response.setCreatedAt(summary.getCreatedAt());
        response.setCreatedBy(summary.getCreatedBy());
        response.setTotalEmployeeCount(employees.size());
        response.setActiveEmployeeCount(activeEmployeeCount);
        response.setInactiveEmployeeCount(inactiveEmployeeCount);
        response.setLoginAccountCount(loginAccountCount);
        response.setUserOnlyAccountCount(userOnlyDtos.size());
        response.setDepartmentCount(departmentUsage.size());
        response.setTeamCount(teamIds.size());
        response.setEmployees(employeeDtos);
        response.setUserOnlyAccounts(userOnlyDtos);
        response.setDepartments(
                departmentUsage.values()
                        .stream()
                        .sorted(Comparator.comparing(DepartmentUsageAccumulator::sortName, String.CASE_INSENSITIVE_ORDER))
                        .map(DepartmentUsageAccumulator::toDto)
                        .toList()
        );

        return response;
    }

    @Override
    @Transactional
    public PositionResponseDto update(Integer id, PositionRequestDto dto) {
        Position existingPosition = getPositionById(id);
        PositionLevel newLevel = getLevelById(dto.getLevelId());
        Role newRole = getRoleById(dto.getRoleId());

        String newTitle = normalizeRequired(dto.getPositionTitle(), "Position title is required.");
        String newDescription = normalizeText(dto.getDescription());
        Boolean newStatus = dto.getStatus() != null ? dto.getStatus() : activeValue(existingPosition.getStatus());

        String oldTitle = existingPosition.getPositionTitle();
        PositionLevel oldLevel = existingPosition.getLevel();
        Role oldRole = existingPosition.getRole();
        String oldDescription = existingPosition.getDescription();
        Boolean oldStatus = existingPosition.getStatus();

        boolean changed = !Objects.equals(valueOrBlank(oldTitle), valueOrBlank(newTitle))
                || !Objects.equals(oldLevel != null ? oldLevel.getId() : null, newLevel.getId())
                || !Objects.equals(oldRole != null ? oldRole.getId() : null, newRole != null ? newRole.getId() : null)
                || !Objects.equals(valueOrBlank(oldDescription), valueOrBlank(newDescription))
                || !Objects.equals(activeValue(oldStatus), activeValue(newStatus));

        String reason = normalizeReason(dto.getReason(), changed);

        existingPosition.setPositionTitle(newTitle);
        existingPosition.setLevel(newLevel);
        existingPosition.setRole(newRole);
        existingPosition.setDescription(newDescription);
        existingPosition.setStatus(newStatus);

        Position updatedPosition = positionRepository.save(existingPosition);
        if (!Objects.equals(oldRole != null ? oldRole.getId() : null, newRole != null ? newRole.getId() : null)) {
            syncUserRolesForPosition(updatedPosition, newRole);
        }
        if (dto.getPermissions() != null) {
            positionPermissionService.savePermissions(updatedPosition.getId(), dto.getPermissions());
        }
        Integer userId = currentUserId();

        logIfChanged(userId, updatedPosition.getId(), "positionTitle", oldTitle, updatedPosition.getPositionTitle(), reason);
        logIfChanged(userId, updatedPosition.getId(), "positionLevel", levelLabel(oldLevel), levelLabel(updatedPosition.getLevel()), reason);
        logIfChanged(userId, updatedPosition.getId(), "role", roleLabel(oldRole), roleLabel(updatedPosition.getRole()), reason);
        logIfChanged(userId, updatedPosition.getId(), "description", oldDescription, updatedPosition.getDescription(), reason);
        logIfChanged(userId, updatedPosition.getId(), "status", activeText(oldStatus), activeText(updatedPosition.getStatus()), reason);

        return mapToResponseDto(updatedPosition);
    }

    @Override
    @Transactional
    public void delete(Integer id) {
        Position existingPosition = getPositionById(id);
        positionRepository.delete(existingPosition);
    }

    private Position getPositionById(Integer id) {
        return positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + id));
    }

    private PositionLevel getLevelById(Integer levelId) {
        if (levelId == null) {
            throw new BadRequestException("Level id must not be null");
        }

        return positionLevelRepository.findById(levelId)
                .orElseThrow(() -> new ResourceNotFoundException("Position level not found with id: " + levelId));
    }

    private Role getRoleById(Integer roleId) {
        if (roleId == null) {
            return null;
        }

        return roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + roleId));
    }

    private PositionResponseDto mapToResponseDto(Position position) {
        PositionLevel level = position.getLevel();
        Role role = position.getRole();

        Integer levelId = level != null ? level.getId() : null;
        String levelCode = level != null ? level.getLevelCode() : null;
        Integer roleId = role != null ? role.getId() : null;
        String roleName = role != null ? role.getName() : null;
        PositionPermissionDto permissions = position.getId() == null
                ? new PositionPermissionDto()
                : positionPermissionService.getByPositionId(position.getId());

        return new PositionResponseDto(
                position.getId(),
                position.getPositionTitle(),
                levelId,
                levelCode,
                position.getDescription(),
                position.getStatus(),
                position.getCreatedAt(),
                position.getCreatedBy(),
                roleId,
                roleName,
                permissions
        );
    }

    private void addDepartmentUsage(
            Map<String, DepartmentUsageAccumulator> usage,
            Department department,
            boolean countEmployee,
            boolean activeEmployee,
            boolean hasLoginAccount,
            boolean userOnlyAccount,
            String displayName
    ) {
        String key = department != null && department.getId() != null
                ? "department-" + department.getId()
                : "no-department";

        DepartmentUsageAccumulator bucket = usage.computeIfAbsent(
                key,
                ignored -> new DepartmentUsageAccumulator(department)
        );

        if (countEmployee) {
            bucket.employeeCount++;
            if (activeEmployee) {
                bucket.activeEmployeeCount++;
            } else {
                bucket.inactiveEmployeeCount++;
            }
        }

        if (hasLoginAccount) {
            bucket.loginAccountCount++;
        }

        if (userOnlyAccount) {
            bucket.userOnlyAccountCount++;
        }

        if (displayName != null && !displayName.isBlank()) {
            bucket.employeeNames.add(displayName);
        }
    }

    private EmployeeDepartment getActiveAssignment(Employee employee) {
        if (employee == null || employee.getEmployeeDepartments() == null) {
            return null;
        }

        return employee.getEmployeeDepartments()
                .stream()
                .filter(Objects::nonNull)
                .filter(assignment -> assignment.getEnddate() == null)
                .max(Comparator.comparing(
                        assignment -> assignment.getStartdate() == null ? new Date(0) : assignment.getStartdate()
                ))
                .orElse(null);
    }

    private EmployeeDepartment getLatestAssignment(Employee employee) {
        if (employee == null || employee.getEmployeeDepartments() == null) {
            return null;
        }

        return employee.getEmployeeDepartments()
                .stream()
                .filter(Objects::nonNull)
                .max(Comparator.comparing(
                        assignment -> assignment.getStartdate() == null ? new Date(0) : assignment.getStartdate()
                ))
                .orElse(null);
    }

    private Department getWorkingDepartment(EmployeeDepartment assignment) {
        if (assignment == null) {
            return null;
        }

        return assignment.getParentDepartment() != null
                ? assignment.getParentDepartment()
                : assignment.getCurrentDepartment();
    }

    private Department departmentForUser(User user, Map<Integer, Department> cache) {
        if (user == null || user.getDepartmentId() == null) {
            return null;
        }

        Integer departmentId = user.getDepartmentId();
        if (cache.containsKey(departmentId)) {
            return cache.get(departmentId);
        }

        Department department = departmentRepository.findById(departmentId).orElse(null);
        cache.put(departmentId, department);
        return department;
    }

    private String departmentUsageLabel(Department currentDepartment, Department workingDepartment) {
        if (workingDepartment == null && currentDepartment == null) {
            return "No department assigned";
        }

        if (workingDepartment == null) {
            return "Current department";
        }

        if (currentDepartment == null || Objects.equals(currentDepartment.getId(), workingDepartment.getId())) {
            return "Current department";
        }

        return "Working department";
    }

    private TeamInfo teamInfoForUser(User user) {
        if (user == null || user.getId() == null) {
            return new TeamInfo(Set.of(), Set.of(), Set.of());
        }

        Set<Integer> teamIds = new LinkedHashSet<>();
        Set<String> teamNames = new LinkedHashSet<>();
        Set<String> teamRoles = new LinkedHashSet<>();

        for (TeamMember member : teamMemberRepository.findByMemberUserId(user.getId())) {
            if (member == null || member.getEndedDate() != null || member.getTeam() == null) {
                continue;
            }

            Team team = member.getTeam();
            addTeam(team, "Member", teamIds, teamNames, teamRoles);
        }

        for (Team team : teamRepository.findByTeamLeaderId(user.getId())) {
            addTeam(team, "Team Leader", teamIds, teamNames, teamRoles);
        }

        for (Team team : teamRepository.findByProjectManagerId(user.getId())) {
            addTeam(team, "Project Manager", teamIds, teamNames, teamRoles);
        }

        return new TeamInfo(teamIds, teamNames, teamRoles);
    }

    private void addTeam(
            Team team,
            String role,
            Set<Integer> teamIds,
            Set<String> teamNames,
            Set<String> teamRoles
    ) {
        if (team == null || team.getId() == null || !isActiveTeam(team)) {
            return;
        }

        teamIds.add(team.getId());

        String teamName = team.getTeamName() != null && !team.getTeamName().isBlank()
                ? team.getTeamName()
                : "Team #" + team.getId();
        teamNames.add(teamName);
        teamRoles.add(role + " - " + teamName);
    }

    private boolean isActiveTeam(Team team) {
        return team != null && team.getStatus() != null && team.getStatus().equalsIgnoreCase("Active");
    }

    private String employeeName(Employee employee) {
        if (employee == null) {
            return "Unknown employee";
        }

        String firstName = valueOrBlank(employee.getFirstName());
        String lastName = valueOrBlank(employee.getLastName());
        String fullName = (firstName + " " + lastName).trim();

        if (!fullName.isBlank()) {
            return fullName;
        }

        if (employee.getEmail() != null && !employee.getEmail().isBlank()) {
            return employee.getEmail();
        }

        return "Employee #" + employee.getId();
    }

    private String displayName(User user) {
        if (user == null) {
            return "Unknown user";
        }

        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }

        if (user.getEmail() != null && !user.getEmail().isBlank()) {
            return user.getEmail();
        }

        return "User #" + user.getId();
    }

    private void logIfChanged(Integer userId, Integer entityId, String column, String oldValue, String newValue, String reason) {
        if (!Objects.equals(valueOrBlank(oldValue), valueOrBlank(newValue))) {
            auditLogService.log(userId, "UPDATE", ENTITY_TYPE, entityId, column, oldValue, newValue, reason);
        }
    }

    private String normalizeRequired(String value, String message) {
        String normalized = normalizeText(value);
        if (normalized == null) {
            throw new BadRequestException(message);
        }
        return normalized;
    }

    private String normalizeText(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }

    private String normalizeReason(String reason, boolean required) {
        String normalized = normalizeText(reason);
        if (required && normalized == null) {
            throw new BadRequestException("Reason is required for edit or deactivate.");
        }
        if (normalized != null && normalized.length() > 150) {
            throw new BadRequestException("Reason must not exceed 150 characters.");
        }
        return normalized;
    }

    private String levelLabel(PositionLevel level) {
        if (level == null) {
            return null;
        }
        return level.getLevelCode() != null ? level.getLevelCode() : String.valueOf(level.getId());
    }

    private String roleLabel(Role role) {
        if (role == null) {
            return null;
        }

        return role.getName();
    }

    private void syncUserRolesForPosition(Position position, Role role) {
        if (position == null || position.getId() == null || role == null || role.getId() == null) {
            return;
        }

        List<User> users = userRepository.findByPositionIdForPositionDetails(position.getId());

        for (User user : users) {
            if (user == null || user.getId() == null) {
                continue;
            }

            userRoleRepository.deleteAll(userRoleRepository.findByUserId(user.getId()));

            UserRole userRole = new UserRole();
            userRole.setUserId(user.getId());
            userRole.setRoleId(role.getId());
            userRoleRepository.save(userRole);
        }
    }

    private Boolean activeValue(Boolean value) {
        return value == null || Boolean.TRUE.equals(value);
    }

    private String activeText(Boolean value) {
        return activeValue(value) ? "Active" : "Inactive";
    }

    private String valueOrBlank(String value) {
        return value == null ? "" : value;
    }

    private Integer currentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private record TeamInfo(Set<Integer> teamIds, Set<String> teamNames, Set<String> teamRoles) {
    }

    private static class DepartmentUsageAccumulator {
        private final Integer departmentId;
        private final String departmentName;
        private final String departmentCode;
        private int employeeCount;
        private int activeEmployeeCount;
        private int inactiveEmployeeCount;
        private int loginAccountCount;
        private int userOnlyAccountCount;
        private final Set<String> employeeNames = new LinkedHashSet<>();

        private DepartmentUsageAccumulator(Department department) {
            this.departmentId = department != null ? department.getId() : null;
            this.departmentName = department != null && department.getDepartmentName() != null
                    ? department.getDepartmentName()
                    : "No department assigned";
            this.departmentCode = department != null ? department.getDepartmentCode() : null;
        }

        private String sortName() {
            return departmentName == null ? "" : departmentName;
        }

        private PositionDetailResponseDto.DepartmentUsageDto toDto() {
            PositionDetailResponseDto.DepartmentUsageDto dto = new PositionDetailResponseDto.DepartmentUsageDto();
            dto.setDepartmentId(departmentId);
            dto.setDepartmentName(departmentName);
            dto.setDepartmentCode(departmentCode);
            dto.setEmployeeCount(employeeCount);
            dto.setActiveEmployeeCount(activeEmployeeCount);
            dto.setInactiveEmployeeCount(inactiveEmployeeCount);
            dto.setLoginAccountCount(loginAccountCount);
            dto.setUserOnlyAccountCount(userOnlyAccountCount);
            dto.setEmployeeNames(new ArrayList<>(employeeNames));
            return dto;
        }
    }
}
