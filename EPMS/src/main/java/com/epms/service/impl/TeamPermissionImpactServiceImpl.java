package com.epms.service.impl;

import com.epms.dto.PositionPermissionDto;
import com.epms.dto.TeamPermissionImpactPreviewDto;
import com.epms.entity.Position;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PositionRepository;
import com.epms.repository.TeamRepository;
import com.epms.service.TeamPermissionImpactService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TeamPermissionImpactServiceImpl implements TeamPermissionImpactService {

    private final PositionRepository positionRepository;
    private final TeamRepository teamRepository;

    @Override
    @Transactional(readOnly = true)
    public TeamPermissionImpactPreviewDto previewImpact(Integer positionId, PositionPermissionDto dto) {
        Position position = positionRepository.findById(positionId)
                .orElseThrow(() -> new ResourceNotFoundException("Position not found: " + positionId));

        PositionPermissionDto permission = dto == null ? new PositionPermissionDto() : dto;
        List<TeamPermissionImpactPreviewDto.Item> items = new ArrayList<>();

        boolean canBeLeader = Boolean.TRUE.equals(permission.getTeamAssignAsLeader());
        boolean canBePm = Boolean.TRUE.equals(permission.getTeamAssignAsPm());
        boolean canBeMember = Boolean.TRUE.equals(permission.getTeamAssignAsMember());

        List<Team> teams = teamRepository.findAll();

        for (Team team : teams) {
            if (!isActiveTeam(team)) {
                continue;
            }

            User leader = safeTeamLeader(team);
            User projectManager = safeProjectManager(team);

            if (!canBeLeader && hasPosition(leader, positionId)) {
                items.add(TeamPermissionImpactPreviewDto.Item.builder()
                        .impactType("TEAM_LEADER_REMOVAL")
                        .teamId(team.getId())
                        .teamName(team.getTeamName())
                        .userId(leader.getId())
                        .userName(safeName(leader))
                        .positionTitle(position.getPositionTitle())
                        .message(safeName(leader) + " would no longer be eligible as Team Leader in " + team.getTeamName() + ".")
                        .build());
            }

            if (!canBePm && hasPosition(projectManager, positionId)) {
                items.add(TeamPermissionImpactPreviewDto.Item.builder()
                        .impactType("PROJECT_MANAGER_REMOVAL")
                        .teamId(team.getId())
                        .teamName(team.getTeamName())
                        .userId(projectManager.getId())
                        .userName(safeName(projectManager))
                        .positionTitle(position.getPositionTitle())
                        .message(safeName(projectManager) + " would no longer be eligible as Project Manager in " + team.getTeamName() + ".")
                        .build());
            }

            if (team.getTeamMembers() != null) {
                for (TeamMember member : team.getTeamMembers()) {
                    if (member == null || member.getEndedDate() != null) {
                        continue;
                    }

                    User memberUser = member.getMemberUser();

                    if (!canBeMember && hasPosition(memberUser, positionId)) {
                        items.add(TeamPermissionImpactPreviewDto.Item.builder()
                                .impactType("MEMBER_REMOVAL")
                                .teamId(team.getId())
                                .teamName(team.getTeamName())
                                .userId(memberUser.getId())
                                .userName(safeName(memberUser))
                                .positionTitle(position.getPositionTitle())
                                .message(safeName(memberUser) + " would no longer be eligible as Team Member in " + team.getTeamName() + ".")
                                .build());
                    }
                }
            }

            boolean leaderInvalid = !canBeLeader && hasPosition(leader, positionId);
            boolean pmInvalid = !canBePm && hasPosition(projectManager, positionId);
            boolean hasInvalidMember = hasInvalidMember(team, positionId, canBeMember);

            if (leaderInvalid && pmInvalid && hasInvalidMember) {
                items.add(TeamPermissionImpactPreviewDto.Item.builder()
                        .impactType("TEAM_INACTIVATION")
                        .teamId(team.getId())
                        .teamName(team.getTeamName())
                        .userId(null)
                        .userName(null)
                        .positionTitle(position.getPositionTitle())
                        .message(team.getTeamName() + " may need review because leader, project manager, and members are affected.")
                        .build());
            }
        }

        int memberRemovalCount = count(items, "MEMBER_REMOVAL");
        int projectManagerRemovalCount = count(items, "PROJECT_MANAGER_REMOVAL");
        int teamInactivationCount = count(items, "TEAM_INACTIVATION");

        return TeamPermissionImpactPreviewDto.builder()
                .positionId(position.getId())
                .positionTitle(position.getPositionTitle())
                .hasImpact(!items.isEmpty())
                .memberRemovalCount(memberRemovalCount)
                .projectManagerRemovalCount(projectManagerRemovalCount)
                .teamInactivationCount(teamInactivationCount)
                .items(items)
                .build();
    }

    private boolean hasInvalidMember(Team team, Integer positionId, boolean canBeMember) {
        if (canBeMember || team == null || team.getTeamMembers() == null) {
            return false;
        }

        for (TeamMember member : team.getTeamMembers()) {
            if (member == null || member.getEndedDate() != null) {
                continue;
            }

            if (hasPosition(member.getMemberUser(), positionId)) {
                return true;
            }
        }

        return false;
    }

    private boolean hasPosition(User user, Integer positionId) {
        return user != null
                && user.getPosition() != null
                && user.getPosition().getId() != null
                && user.getPosition().getId().equals(positionId);
    }

    private boolean isActiveTeam(Team team) {
        if (team == null) {
            return false;
        }

        String status = team.getStatus();

        return status == null || status.equalsIgnoreCase("Active");
    }

    private User safeTeamLeader(Team team) {
        try {
            return team == null ? null : team.getTeamLeader();
        } catch (Exception ignored) {
            return null;
        }
    }

    private User safeProjectManager(Team team) {
        try {
            return team == null ? null : team.getProjectManager();
        } catch (Exception ignored) {
            return null;
        }
    }

    private int count(List<TeamPermissionImpactPreviewDto.Item> items, String type) {
        if (items == null || type == null) {
            return 0;
        }

        return (int) items.stream()
                .filter(item -> type.equals(item.getImpactType()))
                .count();
    }

    private String safeName(User user) {
        if (user == null) {
            return "Unknown User";
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