package com.epms.service.impl;

import com.epms.dto.PositionPermissionDto;
import com.epms.dto.TeamPermissionImpactPreviewDto;
import com.epms.entity.Position;
import com.epms.entity.PositionPermission;
import com.epms.entity.Team;
import com.epms.entity.TeamHistory;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PositionPermissionRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.TeamHistoryRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.service.NotificationService;
import com.epms.service.TeamPermissionImpactService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class TeamPermissionImpactServiceImpl implements TeamPermissionImpactService {

    private static final String REASON = "Position permission changed";

    private final PositionRepository positionRepository;
    private final PositionPermissionRepository positionPermissionRepository;
    private final UserRepository userRepository;
    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final TeamHistoryRepository teamHistoryRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional(readOnly = true)
    public TeamPermissionImpactPreviewDto previewImpact(Integer positionId, PositionPermissionDto nextPermissions) {
        PositionPermissionDto currentPermissions = positionPermissionRepository.findByPositionId(positionId)
                .map(this::toDto)
                .orElseGet(PositionPermissionDto::new);

        return previewImpact(positionId, currentPermissions, nextPermissions);
    }

    @Override
    @Transactional(readOnly = true)
    public TeamPermissionImpactPreviewDto previewImpact(
            Integer positionId,
            PositionPermissionDto currentPermissions,
            PositionPermissionDto nextPermissions
    ) {
        Position position = getPositionOrThrow(positionId);
        TeamPermissionImpactPreviewDto preview = emptyPreview(position);
        collectImpactItems(positionId, position.getPositionTitle(), currentPermissions, nextPermissions, preview);
        finishPreview(preview);
        return preview;
    }

    @Override
    @Transactional
    public TeamPermissionImpactPreviewDto applyImpact(
            Integer positionId,
            PositionPermissionDto currentPermissions,
            PositionPermissionDto nextPermissions,
            User editor
    ) {
        Position position = getPositionOrThrow(positionId);
        TeamPermissionImpactPreviewDto preview = emptyPreview(position);
        collectImpactItems(positionId, position.getPositionTitle(), currentPermissions, nextPermissions, preview);
        finishPreview(preview);

        if (!preview.isHasImpact()) {
            return preview;
        }

        Date now = new Date();
        String positionTitle = position.getPositionTitle();
        List<User> affectedUsers = activeUsersByPosition(positionId);

        if (losesMemberPermission(currentPermissions, nextPermissions)) {
            for (User user : affectedUsers) {
                List<TeamMember> memberships = teamMemberRepository.findByMemberUserIdAndEndedDateIsNull(user.getId());

                for (TeamMember membership : memberships) {
                    Team team = membership.getTeam();
                    if (!isActiveTeam(team)) {
                        continue;
                    }

                    membership.setEndedDate(now);
                    membership.setEditedByUser(editor);
                    teamMemberRepository.save(membership);

                    recordHistory(
                            team,
                            "MEMBER_REMOVED_PERMISSION_CHANGE",
                            "Member",
                            displayUser(user),
                            null,
                            displayUser(user) + " was removed from this team because position "
                                    + nullToDash(positionTitle)
                                    + " no longer has Can be Team Member permission.",
                            editor
                    );

                    sendImpactNotification(
                            team,
                            user,
                            "Team Member Removed",
                            displayUser(user) + " was removed from team "
                                    + nullToDash(team.getTeamName())
                                    + " because position "
                                    + nullToDash(positionTitle)
                                    + " no longer has Can be Team Member permission."
                    );
                }
            }
        }

        if (losesProjectManagerPermission(currentPermissions, nextPermissions)) {
            for (User user : affectedUsers) {
                List<Team> teams = teamRepository.findByProjectManagerIdAndStatusIgnoreCase(user.getId(), "Active");

                for (Team team : teams) {
                    if (team.getProjectManager() == null || !Objects.equals(team.getProjectManager().getId(), user.getId())) {
                        continue;
                    }

                    team.setProjectManager(null);
                    teamRepository.save(team);

                    recordHistory(
                            team,
                            "PROJECT_MANAGER_REMOVED_PERMISSION_CHANGE",
                            "Project Manager",
                            displayUser(user),
                            null,
                            displayUser(user) + " was removed as Project Manager because position "
                                    + nullToDash(positionTitle)
                                    + " no longer has Can be Project Manager permission.",
                            editor
                    );

                    sendImpactNotification(
                            team,
                            user,
                            "Project Manager Removed",
                            displayUser(user) + " was removed as Project Manager from team "
                                    + nullToDash(team.getTeamName())
                                    + " because position "
                                    + nullToDash(positionTitle)
                                    + " no longer has Can be Project Manager permission."
                    );
                }
            }
        }

        if (losesLeaderPermission(currentPermissions, nextPermissions)) {
            for (User user : affectedUsers) {
                List<Team> teams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(user.getId(), "Active");

                for (Team team : teams) {
                    team.setStatus("Inactive");
                    teamRepository.save(team);

                    recordHistory(
                            team,
                            "TEAM_INACTIVATED_PERMISSION_CHANGE",
                            "Status",
                            "Active",
                            "Inactive",
                            "Team was inactivated because Team Leader "
                                    + displayUser(user)
                                    + " belongs to position "
                                    + nullToDash(positionTitle)
                                    + ", which no longer has Can be Team Leader permission.",
                            editor
                    );

                    sendImpactNotification(
                            team,
                            user,
                            "Team Inactivated",
                            "Team "
                                    + nullToDash(team.getTeamName())
                                    + " was inactivated because Team Leader "
                                    + displayUser(user)
                                    + " lost Can be Team Leader permission through position "
                                    + nullToDash(positionTitle)
                                    + "."
                    );
                }
            }
        }

        return preview;
    }

    private void collectImpactItems(
            Integer positionId,
            String positionTitle,
            PositionPermissionDto currentPermissions,
            PositionPermissionDto nextPermissions,
            TeamPermissionImpactPreviewDto preview
    ) {
        List<User> affectedUsers = activeUsersByPosition(positionId);

        if (losesMemberPermission(currentPermissions, nextPermissions)) {
            for (User user : affectedUsers) {
                List<TeamMember> memberships = teamMemberRepository.findByMemberUserIdAndEndedDateIsNull(user.getId());

                for (TeamMember membership : memberships) {
                    Team team = membership.getTeam();
                    if (!isActiveTeam(team)) {
                        continue;
                    }

                    preview.getItems().add(TeamPermissionImpactPreviewDto.ImpactItem.builder()
                            .impactType("MEMBER_REMOVAL")
                            .teamId(team.getId())
                            .teamName(team.getTeamName())
                            .userId(user.getId())
                            .userName(displayUser(user))
                            .positionTitle(positionTitle)
                            .message(displayUser(user) + " will be removed as member from " + nullToDash(team.getTeamName()) + ".")
                            .build());
                }
            }
        }

        if (losesProjectManagerPermission(currentPermissions, nextPermissions)) {
            for (User user : affectedUsers) {
                List<Team> teams = teamRepository.findByProjectManagerIdAndStatusIgnoreCase(user.getId(), "Active");

                for (Team team : teams) {
                    preview.getItems().add(TeamPermissionImpactPreviewDto.ImpactItem.builder()
                            .impactType("PROJECT_MANAGER_REMOVAL")
                            .teamId(team.getId())
                            .teamName(team.getTeamName())
                            .userId(user.getId())
                            .userName(displayUser(user))
                            .positionTitle(positionTitle)
                            .message(displayUser(user) + " will be removed as Project Manager from " + nullToDash(team.getTeamName()) + ".")
                            .build());
                }
            }
        }

        if (losesLeaderPermission(currentPermissions, nextPermissions)) {
            for (User user : affectedUsers) {
                List<Team> teams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(user.getId(), "Active");

                for (Team team : teams) {
                    preview.getItems().add(TeamPermissionImpactPreviewDto.ImpactItem.builder()
                            .impactType("TEAM_INACTIVATION")
                            .teamId(team.getId())
                            .teamName(team.getTeamName())
                            .userId(user.getId())
                            .userName(displayUser(user))
                            .positionTitle(positionTitle)
                            .message(nullToDash(team.getTeamName()) + " will be inactivated because " + displayUser(user) + " is the Team Leader.")
                            .build());
                }
            }
        }
    }

    private void finishPreview(TeamPermissionImpactPreviewDto preview) {
        int memberRemovalCount = 0;
        int projectManagerRemovalCount = 0;
        int teamInactivationCount = 0;

        for (TeamPermissionImpactPreviewDto.ImpactItem item : preview.getItems()) {
            if ("MEMBER_REMOVAL".equals(item.getImpactType())) {
                memberRemovalCount++;
            } else if ("PROJECT_MANAGER_REMOVAL".equals(item.getImpactType())) {
                projectManagerRemovalCount++;
            } else if ("TEAM_INACTIVATION".equals(item.getImpactType())) {
                teamInactivationCount++;
            }
        }

        preview.setMemberRemovalCount(memberRemovalCount);
        preview.setProjectManagerRemovalCount(projectManagerRemovalCount);
        preview.setTeamInactivationCount(teamInactivationCount);
        preview.setHasImpact(memberRemovalCount > 0 || projectManagerRemovalCount > 0 || teamInactivationCount > 0);
    }

    private TeamPermissionImpactPreviewDto emptyPreview(Position position) {
        return TeamPermissionImpactPreviewDto.builder()
                .positionId(position.getId())
                .positionTitle(position.getPositionTitle())
                .hasImpact(false)
                .memberRemovalCount(0)
                .projectManagerRemovalCount(0)
                .teamInactivationCount(0)
                .build();
    }

    private boolean losesLeaderPermission(PositionPermissionDto currentPermissions, PositionPermissionDto nextPermissions) {
        return safe(currentPermissions.getTeamAssignAsLeader()) && !safe(nextPermissions.getTeamAssignAsLeader());
    }

    private boolean losesProjectManagerPermission(PositionPermissionDto currentPermissions, PositionPermissionDto nextPermissions) {
        return safe(currentPermissions.getTeamAssignAsPm()) && !safe(nextPermissions.getTeamAssignAsPm());
    }

    private boolean losesMemberPermission(PositionPermissionDto currentPermissions, PositionPermissionDto nextPermissions) {
        return safe(currentPermissions.getTeamAssignAsMember()) && !safe(nextPermissions.getTeamAssignAsMember());
    }

    private List<User> activeUsersByPosition(Integer positionId) {
        return userRepository.findByPositionIdForPositionDetails(positionId)
                .stream()
                .filter(this::isActiveUser)
                .toList();
    }

    private Position getPositionOrThrow(Integer positionId) {
        return positionRepository.findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found: " + positionId));
    }

    private PositionPermissionDto toDto(PositionPermission pp) {
        PositionPermissionDto dto = new PositionPermissionDto();
        dto.setOneOnOneCreate(safe(pp.getOneOnOneCreate()));
        dto.setOneOnOneDeptSelection(safe(pp.getOneOnOneDeptSelection()));
        dto.setOneOnOneTeamSelection(safe(pp.getOneOnOneTeamSelection()));
        dto.setTeamCreate(safe(pp.getTeamCreate()));
        dto.setTeamEdit(safe(pp.getTeamEdit()));
        dto.setTeamHistory(safe(pp.getTeamHistory()));
        dto.setTeamAssignAsLeader(safe(pp.getTeamAssignAsLeader()));
        dto.setTeamAssignAsPm(safe(pp.getTeamAssignAsPm()));
        dto.setTeamAssignAsMember(safe(pp.getTeamAssignAsMember()));
        dto.setPipCreate(safe(pp.getPipCreate()));
        dto.setPipEdit(safe(pp.getPipEdit()));
        dto.setPipViewAll(safe(pp.getPipViewAll()));
        dto.setAppraisalReview(safe(pp.getAppraisalReview()));
        dto.setAppraisalApprove(safe(pp.getAppraisalApprove()));
        dto.setKpiCreate(safe(pp.getKpiCreate()));
        dto.setKpiEdit(safe(pp.getKpiEdit()));
        dto.setKpiScore(safe(pp.getKpiScore()));
        dto.setFeedbackSend(safe(pp.getFeedbackSend()));
        return dto;
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
        history.setReason(reason == null || reason.isBlank() ? REASON : reason);
        history.setChangedBy(changedBy);
        history.setChangedByName(displayUser(changedBy));
        history.setChangedAt(new Date());
        teamHistoryRepository.save(history);
    }

    private void sendImpactNotification(Team team, User affectedUser, String title, String message) {
        Set<Integer> recipientIds = new LinkedHashSet<>();

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

        if (affectedUser != null && affectedUser.getId() != null) {
            recipientIds.add(affectedUser.getId());
        }

        recipientIds.stream()
                .filter(Objects::nonNull)
                .forEach(userId -> notificationService.send(userId, title, message, "GENERAL", team.getId()));
    }

    private boolean isActiveTeam(Team team) {
        return team != null && team.getStatus() != null && team.getStatus().equalsIgnoreCase("Active");
    }

    private boolean isActiveUser(User user) {
        return user != null && (user.getActive() == null || Boolean.TRUE.equals(user.getActive()));
    }

    private boolean safe(Boolean value) {
        return Boolean.TRUE.equals(value);
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

    private String nullToDash(String value) {
        return value == null || value.isBlank() ? "—" : value;
    }
}