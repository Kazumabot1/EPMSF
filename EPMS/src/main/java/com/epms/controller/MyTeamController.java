package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.TeamResponseDto;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;

@RestController
@RequestMapping("/api/my-team")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class MyTeamController {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<GenericApiResponse<List<TeamResponseDto>>> getMyTeamComposition() {
        Integer currentUserId = SecurityUtils.currentUserId();
        Map<Integer, Team> teamsById = new LinkedHashMap<>();

        teamRepository.findByTeamLeaderId(currentUserId).forEach(team -> addIfActive(teamsById, team));
        teamRepository.findByProjectManagerId(currentUserId).forEach(team -> addIfActive(teamsById, team));

        for (TeamMember membership : teamMemberRepository.findByMemberUserIdAndEndedDateIsNull(currentUserId)) {
            addIfActive(teamsById, membership.getTeam());
        }

        List<TeamResponseDto> response = teamsById.values()
                .stream()
                .sorted(Comparator.comparing(Team::getTeamName, Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)))
                .map(this::toDto)
                .toList();

        return ResponseEntity.ok(GenericApiResponse.success("My team composition fetched", response));
    }

    private void addIfActive(Map<Integer, Team> teamsById, Team team) {
        if (team == null || team.getId() == null) {
            return;
        }

        if (team.getStatus() != null && !"active".equalsIgnoreCase(team.getStatus())) {
            return;
        }

        teamsById.putIfAbsent(team.getId(), team);
    }

    private TeamResponseDto toDto(Team team) {
        List<TeamResponseDto.MemberInfo> members = new ArrayList<>();

        if (team.getTeamMembers() != null) {
            team.getTeamMembers()
                    .stream()
                    .filter(member -> member.getEndedDate() == null)
                    .filter(member -> member.getMemberUser() != null)
                    .sorted(Comparator.comparing(
                            member -> displayUser(member.getMemberUser()),
                            Comparator.nullsLast(String.CASE_INSENSITIVE_ORDER)
                    ))
                    .forEach(member -> members.add(toMemberDto(member)));
        }

        User leader = team.getTeamLeader();
        User projectManager = team.getProjectManager();
        User createdBy = team.getCreatedByUser();

        return new TeamResponseDto(
                team.getId(),
                team.getTeamName(),
                team.getDepartment() != null ? team.getDepartment().getId() : null,
                team.getDepartment() != null ? team.getDepartment().getDepartmentName() : null,
                leader != null ? leader.getId() : null,
                displayUser(leader),
                projectManager != null ? projectManager.getId() : null,
                displayUser(projectManager),
                null,
                createdBy != null ? createdBy.getId() : null,
                displayUser(createdBy),
                team.getCreatedDate(),
                team.getStatus(),
                team.getTeamGoal(),
                members
        );
    }

    private TeamResponseDto.MemberInfo toMemberDto(TeamMember member) {
        User user = member.getMemberUser();

        return new TeamResponseDto.MemberInfo(
                user != null ? user.getId() : null,
                displayUser(user),
                member.getStartedDate()
        );
    }

    private String displayUser(User user) {
        if (user == null) {
            return null;
        }

        String fullName = user.getFullName();
        if (fullName != null && !fullName.isBlank()) {
            return fullName.trim();
        }

        String employeeCode = user.getEmployeeCode();
        if (employeeCode != null && !employeeCode.isBlank()) {
            return employeeCode.trim();
        }

        return Objects.toString(user.getEmail(), "User #" + user.getId());
    }
}
