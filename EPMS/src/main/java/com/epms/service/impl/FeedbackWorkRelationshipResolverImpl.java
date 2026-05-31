package com.epms.service.impl;

import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.FeedbackRelationshipType;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.service.FeedbackWorkRelationshipResolver;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Collections;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedbackWorkRelationshipResolverImpl implements FeedbackWorkRelationshipResolver {

    private static final String ACTIVE_STATUS = "Active";

    private static final Set<String> HR_ADMIN_ROLE_NAMES = Set.of(
            "ADMIN", "HRADMIN", "HR_ADMIN", "HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES", "HR_MANAGER"
    );

    private static final Set<String> EXECUTIVE_ROLE_NAMES = Set.of("CEO", "EXECUTIVE");

    private static final Set<String> TEAM_LEADER_ROLE_NAMES = Set.of(
            "TEAM_LEADER", "TEAMLEADER", "TEAM_LEAD", "TEAMLEAD", "LEAD", "SUPERVISOR"
    );

    private static final Set<String> PROJECT_MANAGER_ROLE_NAMES = Set.of(
            "PROJECT_MANAGER", "PROJECTMANAGER", "PM"
    );

    private static final Set<String> DEPARTMENT_MANAGER_ROLE_NAMES = Set.of(
            "DEPARTMENT_MANAGER", "DEPARTMENTMANAGER", "DEPT_MANAGER", "DEPTMANAGER", "MANAGER"
    );

    private static final Set<String> DEPARTMENT_HEAD_ROLE_NAMES = Set.of(
            "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "DEPTHEAD", "HEAD_OF_DEPARTMENT"
    );

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    /**
     * 360 manager policy, intentionally independent from users.manager_id:
     * - Department Head target: no automatic manager reviewer for now.
     * - Team Leader target: Project Manager of the active team(s) they lead; Department Head fallback.
     * - Project Manager target: Department Head.
     * - Department Manager target: Department Head.
     * - Normal active team member target: active Team Leader.
     * - No-team employee target: Department Manager; Department Head fallback.
     */
    @Override
    public List<User> resolveManagerUsers(User targetUser) {
        if (!isActiveEmployeeUser(targetUser)) {
            return List.of();
        }

        Integer departmentId = targetUser.getDepartmentId();
        List<User> departmentHeads = resolveDepartmentHeads(departmentId, targetUser);

        if (isDepartmentHeadCandidate(targetUser)) {
            return List.of();
        }

        List<Team> teamsLed = activeTeamsLedBy(targetUser);
        if (!teamsLed.isEmpty()) {
            List<User> projectManagers = teamsLed.stream()
                    .map(Team::getProjectManager)
                    .filter(projectManager -> isUsableEvaluator(projectManager, targetUser))
                    .sorted(userComparator())
                    .collect(Collectors.collectingAndThen(
                            Collectors.toMap(User::getId, user -> user, (left, right) -> left, LinkedHashMap::new),
                            map -> new ArrayList<>(map.values())
                    ));
            return projectManagers.isEmpty() ? departmentHeads : projectManagers;
        }

        if (isProjectManagerCandidate(targetUser)) {
            return departmentHeads;
        }

        if (isDepartmentManagerCandidate(targetUser)) {
            return departmentHeads;
        }

        LinkedHashMap<Integer, User> teamLeadersByUserId = new LinkedHashMap<>();
        for (TeamMember membership : activeMemberships(targetUser)) {
            Team team = membership.getTeam();
            if (!isActiveTeam(team)) {
                continue;
            }
            User teamLeader = team.getTeamLeader();
            if (isUsableEvaluator(teamLeader, targetUser)) {
                teamLeadersByUserId.putIfAbsent(teamLeader.getId(), teamLeader);
            }
        }

        if (!teamLeadersByUserId.isEmpty()) {
            return new ArrayList<>(teamLeadersByUserId.values());
        }

        List<User> departmentManagers = resolveDepartmentManagers(departmentId, targetUser);
        return departmentManagers.isEmpty() ? departmentHeads : departmentManagers;
    }

    @Override
    public LinkedHashSet<Long> resolveManagerEmployeeIds(User targetUser) {
        return resolveManagerUsers(targetUser).stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    /**
     * 360 subordinate policy, intentionally independent from users.manager_id:
     * - Team Leader target: active members of active teams they lead.
     * - Project Manager target: active Team Leaders of active teams they manage.
     * - Department Manager target: active Team Leaders in the department + active no-team individual contributors.
     * - Department Head target: department leadership layer only: Department Managers, Project Managers, Team Leaders.
     * - Normal employee target: no automatic subordinate reviewers.
     */
    @Override
    public LinkedHashSet<Long> resolveSubordinateEmployeeIds(User targetUser) {
        LinkedHashSet<Long> employeeIds = new LinkedHashSet<>();
        if (!isActiveEmployeeUser(targetUser)) {
            return employeeIds;
        }

        List<Team> teamsLed = activeTeamsLedBy(targetUser);
        if (!teamsLed.isEmpty()) {
            addActiveTeamMembers(employeeIds, teamsLed, targetUser);
            return employeeIds;
        }

        List<Team> teamsManagedAsProjectManager = activeTeamsManagedByProjectManager(targetUser);
        if (!teamsManagedAsProjectManager.isEmpty()) {
            addTeamLeaders(employeeIds, teamsManagedAsProjectManager, targetUser);
            return employeeIds;
        }

        Integer departmentId = targetUser.getDepartmentId();
        if (departmentId == null) {
            return employeeIds;
        }

        if (isDepartmentHeadCandidate(targetUser)) {
            addDepartmentLeadershipLayer(employeeIds, departmentId, targetUser);
            return employeeIds;
        }

        if (isDepartmentManagerCandidate(targetUser)) {
            List<Team> activeDepartmentTeams = activeTeamsInDepartment(departmentId);
            addTeamLeaders(employeeIds, activeDepartmentTeams, targetUser);
            addNoTeamIndividualContributors(employeeIds, departmentId, targetUser);
        }

        return employeeIds;
    }

    @Override
    public LinkedHashSet<Long> resolvePeerEmployeeIds(User targetUser) {
        LinkedHashSet<Long> employeeIds = new LinkedHashSet<>();
        if (!isActiveEmployeeUser(targetUser)) {
            return employeeIds;
        }

        resolveActiveTeamIds(targetUser).forEach(teamId -> teamMemberRepository.findByTeamId(teamId).stream()
                .map(TeamMember::getMemberUser)
                .filter(user -> isEligiblePeerUser(targetUser, user))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add));

        if (targetUser.getDepartmentId() != null) {
            userRepository.findByDepartmentIdAndActiveTrue(targetUser.getDepartmentId()).stream()
                    .filter(user -> isEligiblePeerUser(targetUser, user))
                    .map(User::getEmployeeId)
                    .filter(Objects::nonNull)
                    .map(Integer::longValue)
                    .forEach(employeeIds::add);
        }

        resolveManagerEmployeeIds(targetUser).forEach(employeeIds::remove);
        resolveSubordinateEmployeeIds(targetUser).forEach(employeeIds::remove);
        Long targetEmployeeId = employeeIdAsLong(targetUser);
        employeeIds.remove(targetEmployeeId);
        return employeeIds;
    }

    @Override
    public LinkedHashSet<Integer> resolveActiveTeamIds(User user) {
        if (user == null || user.getId() == null) {
            return new LinkedHashSet<>();
        }
        return teamMemberRepository.findActiveMembershipsByMemberUserId(user.getId()).stream()
                .map(TeamMember::getTeam)
                .filter(this::isActiveTeam)
                .map(Team::getId)
                .filter(Objects::nonNull)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    public boolean isValidRelationship(User targetUser, User evaluatorUser, FeedbackRelationshipType relationshipType) {
        if (relationshipType == null) {
            return false;
        }
        return switch (relationshipType) {
            case SELF -> targetUser != null
                    && evaluatorUser != null
                    && targetUser.getEmployeeId() != null
                    && Objects.equals(targetUser.getEmployeeId(), evaluatorUser.getEmployeeId());
            case MANAGER -> isWorkContextManager(targetUser, evaluatorUser);
            case SUBORDINATE -> isWorkContextSubordinate(targetUser, evaluatorUser);
            case PEER -> isWorkContextPeer(targetUser, evaluatorUser);
        };
    }

    @Override
    public boolean isWorkContextManager(User targetUser, User evaluatorUser) {
        Long evaluatorEmployeeId = employeeIdAsLong(evaluatorUser);
        return evaluatorEmployeeId != null && resolveManagerEmployeeIds(targetUser).contains(evaluatorEmployeeId);
    }

    @Override
    public boolean isWorkContextSubordinate(User targetUser, User evaluatorUser) {
        Long evaluatorEmployeeId = employeeIdAsLong(evaluatorUser);
        return evaluatorEmployeeId != null && resolveSubordinateEmployeeIds(targetUser).contains(evaluatorEmployeeId);
    }

    @Override
    public boolean isWorkContextPeer(User targetUser, User evaluatorUser) {
        Long evaluatorEmployeeId = employeeIdAsLong(evaluatorUser);
        return evaluatorEmployeeId != null && resolvePeerEmployeeIds(targetUser).contains(evaluatorEmployeeId);
    }

    @Override
    public boolean sharesActiveTeam(User left, User right) {
        if (left == null || right == null) {
            return false;
        }
        return !Collections.disjoint(resolveActiveTeamIds(left), resolveActiveTeamIds(right));
    }

    @Override
    public boolean sameDepartment(User left, User right) {
        return left != null
                && right != null
                && left.getDepartmentId() != null
                && Objects.equals(left.getDepartmentId(), right.getDepartmentId());
    }

    @Override
    public boolean isHrAdminOrExecutive(User user) {
        Set<String> roles = normalizedRoleNames(user);
        return !Collections.disjoint(roles, HR_ADMIN_ROLE_NAMES)
                || !Collections.disjoint(roles, EXECUTIVE_ROLE_NAMES);
    }

    @Override
    public Set<String> normalizedRoleNames(User user) {
        if (user == null || user.getId() == null) {
            return Set.of();
        }
        return userRepository.findNormalizedRoleNamesByUserId(user.getId()).stream()
                .map(this::normalizeLabel)
                .collect(Collectors.toSet());
    }

    private List<User> resolveDepartmentManagers(Integer departmentId, User targetUser) {
        if (departmentId == null) {
            return List.of();
        }
        return userRepository.findActiveFeedback360ManagersByDepartmentId(departmentId).stream()
                .filter(manager -> isUsableEvaluator(manager, targetUser))
                .filter(this::isDepartmentManagerCandidate)
                .sorted(userComparator())
                .toList();
    }

    private List<User> resolveDepartmentHeads(Integer departmentId, User targetUser) {
        if (departmentId == null) {
            return List.of();
        }
        return userRepository.findActiveFeedback360DepartmentHeadsByDepartmentId(departmentId).stream()
                .filter(head -> isUsableEvaluator(head, targetUser))
                .filter(this::isDepartmentHeadCandidate)
                .sorted(userComparator())
                .toList();
    }

    private List<TeamMember> activeMemberships(User user) {
        if (user == null || user.getId() == null) {
            return List.of();
        }
        return teamMemberRepository.findActiveMembershipsByMemberUserId(user.getId()).stream()
                .filter(membership -> isActiveTeam(membership.getTeam()))
                .sorted(Comparator.comparing((TeamMember membership) -> safeLower(membership.getTeam() == null ? null : membership.getTeam().getTeamName()))
                        .thenComparing(membership -> membership.getTeam() == null ? null : membership.getTeam().getId(), Comparator.nullsLast(Integer::compareTo)))
                .toList();
    }

    private List<Team> activeTeamsLedBy(User user) {
        if (user == null || user.getId() == null) {
            return List.of();
        }
        return teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(user.getId(), ACTIVE_STATUS).stream()
                .filter(this::isActiveTeam)
                .sorted(teamComparator())
                .toList();
    }

    private List<Team> activeTeamsManagedByProjectManager(User user) {
        if (user == null || user.getId() == null) {
            return List.of();
        }
        return teamRepository.findByProjectManagerIdAndStatusIgnoreCase(user.getId(), ACTIVE_STATUS).stream()
                .filter(this::isActiveTeam)
                .sorted(teamComparator())
                .toList();
    }

    private List<Team> activeTeamsInDepartment(Integer departmentId) {
        if (departmentId == null) {
            return List.of();
        }
        return teamRepository.findByDepartmentIdAndStatusIgnoreCase(departmentId, ACTIVE_STATUS).stream()
                .filter(this::isActiveTeam)
                .sorted(teamComparator())
                .toList();
    }

    private void addActiveTeamMembers(LinkedHashSet<Long> employeeIds, List<Team> teams, User targetUser) {
        teams.stream()
                .sorted(teamComparator())
                .flatMap(team -> safeTeamMembers(team).stream())
                .filter(member -> member.getEndedDate() == null)
                .map(TeamMember::getMemberUser)
                .filter(user -> isUsableEvaluator(user, targetUser))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add);
    }

    private void addTeamLeaders(LinkedHashSet<Long> employeeIds, List<Team> teams, User targetUser) {
        teams.stream()
                .sorted(teamComparator())
                .map(Team::getTeamLeader)
                .filter(user -> isUsableEvaluator(user, targetUser))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add);
    }

    private void addDepartmentLeadershipLayer(LinkedHashSet<Long> employeeIds, Integer departmentId, User targetUser) {
        resolveDepartmentManagers(departmentId, targetUser).stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add);

        List<Team> activeDepartmentTeams = activeTeamsInDepartment(departmentId);

        activeDepartmentTeams.stream()
                .map(Team::getProjectManager)
                .filter(user -> isUsableEvaluator(user, targetUser))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add);

        addTeamLeaders(employeeIds, activeDepartmentTeams, targetUser);
    }

    private void addNoTeamIndividualContributors(LinkedHashSet<Long> employeeIds, Integer departmentId, User targetUser) {
        userRepository.findByDepartmentIdAndActiveTrue(departmentId).stream()
                .filter(user -> isUsableEvaluator(user, targetUser))
                .filter(user -> !isHrAdminOrExecutive(user))
                .filter(user -> !isLeadershipCandidate(user))
                .filter(user -> user.getId() != null && !teamMemberRepository.existsActiveMembershipByMemberUserId(user.getId()))
                .sorted(userComparator())
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add);
    }

    private boolean isEligiblePeerUser(User targetUser, User candidate) {
        return isUsableEvaluator(candidate, targetUser)
                && !isHrAdminOrExecutive(candidate)
                && sameDepartment(targetUser, candidate)
                && isPeerLayerCompatible(targetUser, candidate)
                && levelDistance(targetUser, candidate) <= 1;
    }

    private boolean isUsableEvaluator(User candidate, User targetUser) {
        return isActiveEmployeeUser(candidate)
                && targetUser != null
                && targetUser.getId() != null
                && !Objects.equals(candidate.getId(), targetUser.getId())
                && !Objects.equals(candidate.getEmployeeId(), targetUser.getEmployeeId());
    }

    private boolean isActiveEmployeeUser(User user) {
        return user != null
                && user.getId() != null
                && user.getEmployeeId() != null
                && !Boolean.FALSE.equals(user.getActive());
    }

    private boolean isActiveTeam(Team team) {
        return team != null
                && team.getStatus() != null
                && team.getStatus().equalsIgnoreCase(ACTIVE_STATUS);
    }

    private List<TeamMember> safeTeamMembers(Team team) {
        return team == null || team.getTeamMembers() == null ? List.of() : team.getTeamMembers();
    }

    private boolean isLeadershipCandidate(User user) {
        return isTeamLeaderCandidate(user)
                || isProjectManagerCandidate(user)
                || isDepartmentManagerCandidate(user)
                || isDepartmentHeadCandidate(user);
    }

    private boolean isTeamLeaderCandidate(User user) {
        if (!isActiveEmployeeUser(user)) {
            return false;
        }
        if (!activeTeamsLedBy(user).isEmpty()) {
            return true;
        }
        Set<String> roles = normalizedRoleNames(user);
        String title = normalizedPositionTitle(user);
        return !Collections.disjoint(roles, TEAM_LEADER_ROLE_NAMES)
                || containsAny(title, "TEAM_LEADER", "TEAMLEADER", "TEAM_LEAD", "TEAMLEAD");
    }

    private boolean isProjectManagerCandidate(User user) {
        if (!isActiveEmployeeUser(user)) {
            return false;
        }
        if (!activeTeamsManagedByProjectManager(user).isEmpty()) {
            return true;
        }
        Set<String> roles = normalizedRoleNames(user);
        String title = normalizedPositionTitle(user);
        return !Collections.disjoint(roles, PROJECT_MANAGER_ROLE_NAMES)
                || containsAny(title, "PROJECT_MANAGER", "PROJECTMANAGER", "PROJECT_MGR", "PROJECTMGR", "PM");
    }

    private boolean isDepartmentManagerCandidate(User user) {
        if (!isActiveEmployeeUser(user) || isHrAdminOrExecutive(user) || isDepartmentHeadCandidate(user)) {
            return false;
        }
        if (isProjectManagerCandidate(user) || isTeamLeaderCandidate(user)) {
            return false;
        }

        Set<String> roles = normalizedRoleNames(user);
        String title = normalizedPositionTitle(user);

        if (containsAny(title, "DEPARTMENT_MANAGER", "DEPARTMENTMANAGER", "DEPT_MANAGER", "DEPTMANAGER")) {
            return true;
        }
        if (isGenericManagerTitle(title)) {
            return true;
        }
        return !Collections.disjoint(roles, DEPARTMENT_MANAGER_ROLE_NAMES)
                && !containsAny(title, "PROJECT_MANAGER", "PROJECTMANAGER", "TEAM_MANAGER", "TEAMMANAGER", "TEAM_LEADER", "TEAMLEADER");
    }

    private boolean isDepartmentHeadCandidate(User user) {
        if (!isActiveEmployeeUser(user)) {
            return false;
        }
        Set<String> roles = normalizedRoleNames(user);
        String title = normalizedPositionTitle(user);
        return !Collections.disjoint(roles, DEPARTMENT_HEAD_ROLE_NAMES)
                || containsAny(title, "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "DEPTHEAD", "HEAD_OF_DEPARTMENT", "HEADOFDEPARTMENT");
    }

    private boolean isGenericManagerTitle(String normalizedTitle) {
        if (normalizedTitle == null || normalizedTitle.isBlank()) {
            return false;
        }
        if (containsAny(normalizedTitle,
                "PROJECT_MANAGER", "PROJECTMANAGER", "PROJECT_MGR", "PROJECTMGR",
                "TEAM_MANAGER", "TEAMMANAGER", "TEAM_LEADER", "TEAMLEADER",
                "HR_MANAGER", "HUMAN_RESOURCE", "HUMAN_RESOURCES")) {
            return false;
        }
        return normalizedTitle.equals("MANAGER")
                || normalizedTitle.endsWith("_MANAGER")
                || normalizedTitle.endsWith("MANAGER");
    }

    private PeerLayer resolvePeerLayer(User user) {
        if (user == null) {
            return PeerLayer.INDIVIDUAL_CONTRIBUTOR;
        }
        String title = normalizedPositionTitle(user);
        if (!Collections.disjoint(normalizedRoleNames(user), EXECUTIVE_ROLE_NAMES)
                || containsAny(title, "CEO", "CHIEF", "EXECUTIVE", "DIRECTOR")) {
            return PeerLayer.EXECUTIVE;
        }
        if (isDepartmentHeadCandidate(user)) {
            return PeerLayer.DEPARTMENT_HEAD;
        }
        if (isDepartmentManagerCandidate(user) || isProjectManagerCandidate(user)) {
            return PeerLayer.MANAGER;
        }
        if (isTeamLeaderCandidate(user)) {
            return PeerLayer.LEAD_OR_SUPERVISOR;
        }
        return PeerLayer.INDIVIDUAL_CONTRIBUTOR;
    }

    private boolean isPeerLayerCompatible(User target, User candidate) {
        PeerLayer targetLayer = resolvePeerLayer(target);
        PeerLayer candidateLayer = resolvePeerLayer(candidate);
        if (targetLayer == PeerLayer.INDIVIDUAL_CONTRIBUTOR) {
            return candidateLayer == PeerLayer.INDIVIDUAL_CONTRIBUTOR
                    || candidateLayer == PeerLayer.LEAD_OR_SUPERVISOR;
        }
        if (targetLayer == PeerLayer.LEAD_OR_SUPERVISOR) {
            return candidateLayer == PeerLayer.INDIVIDUAL_CONTRIBUTOR
                    || candidateLayer == PeerLayer.LEAD_OR_SUPERVISOR;
        }
        if (targetLayer == PeerLayer.MANAGER) {
            return candidateLayer == PeerLayer.MANAGER;
        }
        if (targetLayer == PeerLayer.DEPARTMENT_HEAD) {
            return candidateLayer == PeerLayer.DEPARTMENT_HEAD;
        }
        return candidateLayer == PeerLayer.EXECUTIVE;
    }

    private int levelDistance(User target, User candidate) {
        int targetRank = levelRank(target);
        int candidateRank = levelRank(candidate);
        if (targetRank == 0 || candidateRank == 0) {
            return 99;
        }
        return Math.abs(targetRank - candidateRank);
    }

    private int levelRank(User user) {
        if (user == null || user.getPosition() == null || user.getPosition().getLevel() == null) {
            return 0;
        }
        String digits = normalizeLabel(user.getPosition().getLevel().getLevelCode()).replaceAll("\\D+", "");
        if (digits.isBlank()) {
            return 0;
        }
        try {
            return Integer.parseInt(digits);
        } catch (NumberFormatException ignored) {
            return 0;
        }
    }

    private Comparator<User> userComparator() {
        return Comparator
                .comparing((User user) -> safeLower(user.getFullName()))
                .thenComparing((User user) -> safeLower(user.getEmail()))
                .thenComparing(User::getId, Comparator.nullsLast(Integer::compareTo));
    }

    private Comparator<Team> teamComparator() {
        return Comparator
                .comparing((Team team) -> safeLower(team.getTeamName()))
                .thenComparing(Team::getId, Comparator.nullsLast(Integer::compareTo));
    }

    private Long employeeIdAsLong(User user) {
        return user == null || user.getEmployeeId() == null ? null : user.getEmployeeId().longValue();
    }

    private String normalizedPositionTitle(User user) {
        return user == null || user.getPosition() == null ? "" : normalizeLabel(user.getPosition().getPositionTitle());
    }

    private String normalizeLabel(String value) {
        if (value == null) {
            return "";
        }
        return value.trim()
                .replaceFirst("(?i)^ROLE_", "")
                .replace(' ', '_')
                .replace('-', '_')
                .replace('/', '_')
                .toUpperCase(Locale.ROOT);
    }

    private boolean containsAny(String haystack, String... needles) {
        if (haystack == null || haystack.isBlank()) {
            return false;
        }
        for (String needle : needles) {
            if (haystack.contains(needle)) {
                return true;
            }
        }
        return false;
    }

    private String safeLower(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private enum PeerLayer {
        INDIVIDUAL_CONTRIBUTOR,
        LEAD_OR_SUPERVISOR,
        MANAGER,
        DEPARTMENT_HEAD,
        EXECUTIVE
    }
}
