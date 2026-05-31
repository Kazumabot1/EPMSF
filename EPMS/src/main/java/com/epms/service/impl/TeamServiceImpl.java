package com.epms.service.impl;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.TeamHistoryResponseDto;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.entity.Department;
import com.epms.entity.PositionPermission;
import com.epms.entity.Role;
import com.epms.entity.Team;
import com.epms.entity.TeamHistory;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.UserRole;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.notification.NotificationEventKey;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.TeamHistoryRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.NotificationService;
import com.epms.service.PositionPermissionService;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.Date;
import java.util.HashSet;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private static final String DEFAULT_CREATE_REASON = "Initial team creation";
    private static final int REASON_WORD_LIMIT = 250;

    private final TeamRepository teamRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final EmployeeDepartmentRepository employeeDepartmentRepository;
    private final TeamHistoryRepository teamHistoryRepository;
    private final NotificationService notificationService;
    private final UserRoleRepository userRoleRepository;
    private final RoleRepository roleRepository;
    private final PositionPermissionService positionPermissionService;

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getAllTeams() {
        return teamRepository.findAll()
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponseDto getTeamById(Integer id) {
        Team team = getTeamOrThrow(id);
        return toDto(team);
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getTeamsByDepartment(Integer departmentId) {
        return teamRepository.findByDepartmentId(departmentId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional
    public TeamResponseDto createTeam(TeamRequestDto request) {
        assertCurrentUserCanCreateTeams();
        validateCreateRequest(request);
        assertDepartmentHeadRequestInsideOwnDepartment(request.getDepartmentId());

        Department department = getDepartmentOrThrow(request.getDepartmentId());
        User teamLeader = getActiveUserOrThrow(request.getTeamLeaderId(), "Team Leader");
        User projectManager = resolveProjectManager(request.getProjectManagerId(), department, teamLeader);

        validateTeamLeaderPermission(teamLeader);
        validateUserInWorkingDepartment(teamLeader, department.getId(), "Team Leader");
        validateTeamLeaderAvailability(teamLeader, null);

        Team team = new Team();
        team.setTeamName(cleanRequired(request.getTeamName(), "Team name"));
        team.setDepartment(department);
        team.setTeamLeader(teamLeader);
        team.setProjectManager(projectManager);
        team.setCreatedByUser(resolveCreatedBy(request.getCreatedById()));
        team.setCreatedDate(new Date());
        team.setTeamGoal(cleanNullable(request.getTeamGoal()));
        team.setStatus(cleanStatus(request.getStatus()));

        List<Integer> memberIds = safeIds(request.getEffectiveMemberUserIds());
        validateMembers(memberIds, department, teamLeader, projectManager, null, Set.of());

        for (Integer memberId : memberIds) {
            User memberUser = getActiveUserOrThrow(memberId, "Team member");

            TeamMember member = new TeamMember();
            member.setMemberUser(memberUser);
            member.setStartedDate(new Date());
            member.setEndedDate(null);

            team.addTeamMember(member);
        }

        Team saved = teamRepository.save(team);

        User editor = getCurrentUserOrNull();

        recordHistory(
                saved,
                "TEAM_CREATED",
                "team",
                null,
                saved.getTeamName(),
                DEFAULT_CREATE_REASON,
                editor
        );

        sendTeamNotification(
                saved,
                NotificationEventKey.TEAM_CREATED,
                "Team Modified",
                "Team " + saved.getTeamName() + " was created. By " + displayUser(editor) + ".",
                Set.of()
        );

        return toDto(saved);
    }

    @Override
    @Transactional
    public TeamResponseDto updateTeam(Integer id, TeamRequestDto request) {
        assertCurrentUserCanEditTeams();
        Team team = getTeamOrThrow(id);
        validateUpdateRequest(request);

        User editor = getCurrentUserOrNull();
        String reason = cleanRequired(request.getReason(), "Reason");
        validateReason(reason);

        Department department = request.getDepartmentId() != null
                ? getDepartmentOrThrow(request.getDepartmentId())
                : team.getDepartment();

        assertDepartmentHeadCanUpdateTeam(team, department != null ? department.getId() : null);

        User oldLeader = team.getTeamLeader();
        User oldProjectManager = team.getProjectManager();

        String oldName = team.getTeamName();
        String oldGoal = team.getTeamGoal();
        String oldStatus = team.getStatus();

        Set<Integer> oldMemberIds = activeMemberIds(team);
        Set<Integer> extraRecipients = new HashSet<>();

        if (oldLeader != null) {
            extraRecipients.add(oldLeader.getId());
        }

        if (oldProjectManager != null) {
            extraRecipients.add(oldProjectManager.getId());
        }

        User newLeader = request.getTeamLeaderId() != null
                ? getActiveUserOrThrow(request.getTeamLeaderId(), "Team Leader")
                : oldLeader;

        if (newLeader == null) {
            throw new BusinessValidationException("Team Leader is required.");
        }

        User newProjectManager = resolveProjectManager(
                request.getProjectManagerId(),
                department,
                newLeader
        );

        validateTeamLeaderPermission(newLeader);
        validateUserInWorkingDepartment(newLeader, department.getId(), "Team Leader");
        validateTeamLeaderAvailability(newLeader, team.getId());

        List<Integer> newMemberIdsList = safeIds(request.getEffectiveMemberUserIds());
        validateMembers(newMemberIdsList, department, newLeader, newProjectManager, team.getId(), oldMemberIds);
        Set<Integer> newMemberIds = new LinkedHashSet<>(newMemberIdsList);

        String newName = cleanRequired(request.getTeamName(), "Team name");
        String newGoal = cleanNullable(request.getTeamGoal());
        String newStatus = cleanStatus(request.getStatus());

        team.setTeamName(newName);
        team.setDepartment(department);
        team.setTeamLeader(newLeader);
        team.setProjectManager(newProjectManager);
        team.setTeamGoal(newGoal);
        team.setStatus(newStatus);

        applyMemberChanges(team, oldMemberIds, newMemberIds);

        Team saved = teamRepository.save(team);

        List<String> notificationParts = new ArrayList<>();

        if (!Objects.equals(oldName, newName)) {
            recordHistory(saved, "TEAM_NAME_CHANGED", "Team Name", oldName, newName, reason, editor);
            notificationParts.add("Team name changed from " + oldName + " to " + newName);
        }

        if (!Objects.equals(nullToEmpty(oldGoal), nullToEmpty(newGoal))) {
            recordHistory(saved, "TEAM_GOAL_CHANGED", "Team Goal", oldGoal, newGoal, reason, editor);
            notificationParts.add("Team goal was updated");
        }

        if (!sameUser(oldLeader, newLeader)) {
            recordHistory(
                    saved,
                    "TEAM_LEADER_CHANGED",
                    "Team Leader",
                    displayUser(oldLeader),
                    displayUser(newLeader),
                    reason,
                    editor
            );

            notificationParts.add(
                    "Team Leader changed from " + displayUser(oldLeader) + " to " + displayUser(newLeader)
            );
        }

        if (!sameUser(oldProjectManager, newProjectManager)) {
            recordHistory(
                    saved,
                    "PROJECT_MANAGER_CHANGED",
                    "Project Manager",
                    displayUser(oldProjectManager),
                    displayUser(newProjectManager),
                    reason,
                    editor
            );

            notificationParts.add(
                    "Project Manager changed from "
                            + displayUser(oldProjectManager)
                            + " to "
                            + displayUser(newProjectManager)
            );
        }

        if (!Objects.equals(normalizeStatus(oldStatus), normalizeStatus(newStatus))) {
            recordHistory(saved, "STATUS_CHANGED", "Status", oldStatus, newStatus, reason, editor);

            if ("inactive".equalsIgnoreCase(newStatus)) {
                notificationParts.add("Team " + saved.getTeamName() + " has gone Inactive");
            } else {
                notificationParts.add("Team " + saved.getTeamName() + " has gone Active");
            }
        }

        Set<Integer> addedMembers = new LinkedHashSet<>(newMemberIds);
        addedMembers.removeAll(oldMemberIds);

        for (Integer memberId : addedMembers) {
            User member = userRepository.findById(memberId).orElse(null);

            recordHistory(
                    saved,
                    "MEMBER_ADDED",
                    "Member",
                    null,
                    displayUser(member),
                    reason,
                    editor
            );

            notificationParts.add(displayUser(member) + " has been added to the team");

            if (member != null) {
                extraRecipients.add(member.getId());
            }
        }

        Set<Integer> removedMembers = new LinkedHashSet<>(oldMemberIds);
        removedMembers.removeAll(newMemberIds);

        for (Integer memberId : removedMembers) {
            User member = userRepository.findById(memberId).orElse(null);

            recordHistory(
                    saved,
                    "MEMBER_REMOVED",
                    "Member",
                    displayUser(member),
                    null,
                    reason,
                    editor
            );

            notificationParts.add(displayUser(member) + " has been removed from the team");

            if (member != null) {
                extraRecipients.add(member.getId());
            }
        }

        if (!notificationParts.isEmpty()) {
            String message = String.join(". ", notificationParts)
                    + ". Reason: "
                    + reason
                    + ". By "
                    + displayUser(editor)
                    + ".";

            sendTeamNotification(
                    saved,
                    resolveTeamNotificationEventKey(
                            oldLeader,
                            newLeader,
                            oldProjectManager,
                            newProjectManager,
                            addedMembers,
                            removedMembers,
                            oldStatus,
                            newStatus
                    ),
                    "Team Modified",
                    message,
                    extraRecipients
            );
        }

        return toDto(saved);
    }

    @Override
    @Transactional
    public void deleteTeam(Integer id) {
        assertCurrentUserCanDeleteTeams();
        Team team = getTeamOrThrow(id);
        teamRepository.delete(team);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateUsers(Integer departmentId) {
        assertCurrentUserCanManageTeams();

        return employeeDepartmentRepository.findActiveUsersByWorkingDepartmentId(departmentId)
                .stream()
                .filter(user -> !isBlockedTeamCandidate(user))
                .filter(this::isTeamLeaderCandidate)
                .map(user -> {
                    Team activeLeaderTeam = getFirstActiveLeaderTeam(user.getId());
                    Team activeMemberTeam = getFirstActiveMemberTeam(user.getId());
                    Team activeTeam = activeLeaderTeam != null ? activeLeaderTeam : activeMemberTeam;
                    boolean available = activeTeam == null;

                    CandidateResponseDto dto = toCandidate(user, "Team Leader", available);
                    dto.setCurrentTeamId(activeTeam != null ? activeTeam.getId() : null);
                    dto.setCurrentTeamName(activeTeam != null ? activeTeam.getTeamName() : null);
                    dto.setCurrentTeamNames(activeTeam != null ? activeTeam.getTeamName() : null);
                    return dto;
                })
                .sorted(candidateComparator())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateMembers(Integer departmentId) {
        assertCurrentUserCanManageTeams();

        return employeeDepartmentRepository.findActiveUsersByWorkingDepartmentId(departmentId)
                .stream()
                .filter(user -> !isBlockedTeamCandidate(user))
                .filter(this::isTeamMemberCandidate)
                .map(user -> {
                    Team activeLeaderTeam = getFirstActiveLeaderTeam(user.getId());
                    Team activeMemberTeam = getFirstActiveMemberTeam(user.getId());
                    Team activeTeam = activeLeaderTeam != null ? activeLeaderTeam : activeMemberTeam;
                    boolean available = activeTeam == null;

                    CandidateResponseDto dto = toCandidate(user, "Member", available);
                    dto.setCurrentTeamId(activeTeam != null ? activeTeam.getId() : null);
                    dto.setCurrentTeamName(activeTeam != null ? activeTeam.getTeamName() : null);
                    dto.setCurrentTeamNames(activeTeam != null ? activeTeam.getTeamName() : null);

                    return dto;
                })
                .sorted(candidateComparator())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateProjectManagers(Integer departmentId) {
        assertCurrentUserCanManageTeams();

        return employeeDepartmentRepository.findActiveUsersByWorkingDepartmentId(departmentId)
                .stream()
                .filter(user -> !isBlockedTeamCandidate(user))
                .filter(this::isProjectManagerCandidate)
                .map(user -> {
                    CandidateResponseDto dto = toCandidate(user, "Project Manager", true);

                    List<Team> activePmTeams = teamRepository
                            .findByProjectManagerIdAndStatusIgnoreCase(user.getId(), "Active");

                    String teamNames = activePmTeams.stream()
                            .map(Team::getTeamName)
                            .filter(Objects::nonNull)
                            .collect(Collectors.joining(", "));

                    dto.setCurrentTeamNames(teamNames.isBlank() ? null : teamNames);

                    if (!activePmTeams.isEmpty()) {
                        Team first = activePmTeams.get(0);
                        dto.setCurrentTeamId(first.getId());
                        dto.setCurrentTeamName(first.getTeamName());
                    }

                    return dto;
                })
                .sorted(candidateComparator())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamHistoryResponseDto> getTeamHistory(Integer teamId) {
        assertCurrentUserCanViewTeamHistory();
        Team team = getTeamOrThrow(teamId);

        return teamHistoryRepository.findByTeamIdOrderByChangedAtDesc(team.getId())
                .stream()
                .map(this::toHistoryDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getMyTeams() {
        /*
         * This endpoint is the personal "My Team" workspace.
         * It must not require the HR/Department team-view permission, because normal employees,
         * team leaders, and project managers still need to see the active team they belong to.
         * Security is safe because the query only returns teams connected to the current user.
         */
        Integer currentUserId = SecurityUtils.currentUserId();
        if (currentUserId == null) {
            return List.of();
        }

        LinkedHashSet<Team> result = new LinkedHashSet<>();
        result.addAll(teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(currentUserId, "Active"));
        result.addAll(teamRepository.findByProjectManagerIdAndStatusIgnoreCase(currentUserId, "Active"));

        for (TeamMember membership : teamMemberRepository.findByMemberUserIdAndEndedDateIsNull(currentUserId)) {
            Team team = membership.getTeam();
            if (team != null && team.isActiveTeam()) {
                result.add(team);
            }
        }

        return result.stream()
                .filter(Objects::nonNull)
                .filter(Team::isActiveTeam)
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getMyDepartmentTeams() {
        Integer departmentId = requireCurrentUserDepartmentId();

        return teamRepository.findByDepartmentId(departmentId)
                .stream()
                .map(this::toDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponseDto getMyDepartmentTeamById(Integer id) {
        Integer departmentId = requireCurrentUserDepartmentId();
        Team team = getTeamOrThrow(id);

        if (team.getDepartment() == null || !Objects.equals(team.getDepartment().getId(), departmentId)) {
            throw new BusinessValidationException("You can only access teams from your own department.");
        }

        return toDto(team);
    }

    @Override
    @Transactional
    public TeamResponseDto createMyDepartmentTeam(TeamRequestDto request) {
        Integer departmentId = requireCurrentUserDepartmentId();
        request.setDepartmentId(departmentId);

        return createTeam(request);
    }

    @Override
    @Transactional
    public TeamResponseDto updateMyDepartmentTeam(Integer id, TeamRequestDto request) {
        Integer departmentId = requireCurrentUserDepartmentId();

        Team team = getTeamOrThrow(id);

        if (team.getDepartment() == null || !Objects.equals(team.getDepartment().getId(), departmentId)) {
            throw new BusinessValidationException("You can only update teams from your own department.");
        }

        request.setDepartmentId(departmentId);

        return updateTeam(id, request);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateUsers() {
        return getCandidateUsers(requireCurrentUserDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateMembers() {
        return getCandidateMembers(requireCurrentUserDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateProjectManagers() {
        return getCandidateProjectManagers(requireCurrentUserDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamHistoryResponseDto> getMyDepartmentTeamHistory(Integer teamId) {
        Integer departmentId = requireCurrentUserDepartmentId();
        Team team = getTeamOrThrow(teamId);

        if (team.getDepartment() == null || !Objects.equals(team.getDepartment().getId(), departmentId)) {
            throw new BusinessValidationException("You can only view history for your own department teams.");
        }

        return getTeamHistory(teamId);
    }

    private void validateCreateRequest(TeamRequestDto request) {
        if (request == null) {
            throw new BusinessValidationException("Team request is required.");
        }

        cleanRequired(request.getTeamName(), "Team name");
        String status = cleanStatus(request.getStatus());

        if ("Inactive".equalsIgnoreCase(status)) {
            throw new BusinessValidationException("New teams must be created as Active.");
        }

        if (request.getDepartmentId() == null) {
            throw new BusinessValidationException("Department is required.");
        }

        if (request.getTeamLeaderId() == null) {
            throw new BusinessValidationException("Team Leader is required.");
        }

        if (request.getProjectManagerId() == null) {
            throw new BusinessValidationException("Project Manager is required.");
        }

        if (safeIds(request.getEffectiveMemberUserIds()).isEmpty()) {
            throw new BusinessValidationException("At least one Team Member is required.");
        }
    }

    private void validateUpdateRequest(TeamRequestDto request) {
        if (request == null) {
            throw new BusinessValidationException("Team request is required.");
        }

        cleanRequired(request.getTeamName(), "Team name");

        if (request.getDepartmentId() == null) {
            throw new BusinessValidationException("Department is required.");
        }

        if (request.getTeamLeaderId() == null) {
            throw new BusinessValidationException("Team Leader is required.");
        }

        if (request.getProjectManagerId() == null) {
            throw new BusinessValidationException("Project Manager is required.");
        }

        String status = cleanStatus(request.getStatus());

        if (!"Inactive".equalsIgnoreCase(status) && safeIds(request.getEffectiveMemberUserIds()).isEmpty()) {
            throw new BusinessValidationException("At least one Team Member is required.");
        }

        cleanRequired(request.getReason(), "Reason");
        validateReason(request.getReason());
    }

    private Team getTeamOrThrow(Integer id) {
        return teamRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Team not found with id: " + id));
    }

    private Department getDepartmentOrThrow(Integer id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + id));
    }

    private User getActiveUserOrThrow(Integer userId, String label) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException(label + " not found with id: " + userId));

        if (!isActiveUser(user)) {
            throw new BusinessValidationException(label + " must be active.");
        }

        return user;
    }

    private User resolveCreatedBy(Integer createdById) {
        Integer currentUserId = SecurityUtils.currentUserId();
        Integer id = createdById != null ? createdById : currentUserId;

        return userRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Created by user not found with id: " + id));
    }

    private User resolveProjectManager(Integer projectManagerId, Department department, User teamLeader) {
        if (projectManagerId == null) {
            throw new BusinessValidationException("Project Manager is required.");
        }

        User projectManager = getActiveUserOrThrow(projectManagerId, "Project Manager");

        assertAssignableTeamUser(projectManager, "Project Manager");

        if (sameUser(projectManager, teamLeader)) {
            throw new BusinessValidationException("Project Manager cannot be the same as Team Leader.");
        }

        if (!isProjectManagerCandidate(projectManager)) {
            throw new BusinessValidationException("Selected Project Manager must have the MANAGER role.");
        }

        validateUserInWorkingDepartment(projectManager, department.getId(), "Project Manager");

        return projectManager;
    }

    private void validateMembers(
            List<Integer> memberIds,
            Department department,
            User teamLeader,
            User projectManager,
            Integer currentTeamId,
            Set<Integer> existingMemberIds
    ) {
        if (memberIds == null) {
            return;
        }

        Set<Integer> unique = new HashSet<>();

        for (Integer memberId : memberIds) {
            if (memberId == null) {
                continue;
            }

            if (!unique.add(memberId)) {
                throw new BusinessValidationException("Duplicate team member selected.");
            }

            if (teamLeader != null && Objects.equals(teamLeader.getId(), memberId)) {
                throw new BusinessValidationException("Team Leader cannot be selected as a normal member.");
            }

            if (projectManager != null && Objects.equals(projectManager.getId(), memberId)) {
                throw new BusinessValidationException("Project Manager cannot be selected as a normal member.");
            }

            Team activeLeaderTeam = getFirstActiveLeaderTeam(memberId);
            if (activeLeaderTeam != null
                    && (currentTeamId == null || !Objects.equals(activeLeaderTeam.getId(), currentTeamId))) {
                throw new BusinessValidationException(
                        "Selected Team member is already assigned as Team Leader in active team: "
                                + nullToEmpty(activeLeaderTeam.getTeamName())
                );
            }

            Team activeMemberTeam = getFirstActiveMemberTeam(memberId);
            if (activeMemberTeam != null
                    && (currentTeamId == null || !Objects.equals(activeMemberTeam.getId(), currentTeamId))) {
                throw new BusinessValidationException(
                        "Selected Team member is already assigned to active team: "
                                + nullToEmpty(activeMemberTeam.getTeamName())
                );
            }

            User member = getActiveUserOrThrow(memberId, "Team member");

            assertAssignableTeamUser(member, "Team member");

            if (!isTeamMemberCandidate(member)) {
                throw new BusinessValidationException("Selected Team member must have the EMPLOYEE role.");
            }

            validateUserInWorkingDepartment(member, department.getId(), "Team member");
        }
    }

    private void validateTeamLeaderPermission(User teamLeader) {
        assertAssignableTeamUser(teamLeader, "Team Leader");

        if (!isTeamLeaderCandidate(teamLeader)) {
            throw new BusinessValidationException("Selected Team Leader must have the EMPLOYEE role.");
        }
    }

    private void validateTeamLeaderAvailability(User teamLeader, Integer currentTeamId) {
        if (teamLeader == null || teamLeader.getId() == null) {
            throw new BusinessValidationException("Team Leader is required.");
        }

        Team activeLeaderTeam = getFirstActiveLeaderTeam(teamLeader.getId());
        if (activeLeaderTeam != null
                && (currentTeamId == null || !Objects.equals(activeLeaderTeam.getId(), currentTeamId))) {
            throw new BusinessValidationException(
                    "Selected Team Leader is already leading active team: "
                            + nullToEmpty(activeLeaderTeam.getTeamName())
            );
        }

        Team activeMemberTeam = getFirstActiveMemberTeam(teamLeader.getId());
        if (activeMemberTeam != null
                && (currentTeamId == null || !Objects.equals(activeMemberTeam.getId(), currentTeamId))) {
            throw new BusinessValidationException(
                    "Selected Team Leader is already assigned as member in active team: "
                            + nullToEmpty(activeMemberTeam.getTeamName())
            );
        }
    }
    }

    private void assertCurrentUserCanManageTeams() {
        if (currentUserIsHr()) {
            throw new AccessDeniedException("HR users can view teams and team history only.");
        }

        if (currentUserIsDepartmentHead()
                && positionPermissionService.currentUserHasPermission("teamCreate")) {
            return;
        }

        throw new AccessDeniedException("Only Department Heads with Create Team permission can manage teams.");
    }

    private void assertCurrentUserCanCreateTeams() {
        if (currentUserIsHr()) {
            throw new AccessDeniedException("HR users can view teams and team history only. Team creation is handled by Department Heads.");
        }

        if (currentUserIsDepartmentHead()
                && positionPermissionService.currentUserHasPermission("teamCreate")) {
            return;
        }

        throw new AccessDeniedException("Only Department Heads with Create Team permission can create teams.");
    }

    private void assertCurrentUserCanEditTeams() {
        if (currentUserIsHr()) {
            throw new AccessDeniedException("HR users can view teams and team history only.");
        }

        if (currentUserIsDepartmentHead()
                && positionPermissionService.currentUserHasPermission("teamEdit")) {
            return;
        }

        throw new AccessDeniedException("Only Department Heads with Edit Team permission can edit teams.");
    }

    private void assertCurrentUserCanDeleteTeams() {
        if (currentUserIsAdmin()) {
            return;
        }

        throw new AccessDeniedException("Only HR Admin can delete teams.");
    }

    private void assertCurrentUserCanViewTeamHistory() {
        if (currentUserIsHr() || currentUserIsAdmin()) {
            return;
        }

        if (positionPermissionService.currentUserHasPermission("teamHistory")) {
            return;
        }

        throw new AccessDeniedException("Your position does not have permission to view team history.");
    }

    private void assertDepartmentHeadRequestInsideOwnDepartment(Integer departmentId) {
        if (!currentUserIsDepartmentHead()) {
            return;
        }

        Integer ownDepartmentId = requireCurrentUserDepartmentId();

        if (!Objects.equals(ownDepartmentId, departmentId)) {
            throw new AccessDeniedException("Department Heads can create teams only for their own department.");
        }
    }

    private void assertDepartmentHeadCanUpdateTeam(Team team, Integer requestedDepartmentId) {
        if (!currentUserIsDepartmentHead()) {
            return;
        }

        Integer ownDepartmentId = requireCurrentUserDepartmentId();
        Integer currentTeamDepartmentId = team.getDepartment() != null ? team.getDepartment().getId() : null;

        if (!Objects.equals(ownDepartmentId, currentTeamDepartmentId)
                || !Objects.equals(ownDepartmentId, requestedDepartmentId)) {
            throw new AccessDeniedException("Department Heads can edit only teams inside their own department.");
        }
    }

    private boolean currentUserIsHr() {
        User currentUser = getCurrentUserOrNull();

        if (currentUser == null) {
            return false;
        }

        return hasRole(currentUser, "HR")
                || hasRole(currentUser, "HUMAN_RESOURCE")
                || hasRole(currentUser, "HUMAN_RESOURCES");
    }

    private boolean currentUserIsAdmin() {
        User currentUser = getCurrentUserOrNull();

        if (currentUser == null) {
            return false;
        }

        return hasRole(currentUser, "HRADMIN");
    }

    private boolean currentUserIsDepartmentHead() {
        User currentUser = getCurrentUserOrNull();

        if (currentUser == null) {
            return false;
        }

        return hasDashboard(currentUser, "DEPARTMENT_HEAD_DASHBOARD")
                || hasRole(currentUser, "DEPARTMENT_HEAD")
                || hasRole(currentUser, "DEPARTMENTHEAD")
                || hasRole(currentUser, "DEPT_HEAD")
                || hasRole(currentUser, "HEAD_OF_DEPARTMENT");
    }

    private void applyMemberChanges(Team team, Set<Integer> oldMemberIds, Set<Integer> newMemberIds) {
        if (team.getTeamMembers() == null) {
            team.setTeamMembers(new ArrayList<>());
        }

        Date now = new Date();
        User editor = getCurrentUserOrNull();

        List<TeamMember> existing = new ArrayList<>(team.getTeamMembers());

        for (TeamMember member : existing) {
            Integer memberUserId = member.getMemberUser() != null ? member.getMemberUser().getId() : null;

            if (memberUserId == null) {
                continue;
            }

            if (member.getEndedDate() == null && !newMemberIds.contains(memberUserId)) {
                member.setEndedDate(now);
                member.setEditedByUser(editor);
            }
        }

        Set<Integer> currentAfterRemoval = activeMemberIds(team);

        for (Integer userId : newMemberIds) {
            if (currentAfterRemoval.contains(userId)) {
                continue;
            }

            User user = getActiveUserOrThrow(userId, "Team member");

            TeamMember reusableEndedMembership = team.getTeamMembers()
                    .stream()
                    .filter(Objects::nonNull)
                    .filter(member -> member.getMemberUser() != null)
                    .filter(member -> Objects.equals(member.getMemberUser().getId(), userId))
                    .findFirst()
                    .orElse(null);

            if (reusableEndedMembership != null) {
                reusableEndedMembership.setMemberUser(user);
                reusableEndedMembership.setStartedDate(now);
                reusableEndedMembership.setEndedDate(null);
                reusableEndedMembership.setEditedByUser(editor);
                reusableEndedMembership.setTeam(team);
                continue;
            }

            TeamMember member = new TeamMember();
            member.setMemberUser(user);
            member.setStartedDate(now);
            member.setEndedDate(null);
            member.setEditedByUser(editor);

            team.addTeamMember(member);
        }
    }

    private void validateUserInWorkingDepartment(User user, Integer departmentId, String label) {
        if (user == null || user.getId() == null) {
            throw new BusinessValidationException(label + " is invalid.");
        }

        boolean belongs = employeeDepartmentRepository.existsActiveUserInWorkingDepartment(
                user.getId(),
                departmentId
        );

        if (!belongs) {
            throw new BusinessValidationException(label + " must belong to the selected working department.");
        }
    }

private boolean isTeamLeaderCandidate(User user) {
    return isEmployeeTeamCandidate(user);
}

private boolean isProjectManagerCandidate(User user) {
    if (isBlockedTeamCandidate(user)) {
        return false;
    }

    return hasRole(user, "MANAGER");
}

private boolean isTeamMemberCandidate(User user) {
    return isEmployeeTeamCandidate(user);
}

/**
 * Team Leader and Team Member selectors now use only normal EMPLOYEE-role users.
 * Old position-permission assignment flags are intentionally not used here anymore.
 */
private boolean isEmployeeTeamCandidate(User user) {
    if (isBlockedTeamCandidate(user)) {
        return false;
    }

    return hasRole(user, "EMPLOYEE")
            && !hasRole(user, "MANAGER")
            && !hasRole(user, "PROJECT_MANAGER")
            && !hasRole(user, "PM")
            && !hasRole(user, "HR")
            && !hasRole(user, "HRADMIN")
            && !hasRole(user, "ADMIN")
            && !hasRole(user, "CEO")
            && !hasRole(user, "EXECUTIVE")
            && !isDepartmentHeadUser(user);
}

    private void assertAssignableTeamUser(User user, String label) {
        if (user == null || user.getId() == null) {
            throw new BusinessValidationException(label + " is invalid.");
        }

        if (isCurrentUser(user)) {
            throw new BusinessValidationException("You cannot assign yourself as " + label + ".");
        }

        if (isDepartmentHeadUser(user)) {
            throw new BusinessValidationException("Department Heads cannot be assigned as " + label + ".");
        }
    }

    private boolean isBlockedTeamCandidate(User user) {
        return !isActiveUser(user) || isCurrentUser(user) || isDepartmentHeadUser(user);
    }

    private boolean isCurrentUser(User user) {
        return user != null && Objects.equals(user.getId(), SecurityUtils.currentUserId());
    }

    private boolean isDepartmentHeadUser(User user) {
        return hasDashboard(user, "DEPARTMENT_HEAD_DASHBOARD")
                || hasRole(user, "DEPARTMENT_HEAD")
                || hasRole(user, "DEPARTMENTHEAD")
                || hasRole(user, "DEPT_HEAD")
                || hasRole(user, "HEAD_OF_DEPARTMENT")
                || hasPositionTitle(user, "DEPARTMENT_HEAD")
                || hasPositionTitle(user, "DEPARTMENTHEAD")
                || hasPositionTitle(user, "DEPT_HEAD")
                || hasPositionTitle(user, "HEAD_OF_DEPARTMENT")
                || hasDepartmentHeadPositionTitle(user);
    }

    private boolean hasDashboard(User user, String dashboard) {
        return user != null
                && user.getDashboard() != null
                && dashboard != null
                && normalizeRole(user.getDashboard()).equals(normalizeRole(dashboard));
    }



    private boolean isTeamLeaderPosition(User user) {
        return hasPositionTitle(user, "TEAM_LEADER")
                || hasPositionTitle(user, "TEAMLEADER")
                || hasPositionTitle(user, "TEAM_LEAD")
                || hasPositionTitle(user, "TEAMLEAD")
                || hasRole(user, "TEAM_LEADER")
                || hasRole(user, "TEAMLEADER");
    }

    private boolean isProjectManagerPosition(User user) {
        return hasPositionTitle(user, "MANAGER")
                || hasPositionTitle(user, "PROJECT_MANAGER")
                || hasPositionTitle(user, "PM")
                || hasManagerPositionTitle(user)
                || hasRole(user, "MANAGER")
                || hasRole(user, "PROJECT_MANAGER")
                || hasRole(user, "PM");
    }

    private boolean hasPositionTitle(User user, String expectedTitle) {
        if (user == null
                || user.getPosition() == null
                || user.getPosition().getPositionTitle() == null
                || expectedTitle == null) {
            return false;
        }

        String actual = normalizeRole(user.getPosition().getPositionTitle());
        String expected = normalizeRole(expectedTitle);

        return actual.equals(expected) || actual.endsWith(expected);
    }

    private boolean hasManagerPositionTitle(User user) {
        String title = normalizedPositionTitle(user);

        return !title.isBlank()
                && (title.endsWith("manager") || title.contains("projectmanager"));
    }

    private boolean hasDepartmentHeadPositionTitle(User user) {
        String title = normalizedPositionTitle(user);

        return !title.isBlank()
                && (title.endsWith("head")
                || title.contains("departmenthead")
                || title.contains("depthead")
                || title.contains("headofdepartment"));
    }

    private String normalizedPositionTitle(User user) {
        if (user == null
                || user.getPosition() == null
                || user.getPosition().getPositionTitle() == null) {
            return "";
        }

        return normalizeRole(user.getPosition().getPositionTitle());
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

        List<UserRole> userRoles = userRoleRepository.findByUserId(user.getId());

        for (UserRole userRole : userRoles) {
            if (userRole.getRoleId() == null) {
                continue;
            }

            Optional<Role> roleOpt = roleRepository.findById(userRole.getRoleId());

            if (roleOpt.isEmpty() || roleOpt.get().getName() == null) {
                continue;
            }

            if (expected.equals(normalizeRole(roleOpt.get().getName()))) {
                return true;
            }
        }

        return false;
    }

    private void recordHistory(
            Team team,
            String actionType,
            String fieldName,
            String oldValue,
            String newValue,
            String reason,
            User changedBy
    ) {
        TeamHistory history = new TeamHistory();
        history.setTeam(team);
        history.setActionType(actionType);
        history.setFieldName(fieldName);
        history.setOldValue(oldValue);
        history.setNewValue(newValue);
        history.setReason(reason);
        history.setChangedBy(changedBy);
        history.setChangedByName(displayUser(changedBy));
        history.setChangedAt(new Date());

        teamHistoryRepository.save(history);
    }

    private String resolveTeamNotificationEventKey(
            User oldLeader,
            User newLeader,
            User oldProjectManager,
            User newProjectManager,
            Set<Integer> addedMembers,
            Set<Integer> removedMembers,
            String oldStatus,
            String newStatus
    ) {
        if (!sameUser(oldLeader, newLeader)) {
            return NotificationEventKey.TEAM_LEADER_CHANGED;
        }
        if (!sameUser(oldProjectManager, newProjectManager)) {
            return NotificationEventKey.PROJECT_MANAGER_CHANGED;
        }
        if (addedMembers != null && !addedMembers.isEmpty()) {
            return NotificationEventKey.TEAM_MEMBER_ADDED;
        }
        if (removedMembers != null && !removedMembers.isEmpty()) {
            return NotificationEventKey.TEAM_MEMBER_REMOVED;
        }
        if (!Objects.equals(normalizeStatus(oldStatus), normalizeStatus(newStatus))) {
            return NotificationEventKey.TEAM_STRUCTURE_CHANGED;
        }
        return NotificationEventKey.TEAM_ANNOUNCEMENT;
    }

    private void sendTeamNotification(
            Team team,
            String eventKey,
            String title,
            String message,
            Set<Integer> extraRecipients
    ) {
        Set<Integer> recipientIds = new HashSet<>();

        if (team.getDepartment() != null && team.getDepartment().getId() != null) {
            userRepository.findActiveDepartmentHeadsByDepartmentId(team.getDepartment().getId())
                    .forEach(user -> recipientIds.add(user.getId()));
        }

        if (team.getTeamLeader() != null && isActiveUser(team.getTeamLeader())) {
            recipientIds.add(team.getTeamLeader().getId());
        }

        if (team.getProjectManager() != null && isActiveUser(team.getProjectManager())) {
            recipientIds.add(team.getProjectManager().getId());
        }

        if (team.getTeamMembers() != null) {
            for (TeamMember member : team.getTeamMembers()) {
                if (member.getEndedDate() == null
                        && member.getMemberUser() != null
                        && isActiveUser(member.getMemberUser())) {
                    recipientIds.add(member.getMemberUser().getId());
                }
            }
        }

        if (extraRecipients != null) {
            recipientIds.addAll(extraRecipients);
        }

        recipientIds.stream()
                .filter(Objects::nonNull)
                .forEach(userId -> notificationService.sendEvent(userId, eventKey, title, message, "GENERAL"));
    }

    private TeamResponseDto toDto(Team team) {
        TeamResponseDto dto = new TeamResponseDto();

        dto.setId(team.getId());
        dto.setTeamName(team.getTeamName());

        if (team.getDepartment() != null) {
            dto.setDepartmentId(team.getDepartment().getId());
            dto.setDepartmentName(team.getDepartment().getDepartmentName());
        }

        if (team.getTeamLeader() != null) {
            dto.setTeamLeaderId(team.getTeamLeader().getId());
            dto.setTeamLeaderName(displayUser(team.getTeamLeader()));
        }

        if (team.getProjectManager() != null) {
            dto.setProjectManagerId(team.getProjectManager().getId());
            dto.setProjectManagerName(displayUser(team.getProjectManager()));

            List<Team> pmTeams = teamRepository.findByProjectManagerIdAndStatusIgnoreCase(
                    team.getProjectManager().getId(),
                    "Active"
            );

            String pmTeamNames = pmTeams.stream()
                    .filter(t -> !Objects.equals(t.getId(), team.getId()))
                    .map(Team::getTeamName)
                    .filter(Objects::nonNull)
                    .collect(Collectors.joining(", "));

            dto.setProjectManagerTeams(pmTeamNames.isBlank() ? null : pmTeamNames);
        }

        if (team.getCreatedByUser() != null) {
            dto.setCreatedById(team.getCreatedByUser().getId());
            dto.setCreatedByName(displayUser(team.getCreatedByUser()));
        }

        dto.setCreatedDate(team.getCreatedDate());
        dto.setStatus(team.getStatus());
        dto.setTeamGoal(team.getTeamGoal());

        List<TeamResponseDto.MemberInfo> members = team.getTeamMembers() == null
                ? List.of()
                : team.getTeamMembers()
                .stream()
                .filter(Objects::nonNull)
                .filter(member -> member.getEndedDate() == null)
                .filter(member -> member.getMemberUser() != null)
                .sorted(Comparator.comparing(
                        member -> displayUser(member.getMemberUser()),
                        String.CASE_INSENSITIVE_ORDER
                ))
                .map(member -> new TeamResponseDto.MemberInfo(
                        member.getMemberUser().getId(),
                        displayUser(member.getMemberUser()),
                        member.getStartedDate()
                ))
                .toList();

        dto.setMembers(members);

        return dto;
    }

    private TeamHistoryResponseDto toHistoryDto(TeamHistory history) {
        TeamHistoryResponseDto dto = new TeamHistoryResponseDto();

        dto.setId(history.getId());

        if (history.getTeam() != null) {
            dto.setTeamId(history.getTeam().getId());
            dto.setTeamName(history.getTeam().getTeamName());
        }

        dto.setActionType(history.getActionType());
        dto.setFieldName(history.getFieldName());
        dto.setOldValue(history.getOldValue());
        dto.setNewValue(history.getNewValue());
        dto.setReason(history.getReason());

        if (history.getChangedBy() != null) {
            dto.setChangedById(history.getChangedBy().getId());
        }

        dto.setChangedByName(history.getChangedByName());
        dto.setChangedAt(history.getChangedAt());

        return dto;
    }

    private CandidateResponseDto toCandidate(User user, String type, Boolean available) {
        CandidateResponseDto dto = new CandidateResponseDto();

        dto.setId(user.getId());
        dto.setName(displayUser(user));
        dto.setType(type);
        dto.setDepartmentId(user.getDepartmentId());
        dto.setDepartmentName(getWorkingDepartmentName(user));
        dto.setAvailable(available);

        return dto;
    }

    private String getWorkingDepartmentName(User user) {
        if (user == null || user.getId() == null) {
            return null;
        }

        List<String> names = employeeDepartmentRepository.findWorkingDepartmentNamesByUserId(user.getId());

        if (names == null || names.isEmpty()) {
            return null;
        }

        return names.get(0);
    }

    private Team getFirstActiveLeaderTeam(Integer userId) {
        if (userId == null) {
            return null;
        }

        return teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(userId, "Active")
                .stream()
                .findFirst()
                .orElse(null);
    }

    private Team getFirstActiveMemberTeam(Integer userId) {
        if (userId == null) {
            return null;
        }

        List<TeamMember> memberships = teamMemberRepository.findByMemberUserId(userId);

        for (TeamMember membership : memberships) {
            Team team = membership.getTeam();

            if (team != null
                    && team.getStatus() != null
                    && team.getStatus().equalsIgnoreCase("Active")
                    && membership.getEndedDate() == null) {
                return team;
            }
        }

        return null;
    }

    private Set<Integer> activeMemberIds(Team team) {
        if (team == null || team.getTeamMembers() == null) {
            return new LinkedHashSet<>();
        }

        return team.getTeamMembers()
                .stream()
                .filter(Objects::nonNull)
                .filter(member -> member.getEndedDate() == null)
                .filter(member -> member.getMemberUser() != null)
                .map(member -> member.getMemberUser().getId())
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    private List<Integer> safeIds(List<Integer> ids) {
        if (ids == null) {
            return new ArrayList<>();
        }

        return ids.stream()
                .filter(Objects::nonNull)
                .distinct()
                .toList();
    }

    private Integer requireCurrentUserDepartmentId() {
        User currentUser = getCurrentUserOrThrow();

        if (currentUser.getDepartmentId() == null) {
            throw new BusinessValidationException("Current user has no assigned department.");
        }

        return currentUser.getDepartmentId();
    }

    private User getCurrentUserOrThrow() {
        Integer currentUserId = SecurityUtils.currentUserId();

        return userRepository.findById(currentUserId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found."));
    }

    private User getCurrentUserOrNull() {
        try {
            return getCurrentUserOrThrow();
        } catch (Exception ignored) {
            return null;
        }
    }

    private boolean isActiveUser(User user) {
        return user != null && (user.getActive() == null || Boolean.TRUE.equals(user.getActive()));
    }

    private boolean sameUser(User a, User b) {
        Integer aId = a != null ? a.getId() : null;
        Integer bId = b != null ? b.getId() : null;
        return Objects.equals(aId, bId);
    }

    private String displayUser(User user) {
        if (user == null) {
            return "—";
        }

        if (user.getFullName() != null && !user.getFullName().trim().isEmpty()) {
            return user.getFullName().trim();
        }

        if (user.getEmail() != null && !user.getEmail().trim().isEmpty()) {
            return user.getEmail().trim();
        }

        return "User #" + user.getId();
    }

    private String cleanRequired(String value, String label) {
        if (value == null || value.trim().isEmpty()) {
            throw new BusinessValidationException(label + " is required.");
        }

        return value.trim();
    }

    private String cleanNullable(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }

    private String cleanStatus(String status) {
        String clean = cleanNullable(status);

        if (clean == null) {
            return "Active";
        }

        if (!clean.equalsIgnoreCase("Active") && !clean.equalsIgnoreCase("Inactive")) {
            throw new BusinessValidationException("Status must be Active or Inactive.");
        }

        return clean.substring(0, 1).toUpperCase(Locale.ROOT)
                + clean.substring(1).toLowerCase(Locale.ROOT);
    }

    private void validateReason(String reason) {
        String clean = cleanRequired(reason, "Reason");
        String[] words = clean.trim().split("\\s+");

        if (words.length > REASON_WORD_LIMIT) {
            throw new BusinessValidationException("Cannot exceed more than 250 words.");
        }
    }

    private String normalize(String value) {
        if (value == null) {
            return "";
        }

        return value.trim()
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "")
                .toLowerCase(Locale.ROOT);
    }

    private String normalizeRole(String role) {
        if (role == null) {
            return "";
        }

        return role.trim()
                .replace("ROLE_", "")
                .replace(" ", "")
                .replace("_", "")
                .replace("-", "")
                .toLowerCase(Locale.ROOT);
    }

    private String normalizeStatus(String status) {
        return status == null ? "" : status.trim().toLowerCase(Locale.ROOT);
    }

    private String nullToEmpty(String value) {
        return value == null ? "" : value;
    }

    private Comparator<CandidateResponseDto> candidateComparator() {
        return Comparator.comparing(
                candidate -> candidate.getName() == null ? "" : candidate.getName(),
                String.CASE_INSENSITIVE_ORDER
        );
    }
}
