package com.epms.service.impl;

import com.epms.dto.PositionDetailResponseDto;
import com.epms.dto.PositionRequestDto;
import com.epms.dto.PositionResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Position;
import com.epms.entity.PositionLevel;
import com.epms.entity.Role;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.PositionLevelRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import com.epms.service.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.LocalDateTime;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PositionServiceImpl implements PositionService {

    private static final int REASON_WORD_LIMIT = 250;

    private final PositionRepository positionRepository;
    private final PositionLevelRepository positionLevelRepository;
    private final RoleRepository roleRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final TeamRepository teamRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public PositionResponseDto create(PositionRequestDto request) {
        validateCreate(request);

        String title = cleanRequired(request.getPositionTitle(), "Position title");

        if (positionRepository.existsByPositionTitleIgnoreCase(title)) {
            throw new RuntimeException("Position title already exists.");
        }

        PositionLevel level = getLevel(request.getLevelId());
        Role role = getRole(request.getRoleId());

        Position position = new Position();
        position.setPositionTitle(title);
        position.setLevel(level);
        position.setRole(role);
        position.setDescription(cleanNullable(request.getDescription()));
        position.setStatus(request.getStatus() == null || Boolean.TRUE.equals(request.getStatus()));
        position.setCreatedBy(cleanRequired(request.getCreatedBy(), "Created by"));

        Position saved = positionRepository.save(position);
        auditLogService.log(currentUserId(), "CREATE", "POSITION", saved.getId(), null, null, "title: " + saved.getPositionTitle(), null);
        return toResponse(saved);
    }

    @Override
    @Transactional(readOnly = true)
    public List<PositionResponseDto> getAll() {
        return positionRepository.findAllByOrderByPositionTitleAsc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public PositionResponseDto getById(Integer id) {
        return toResponse(getPosition(id));
    }

    @Override
    @Transactional(readOnly = true)
    public PositionDetailResponseDto getDetails(Integer id) {
        Position position = getPosition(id);

        List<User> usersWithPosition = userRepository.findAll()
                .stream()
                .filter(user -> hasPosition(user, position.getId()))
                .sorted(Comparator.comparing(this::displayName, String.CASE_INSENSITIVE_ORDER))
                .toList();

        Map<Integer, String> departmentNames = departmentRepository.findAll()
                .stream()
                .collect(Collectors.toMap(
                        Department::getId,
                        Department::getDepartmentName,
                        (first, ignored) -> first,
                        LinkedHashMap::new
                ));

        List<Team> teams = safeTeams();

        List<PositionDetailResponseDto.EmployeeUsage> employeeRows = usersWithPosition
                .stream()
                .map(user -> toEmployeeUsage(user, departmentNames, teams))
                .toList();

        List<PositionDetailResponseDto.DepartmentUsage> departmentRows =
                buildDepartmentUsage(employeeRows, departmentNames);

        int activeCount = (int) employeeRows.stream()
                .filter(row -> Boolean.TRUE.equals(row.getActive()))
                .count();

        int inactiveCount = employeeRows.size() - activeCount;

        int teamCount = employeeRows.stream()
                .flatMap(row -> row.getTeamNames().stream())
                .collect(Collectors.toSet())
                .size();

        return PositionDetailResponseDto.builder()
                .id(position.getId())
                .positionTitle(position.getPositionTitle())
                .levelId(position.getLevel() == null ? null : position.getLevel().getId())
                .levelCode(position.getLevel() == null ? null : position.getLevel().getLevelCode())
                .roleId(position.getRole() == null ? null : position.getRole().getId())
                .roleName(position.getRole() == null ? null : position.getRole().getName())
                .description(position.getDescription())
                .status(Boolean.TRUE.equals(position.getStatus()))
                .createdAt(position.getCreatedAt())
                .createdBy(position.getCreatedBy())
                .totalEmployeeCount(employeeRows.size())
                .activeEmployeeCount(activeCount)
                .inactiveEmployeeCount(inactiveCount)
                .loginAccountCount(employeeRows.size())
                .userOnlyAccountCount(0)
                .departmentCount(departmentRows.size())
                .teamCount(teamCount)
                .departments(departmentRows)
                .employees(employeeRows)
                .userOnlyAccounts(List.of())
                .build();
    }

    @Override
    @Transactional
    public PositionResponseDto update(Integer id, PositionRequestDto request) {
        Position position = getPosition(id);

        validateUpdate(request);

        PositionLevel level = getLevel(request.getLevelId());
        Role role = request.getRoleId() == null ? position.getRole() : getRole(request.getRoleId());

        if (role == null || role.getId() == null) {
            throw new RuntimeException("Dashboard role is required. Every position must connect to a dashboard role.");
        }

        String oldTitle = position.getPositionTitle();
        String oldDescription = position.getDescription();
        String oldStatus = String.valueOf(Boolean.TRUE.equals(position.getStatus()));
        position.setPositionTitle(cleanRequired(request.getPositionTitle(), "Position title"));
        position.setLevel(level);
        position.setRole(role);
        position.setDescription(cleanNullable(request.getDescription()));
        position.setStatus(request.getStatus() == null || Boolean.TRUE.equals(request.getStatus()));

        Position saved = positionRepository.save(position);
        String reason = cleanNullable(request.getReason());
        auditIfChanged(saved.getId(), "positionTitle", oldTitle, saved.getPositionTitle(), reason);
        auditIfChanged(saved.getId(), "description", oldDescription, saved.getDescription(), reason);
        auditIfChanged(saved.getId(), "status", oldStatus, String.valueOf(Boolean.TRUE.equals(saved.getStatus())), reason);
        return toResponse(saved);
    }

    private void auditIfChanged(Integer positionId, String field, String oldValue, String newValue, String reason) {
        if (!Objects.equals(oldValue == null ? "" : oldValue, newValue == null ? "" : newValue)) {
            auditLogService.log(currentUserId(), "UPDATE", "POSITION", positionId, field, oldValue, newValue, reason);
        }
    }

    private Integer currentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private PositionResponseDto toResponse(Position position) {
        if (position == null) {
            return null;
        }

        PositionLevel level = position.getLevel();
        Role role = position.getRole();

        return PositionResponseDto.builder()
                .id(position.getId())
                .positionTitle(position.getPositionTitle())
                .levelId(level == null ? null : level.getId())
                .levelCode(level == null ? null : level.getLevelCode())
                .roleId(role == null ? null : role.getId())
                .roleName(role == null ? null : role.getName())
                .description(position.getDescription())
                .status(Boolean.TRUE.equals(position.getStatus()))
                .createdAt(position.getCreatedAt())
                .createdBy(position.getCreatedBy())
                .build();
    }

    private PositionDetailResponseDto.EmployeeUsage toEmployeeUsage(
            User user,
            Map<Integer, String> departmentNames,
            List<Team> teams
    ) {
        Integer departmentId = asInteger(call(user, "getDepartmentId"));
        String departmentName = departmentId == null
                ? null
                : departmentNames.getOrDefault(departmentId, "Department #" + departmentId);

        List<String> teamNames = new ArrayList<>();
        List<String> teamRoles = new ArrayList<>();

        for (Team team : teams) {
            if (team == null) {
                continue;
            }

            String teamName = stringValue(call(team, "getTeamName"));
            User leader = asUser(call(team, "getTeamLeader"));
            User projectManager = asUser(call(team, "getProjectManager"));

            if (sameUser(leader, user)) {
                teamNames.add(teamName);
                teamRoles.add("Team Leader: " + teamName);
            }

            if (sameUser(projectManager, user)) {
                teamNames.add(teamName);
                teamRoles.add("Project Manager: " + teamName);
            }

            Object membersObj = call(team, "getTeamMembers");
            if (membersObj instanceof Collection<?> members) {
                for (Object obj : members) {
                    if (!(obj instanceof TeamMember member)) {
                        continue;
                    }

                    Object endedDate = call(member, "getEndedDate");
                    if (endedDate != null) {
                        continue;
                    }

                    User memberUser = asUser(call(member, "getMemberUser"));
                    if (sameUser(memberUser, user)) {
                        teamNames.add(teamName);
                        teamRoles.add("Member: " + teamName);
                    }
                }
            }
        }

        teamNames = teamNames.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        teamRoles = teamRoles.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();

        return PositionDetailResponseDto.EmployeeUsage.builder()
                .employeeId(asInteger(call(user, "getEmployeeId")))
                .userId(user.getId())
                .employeeCode(stringValue(call(user, "getEmployeeCode")))
                .fullName(displayName(user))
                .email(stringValue(call(user, "getEmail")))
                .phoneNumber(stringValue(call(user, "getPhoneNumber")))
                .active(activeUser(user))
                .loginAccountCreated(Boolean.TRUE)
                .accountStatus(stringValue(call(user, "getAccountStatus")))
                .joinDate(stringValue(call(user, "getJoinDate")))
                .currentDepartmentId(departmentId)
                .currentDepartment(departmentName)
                .workingDepartmentId(departmentId)
                .workingDepartment(departmentName)
                .usageDepartmentId(departmentId)
                .usageDepartmentName(departmentName)
                .departmentUsageLabel(departmentName == null ? "No department" : "User department")
                .departmentStartDate(null)
                .departmentEndDate(null)
                .teamNames(teamNames)
                .teamRoles(teamRoles)
                .build();
    }

    private List<PositionDetailResponseDto.DepartmentUsage> buildDepartmentUsage(
            List<PositionDetailResponseDto.EmployeeUsage> employees,
            Map<Integer, String> departmentNames
    ) {
        Map<Integer, List<PositionDetailResponseDto.EmployeeUsage>> grouped = employees.stream()
                .collect(Collectors.groupingBy(
                        row -> row.getUsageDepartmentId() == null ? -1 : row.getUsageDepartmentId(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));

        return grouped.entrySet()
                .stream()
                .map(entry -> {
                    Integer departmentId = entry.getKey() == -1 ? null : entry.getKey();
                    List<PositionDetailResponseDto.EmployeeUsage> rows = entry.getValue();

                    int active = (int) rows.stream()
                            .filter(row -> Boolean.TRUE.equals(row.getActive()))
                            .count();

                    String departmentName = departmentId == null
                            ? "No Department"
                            : departmentNames.getOrDefault(departmentId, "Department #" + departmentId);

                    return PositionDetailResponseDto.DepartmentUsage.builder()
                            .departmentId(departmentId)
                            .departmentName(departmentName)
                            .departmentCode(departmentId == null ? null : String.valueOf(departmentId))
                            .employeeCount(rows.size())
                            .activeEmployeeCount(active)
                            .inactiveEmployeeCount(rows.size() - active)
                            .loginAccountCount(rows.size())
                            .userOnlyAccountCount(0)
                            .employeeNames(rows.stream()
                                    .map(PositionDetailResponseDto.EmployeeUsage::getFullName)
                                    .filter(Objects::nonNull)
                                    .distinct()
                                    .toList())
                            .build();
                })
                .sorted(Comparator.comparing(PositionDetailResponseDto.DepartmentUsage::getDepartmentName, String.CASE_INSENSITIVE_ORDER))
                .toList();
    }

    private List<Team> safeTeams() {
        try {
            return teamRepository.findAll();
        } catch (Exception ignored) {
            return List.of();
        }
    }

    private Position getPosition(Integer id) {
        if (id == null) {
            throw new ResourceNotFoundException("Position id is required.");
        }

        return positionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found with id: " + id));
    }

    private PositionLevel getLevel(Integer levelId) {
        if (levelId == null) {
            throw new RuntimeException("Position level is required.");
        }

        return positionLevelRepository.findById(levelId)
                .orElseThrow(() -> new ResourceNotFoundException("Position level not found with id: " + levelId));
    }

    private Role getRole(Integer roleId) {
        if (roleId == null) {
            throw new RuntimeException("Role is required.");
        }

        return roleRepository.findById(roleId)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + roleId));
    }

    private void validateCreate(PositionRequestDto request) {
        if (request == null) {
            throw new RuntimeException("Position payload is required.");
        }

        cleanRequired(request.getPositionTitle(), "Position title");
        getLevel(request.getLevelId());
        getRole(request.getRoleId());
        cleanRequired(request.getCreatedBy(), "Created by");
    }

    private void validateUpdate(PositionRequestDto request) {
        if (request == null) {
            throw new RuntimeException("Position payload is required.");
        }

        cleanRequired(request.getPositionTitle(), "Position title");
        getLevel(request.getLevelId());

        if (request.getRoleId() != null) {
            getRole(request.getRoleId());
        }

        String reason = cleanRequired(request.getReason(), "Reason");
        validateReason(reason);
    }

    private void validateReason(String reason) {
        String[] words = reason.trim().split("\\s+");

        if (words.length > REASON_WORD_LIMIT) {
            throw new RuntimeException("Cannot exceed more than 250 words.");
        }
    }

    private String cleanRequired(String value, String label) {
        if (value == null || value.trim().isEmpty()) {
            throw new RuntimeException(label + " is required.");
        }

        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }

    private boolean hasPosition(User user, Integer positionId) {
        return user != null
                && user.getPosition() != null
                && user.getPosition().getId() != null
                && user.getPosition().getId().equals(positionId);
    }

    private boolean sameUser(User first, User second) {
        return first != null
                && second != null
                && first.getId() != null
                && first.getId().equals(second.getId());
    }

    private boolean activeUser(User user) {
        Object active = call(user, "getActive");

        if (active instanceof Boolean bool) {
            return bool;
        }

        return true;
    }

    private String displayName(User user) {
        if (user == null) {
            return "Unknown User";
        }

        String fullName = stringValue(call(user, "getFullName"));
        if (fullName != null && !fullName.isBlank()) {
            return fullName;
        }

        String firstName = stringValue(call(user, "getFirstName"));
        String lastName = stringValue(call(user, "getLastName"));
        String combined = ((firstName == null ? "" : firstName) + " " + (lastName == null ? "" : lastName)).trim();

        if (!combined.isBlank()) {
            return combined;
        }

        String email = stringValue(call(user, "getEmail"));
        if (email != null && !email.isBlank()) {
            return email;
        }

        return "User #" + user.getId();
    }

    private Object call(Object target, String methodName) {
        if (target == null || methodName == null) {
            return null;
        }

        try {
            Method method = target.getClass().getMethod(methodName);
            return method.invoke(target);
        } catch (Exception ignored) {
            return null;
        }
    }

    private String stringValue(Object value) {
        if (value == null) {
            return null;
        }

        return String.valueOf(value);
    }

    private Integer asInteger(Object value) {
        if (value == null) {
            return null;
        }

        if (value instanceof Integer integer) {
            return integer;
        }

        if (value instanceof Number number) {
            return number.intValue();
        }

        try {
            return Integer.parseInt(String.valueOf(value));
        } catch (Exception ignored) {
            return null;
        }
    }

    private User asUser(Object value) {
        return value instanceof User user ? user : null;
    }
}
