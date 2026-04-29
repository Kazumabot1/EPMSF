package com.epms.service.impl;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.entity.Department;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.Objects;
import java.util.stream.Collectors;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.exception.BusinessValidationException;

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;

    @Override
    @Transactional
    public TeamResponseDto createTeam(TeamRequestDto dto) {
        validateCreateRequest(dto);

        Department department = departmentRepository.findById(dto.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Department not found: " + dto.getDepartmentId()));

        User leader = userRepository.findById(dto.getTeamLeaderId())
                .orElseThrow(() -> new RuntimeException("Team Leader not found: " + dto.getTeamLeaderId()));

        User creator = userRepository.findById(dto.getCreatedById())
                .orElseThrow(() -> new RuntimeException("Creator not found: " + dto.getCreatedById()));

        validateUserBelongsToDepartment(leader, department.getId(), "Selected Team Leader must belong to the same department as the team");
        validateLeaderIsAvailableForActiveTeam(leader.getId(), null);

        Team team = new Team();
        team.setTeamName(dto.getTeamName());
        team.setDepartment(department);
        team.setTeamLeader(leader);
        team.setCreatedByUser(creator);
        team.setTeamGoal(dto.getTeamGoal());
        team.setStatus(normalizeStatus(dto.getStatus()));
        team.setCreatedDate(new Date());

        Team savedTeam = teamRepository.save(team);
        syncMembers(savedTeam, dto.getEffectiveMemberUserIds(), creator);

        return mapToResponseDto(savedTeam);

    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getAllTeams() {
        return teamRepository.findAll().stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getTeamsByDepartment(Integer departmentId) {
        return teamRepository.findByDepartmentId(departmentId).stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponseDto getTeamById(Integer id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found: " + id));
        return mapToResponseDto(team);
    }

    @Override
    @Transactional
    public TeamResponseDto updateTeam(Integer id, TeamRequestDto dto) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found: " + id));

        if (dto.getTeamName() != null && !dto.getTeamName().trim().isEmpty()) {
            team.setTeamName(dto.getTeamName().trim());
        }

        if (dto.getTeamGoal() != null) {
            team.setTeamGoal(dto.getTeamGoal());
        }

        if (dto.getTeamLeaderId() != null && !Objects.equals(dto.getTeamLeaderId(), team.getTeamLeader().getId())) {
            User newLeader = userRepository.findById(dto.getTeamLeaderId())
                    .orElseThrow(() -> new RuntimeException("New Team Leader not found: " + dto.getTeamLeaderId()));

            validateUserBelongsToDepartment(newLeader, team.getDepartment().getId(), "New Team Leader must belong to the same department");

            if (isActive(team.getStatus())) {
                validateLeaderIsAvailableForActiveTeam(newLeader.getId(), team.getId());
            }

            team.setTeamLeader(newLeader);
        }

        if (dto.getStatus() != null && !dto.getStatus().equalsIgnoreCase(team.getStatus())) {
            String newStatus = normalizeStatus(dto.getStatus());
            if (isActive(newStatus)) {
                validateLeaderIsAvailableForActiveTeam(team.getTeamLeader().getId(), team.getId());
                validateCurrentMembersAreAvailableForActiveTeam(team);
            }
            team.setStatus(newStatus);
        }

        User editor = null;
        if (dto.getCreatedById() != null) {
            editor = userRepository.findById(dto.getCreatedById())
                    .orElseThrow(() -> new RuntimeException("Editor not found: " + dto.getCreatedById()));
        }

        Team updatedTeam = teamRepository.save(team);

        if (dto.getEffectiveMemberUserIds() != null) {
            if (editor == null) {
                editor = updatedTeam.getCreatedByUser();
            }
            syncMembers(updatedTeam, dto.getEffectiveMemberUserIds(), editor);
        }


        return mapToResponseDto(updatedTeam);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateUsers(Integer departmentId) {
        List<User> users = userRepository.findByDepartmentIdAndActiveTrue(departmentId);
        List<CandidateResponseDto> candidates = new ArrayList<>();

        for (User user : users) {
            if (user.getPosition() == null || user.getPosition().getPositionTitle() == null) {
                continue;
            }

            String positionTitle = user.getPosition().getPositionTitle().toLowerCase().replace(" ", "");
            if (!positionTitle.contains("teamleader")) {
                continue;
            }

            Team activeTeam = getFirstActiveLeaderTeam(user.getId());
            candidates.add(toCandidate(user, activeTeam));
        }

        return candidates;
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getCandidateMembers(Integer deptId) {
        List<User> users = userRepository.findByDepartmentIdAndActiveTrue(deptId);
        List<CandidateResponseDto> candidates = new ArrayList<>();

        for (User user : users) {
            Team activeTeam = getFirstActiveMemberTeam(user.getId());

            if (activeTeam == null) {
                activeTeam = getFirstActiveLeaderTeam(user.getId());
            }

            candidates.add(toCandidate(user, activeTeam));
        }

        return candidates;
    }

    private void validateCreateRequest(TeamRequestDto dto) {
        if (dto.getTeamName() == null || dto.getTeamName().trim().isEmpty()) {
            throw new RuntimeException("Team name is required");
        }
        if (dto.getDepartmentId() == null) {
            throw new RuntimeException("Department is required");
        }
        if (dto.getTeamLeaderId() == null) {
            throw new RuntimeException("Team Leader is required");
        }
        if (dto.getCreatedById() == null) {
            throw new RuntimeException("Created by user is required");
        }
    }

    private void syncMembers(Team team, List<Integer> memberUserIds, User editor) {

        team.clearTeamMembers();

        if (memberUserIds == null || memberUserIds.isEmpty()) {
            return;
        }

        for (Integer userId : memberUserIds) {
            if (userId == null) {
                continue;
            }

            if (Objects.equals(userId, team.getTeamLeader().getId())) {
                throw new RuntimeException("Team Leader cannot also be added as a team member");
            }

            User memberUser = userRepository.findById(userId)
                    .orElseThrow(() -> new RuntimeException("User not found: " + userId));

            validateUserBelongsToDepartment(
                    memberUser,
                    team.getDepartment().getId(),
                    "Team member " + memberUser.getFullName() + " must belong to the same department"
            );

            if (isActive(team.getStatus())) {
                validateMemberIsAvailableForActiveTeam(userId, team.getId(), memberUser.getFullName());
                validateLeaderIsAvailableForActiveTeam(
                        userId,
                        team.getId(),
                        "User " + memberUser.getFullName() + " is already leading an Active team"
                );
            }

            TeamMember member = new TeamMember();
            member.setMemberUser(memberUser);
            member.setStartedDate(new Date());
            member.setEditedByUser(editor);

            team.addTeamMember(member);
        }

        teamRepository.save(team);
    }
    private void validateCurrentMembersAreAvailableForActiveTeam(Team team) {
        List<TeamMember> members = teamMemberRepository.findByTeamId(team.getId());
        for (TeamMember member : members) {
            validateMemberIsAvailableForActiveTeam(
                    member.getMemberUser().getId(),
                    team.getId(),
                    member.getMemberUser().getFullName()
            );
        }
    }

    private void validateMemberIsAvailableForActiveTeam(Integer userId, Integer currentTeamId, String fullName) {
        List<TeamMember> memberships = teamMemberRepository.findByMemberUserId(userId);
        for (TeamMember membership : memberships) {
            Team otherTeam = membership.getTeam();
            if (otherTeam != null && isActive(otherTeam.getStatus()) && !Objects.equals(otherTeam.getId(), currentTeamId)) {
                throw new RuntimeException("User " + fullName + " is already in an Active team: " + otherTeam.getTeamName());
            }
        }
    }

    private void validateLeaderIsAvailableForActiveTeam(Integer leaderId, Integer currentTeamId) {
        validateLeaderIsAvailableForActiveTeam(leaderId, currentTeamId, "Selected Team Leader is already leading an Active team");
    }

    private void validateLeaderIsAvailableForActiveTeam(Integer leaderId, Integer currentTeamId, String message) {
        List<Team> activeLeaderTeams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(leaderId, "Active");
        for (Team activeTeam : activeLeaderTeams) {
            if (!Objects.equals(activeTeam.getId(), currentTeamId)) {
                throw new RuntimeException(message + ": " + activeTeam.getTeamName());
            }
        }
    }

    private void validateUserBelongsToDepartment(User user, Integer departmentId, String message) {
        if (user.getDepartmentId() == null || !user.getDepartmentId().equals(departmentId)) {
            throw new RuntimeException(message);
        }
    }

    private Team getFirstActiveLeaderTeam(Integer userId) {
        List<Team> teams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(userId, "Active");
        return teams.isEmpty() ? null : teams.get(0);
    }

    private Team getFirstActiveMemberTeam(Integer userId) {
        List<TeamMember> memberships = teamMemberRepository.findByMemberUserId(userId);
        for (TeamMember membership : memberships) {
            if (membership.getTeam() != null && isActive(membership.getTeam().getStatus())) {
                return membership.getTeam();
            }
        }
        return null;
    }

    private CandidateResponseDto toCandidate(User user, Team activeTeam) {
        return new CandidateResponseDto(
                user.getId(),
                user.getFullName(),
                "USER",
                user.getDepartmentId(),
                null,
                activeTeam == null,
                activeTeam != null ? activeTeam.getId() : null,
                activeTeam != null ? activeTeam.getTeamName() : null
        );
    }

    private TeamResponseDto mapToResponseDto(Team team) {
        TeamResponseDto dto = new TeamResponseDto();
        dto.setId(team.getId());
        dto.setTeamName(team.getTeamName());
        dto.setDepartmentId(team.getDepartment() != null ? team.getDepartment().getId() : null);
        dto.setDepartmentName(team.getDepartment() != null ? team.getDepartment().getDepartmentName() : null);
        dto.setTeamLeaderId(team.getTeamLeader() != null ? team.getTeamLeader().getId() : null);
        dto.setTeamLeaderName(team.getTeamLeader() != null ? team.getTeamLeader().getFullName() : null);
        dto.setCreatedById(team.getCreatedByUser() != null ? team.getCreatedByUser().getId() : null);
        dto.setCreatedByName(team.getCreatedByUser() != null ? team.getCreatedByUser().getFullName() : null);
        dto.setCreatedDate(team.getCreatedDate());
        dto.setStatus(team.getStatus());
        dto.setTeamGoal(team.getTeamGoal());

        List<TeamMember> teamMembers = team.getTeamMembers();
        if (teamMembers == null) {
            teamMembers = teamMemberRepository.findByTeamId(team.getId());
        }

        List<TeamResponseDto.MemberInfo> members = teamMembers.stream()
                .filter(member -> member.getMemberUser() != null)
                .map(member -> new TeamResponseDto.MemberInfo(
                        member.getMemberUser().getId(),
                        member.getMemberUser().getFullName(),
                        member.getStartedDate()
                ))
                .collect(Collectors.toList());

        dto.setMembers(members);
        return dto;
    }

    private String normalizeStatus(String status) {
        if (status == null || status.trim().isEmpty()) {
            return "Active";
        }
        String trimmed = status.trim();
        if (trimmed.equalsIgnoreCase("Active")) {
            return "Active";
        }
        if (trimmed.equalsIgnoreCase("Inactive")) {
            return "Inactive";
        }
        return trimmed;
    }

    private boolean isActive(String status) {
        return "Active".equalsIgnoreCase(status);
    }
    @Override
    @Transactional(readOnly = true)
    public List<TeamResponseDto> getMyDepartmentTeams() {
        Integer departmentId = requireCurrentDepartmentId();
        return getTeamsByDepartment(departmentId);
    }

    @Override
    @Transactional(readOnly = true)
    public TeamResponseDto getMyDepartmentTeamById(Integer id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found: " + id));

        assertSameDepartment(team.getDepartment() != null ? team.getDepartment().getId() : null);

        return mapToResponseDto(team);
    }

    @Override
    @Transactional
    public TeamResponseDto createMyDepartmentTeam(TeamRequestDto dto) {
        Integer departmentId = requireCurrentDepartmentId();
        Integer currentUserId = SecurityUtils.currentUserId();

        dto.setDepartmentId(departmentId);
        dto.setCreatedById(currentUserId);

        return createTeam(dto);
    }

    @Override
    @Transactional
    public TeamResponseDto updateMyDepartmentTeam(Integer id, TeamRequestDto dto) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found: " + id));

        assertSameDepartment(team.getDepartment() != null ? team.getDepartment().getId() : null);

        dto.setDepartmentId(team.getDepartment().getId());
        dto.setCreatedById(SecurityUtils.currentUserId());

        return updateTeam(id, dto);
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateUsers() {
        return getCandidateUsers(requireCurrentDepartmentId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<CandidateResponseDto> getMyDepartmentCandidateMembers() {
        return getCandidateMembers(requireCurrentDepartmentId());
    }

    private Integer requireCurrentDepartmentId() {
        UserPrincipal currentUser = SecurityUtils.currentUser();

        if (currentUser.getDepartmentId() == null) {
            throw new BusinessValidationException("Current department head has no assigned department.");
        }

        return currentUser.getDepartmentId();
    }

    private void assertSameDepartment(Integer requestedDepartmentId) {
        Integer currentDepartmentId = requireCurrentDepartmentId();

        if (requestedDepartmentId == null || !requestedDepartmentId.equals(currentDepartmentId)) {
            throw new BusinessValidationException("You can only access teams from your own department.");
        }
    }
}
