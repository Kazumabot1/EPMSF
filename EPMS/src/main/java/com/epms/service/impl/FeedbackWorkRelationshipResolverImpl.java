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
import java.util.Map;
import java.util.Objects;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FeedbackWorkRelationshipResolverImpl implements FeedbackWorkRelationshipResolver {

    private static final Set<String> HR_ADMIN_ROLE_NAMES = Set.of(
            "ADMIN", "HRADMIN", "HR_ADMIN", "HR", "HUMAN_RESOURCE", "HUMAN_RESOURCES", "HR_MANAGER"
    );

    private static final Set<String> EXECUTIVE_ROLE_NAMES = Set.of("CEO", "EXECUTIVE");

    private static final Set<String> MANAGER_ROLE_NAMES = Set.of(
            "MANAGER", "PROJECT_MANAGER", "PROJECTMANAGER", "TEAM_MANAGER", "PM"
    );

    private static final Set<String> DEPARTMENT_HEAD_ROLE_NAMES = Set.of(
            "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "DEPTHEAD", "HEAD_OF_DEPARTMENT"
    );

    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    @Override
    public List<User> resolveManagerUsers(User targetUser) {
        if (!isActiveEmployeeUser(targetUser)) {
            return List.of();
        }

        LinkedHashMap<Integer, User> managersByUserId = new LinkedHashMap<>();

        List<TeamMember> activeMemberships = teamMemberRepository.findActiveMembershipsByMemberUserId(targetUser.getId());
        for (TeamMember membership : activeMemberships) {
            Team team = membership.getTeam();
            if (!isActiveTeam(team)) {
                continue;
            }
            User teamLeader = team.getTeamLeader();
            if (isUsableEvaluator(teamLeader, targetUser)) {
                managersByUserId.putIfAbsent(teamLeader.getId(), teamLeader);
            }
        }

        if (!managersByUserId.isEmpty()) {
            return new ArrayList<>(managersByUserId.values());
        }

        Integer departmentId = targetUser.getDepartmentId();
        if (departmentId == null) {
            return List.of();
        }

        List<User> departmentHeads = userRepository.findActiveFeedback360DepartmentHeadsByDepartmentId(departmentId).stream()
                .filter(head -> isUsableEvaluator(head, targetUser))
                .sorted(userComparator())
                .toList();

        if (hasDepartmentHeadRole(targetUser)) {
            return List.of();
        }

        if (hasManagerRole(targetUser) || hasManagerLikePositionTitle(targetUser)) {
            return departmentHeads;
        }

        List<User> departmentManagers = userRepository.findActiveFeedback360ManagersByDepartmentId(departmentId).stream()
                .filter(manager -> isUsableEvaluator(manager, targetUser))
                .sorted(userComparator())
                .toList();
        if (!departmentManagers.isEmpty()) {
            return departmentManagers;
        }

        return departmentHeads;
    }

    @Override
    public LinkedHashSet<Long> resolveManagerEmployeeIds(User targetUser) {
        return resolveManagerUsers(targetUser).stream()
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .collect(Collectors.toCollection(LinkedHashSet::new));
    }

    @Override
    public LinkedHashSet<Long> resolveSubordinateEmployeeIds(User targetUser) {
        LinkedHashSet<Long> employeeIds = new LinkedHashSet<>();
        if (!isActiveEmployeeUser(targetUser)) {
            return employeeIds;
        }

        // Team Leader target: subordinates are active members of active teams they lead.
        List<Team> teamsLed = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(targetUser.getId(), "Active");
        teamsLed.stream()
                .sorted(teamComparator())
                .flatMap(team -> safeTeamMembers(team).stream())
                .filter(member -> member.getEndedDate() == null)
                .map(TeamMember::getMemberUser)
                .filter(user -> isUsableEvaluator(user, targetUser))
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add);

        if (!employeeIds.isEmpty()) {
            return employeeIds;
        }

        if (!isDepartmentLevelManager(targetUser)) {
            return employeeIds;
        }

        Integer departmentId = targetUser.getDepartmentId();
        if (departmentId == null) {
            return employeeIds;
        }

        List<Team> activeDepartmentTeams = teamRepository.findByDepartmentIdAndStatusIgnoreCase(departmentId, "Active").stream()
                .filter(this::isActiveTeam)
                .sorted(teamComparator())
                .toList();

        if (!activeDepartmentTeams.isEmpty()) {
            activeDepartmentTeams.stream()
                    .map(Team::getTeamLeader)
                    .filter(user -> isUsableEvaluator(user, targetUser))
                    .map(User::getEmployeeId)
                    .filter(Objects::nonNull)
                    .map(Integer::longValue)
                    .forEach(employeeIds::add);
            return employeeIds;
        }

        userRepository.findByDepartmentIdAndActiveTrue(departmentId).stream()
                .filter(user -> isUsableEvaluator(user, targetUser))
                .filter(user -> !isHrAdminOrExecutive(user))
                .filter(user -> !hasDepartmentHeadRole(user))
                .sorted(userComparator())
                .map(User::getEmployeeId)
                .filter(Objects::nonNull)
                .map(Integer::longValue)
                .forEach(employeeIds::add);

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
        Long targetEmployeeId = targetUser.getEmployeeId() == null ? null : targetUser.getEmployeeId().longValue();
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
                && team.getStatus().equalsIgnoreCase("Active");
    }

    private List<TeamMember> safeTeamMembers(Team team) {
        return team == null || team.getTeamMembers() == null ? List.of() : team.getTeamMembers();
    }

    private boolean isDepartmentLevelManager(User user) {
        return hasManagerRole(user) || hasDepartmentHeadRole(user) || hasManagerLikePositionTitle(user);
    }

    private boolean hasManagerRole(User user) {
        return !Collections.disjoint(normalizedRoleNames(user), MANAGER_ROLE_NAMES);
    }

    private boolean hasDepartmentHeadRole(User user) {
        return !Collections.disjoint(normalizedRoleNames(user), DEPARTMENT_HEAD_ROLE_NAMES);
    }

    private boolean hasManagerLikePositionTitle(User user) {
        String title = user == null || user.getPosition() == null ? "" : normalizeLabel(user.getPosition().getPositionTitle());
        return containsAny(title, "MANAGER", "PROJECT_MANAGER", "PROJECTMANAGER", "PM", "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "HEAD_OF_DEPARTMENT");
    }

    private PeerLayer resolvePeerLayer(User user) {
        if (user == null) {
            return PeerLayer.INDIVIDUAL_CONTRIBUTOR;
        }
        Set<String> roles = normalizedRoleNames(user);
        String title = user.getPosition() == null ? "" : normalizeLabel(user.getPosition().getPositionTitle());
        if (!Collections.disjoint(roles, EXECUTIVE_ROLE_NAMES) || containsAny(title, "CEO", "CHIEF", "EXECUTIVE", "DIRECTOR")) {
            return PeerLayer.EXECUTIVE;
        }
        if (!Collections.disjoint(roles, DEPARTMENT_HEAD_ROLE_NAMES)
                || containsAny(title, "DEPARTMENT_HEAD", "DEPARTMENTHEAD", "DEPT_HEAD", "HEAD_OF_DEPARTMENT", "HEAD")) {
            return PeerLayer.DEPARTMENT_HEAD;
        }
        if (!Collections.disjoint(roles, MANAGER_ROLE_NAMES) || containsAny(title, "MANAGER", "PROJECT_MANAGER", "PROJECTMANAGER", "PM")) {
            return PeerLayer.MANAGER;
        }
        if (containsAny(title, "LEAD", "SUPERVISOR", "TEAM_LEADER", "TEAMLEADER")) {
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
                .thenComparing(user -> safeLower(user.getEmail()))
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
        return value == null ? "" : value.toLowerCase(Locale.ROOT);
    }

    private enum PeerLayer {
        INDIVIDUAL_CONTRIBUTOR,
        LEAD_OR_SUPERVISOR,
        MANAGER,
        DEPARTMENT_HEAD,
        EXECUTIVE
    }
}
