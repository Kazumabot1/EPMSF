// KHN new file
// (Service implementation for Team operations with department validation)

package com.epms.service.impl;

import com.epms.dto.CandidateResponseDto;
import com.epms.dto.TeamRequestDto;
import com.epms.dto.TeamResponseDto;
import com.epms.entity.*;
import com.epms.repository.*;
import com.epms.service.TeamService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeamServiceImpl implements TeamService {

    private final TeamRepository teamRepository;
    private final TeamMemberRepository teamMemberRepository;
    private final UserRepository userRepository;
    private final DepartmentRepository departmentRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    @Transactional
    public TeamResponseDto createTeam(TeamRequestDto dto) {
        // KHN added parts
        // (Validation: Ensure the Team Leader belongs to the same department)
        User leader = userRepository.findById(dto.getTeamLeaderId())
                .orElseThrow(() -> new RuntimeException("Team Leader not found"));
        
        if (!leader.getDepartmentId().equals(dto.getDepartmentId())) {
            throw new RuntimeException("Selected Team Leader must belong to the same department as the team");
        }

        // KHN added parts
        // (Validation: Ensure leader is not already in an Active team)
        List<Team> activeLeaderTeams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(leader.getId(), "Active");
        if (!activeLeaderTeams.isEmpty()) {
            throw new RuntimeException("Selected Team Leader is already leading an Active team: " + activeLeaderTeams.get(0).getTeamName());
        }

        Department department = departmentRepository.findById(dto.getDepartmentId())
                .orElseThrow(() -> new RuntimeException("Department not found"));
        
        User creator = userRepository.findById(dto.getCreatedById())
                .orElseThrow(() -> new RuntimeException("Creator not found"));

        Team team = new Team();
        team.setTeamName(dto.getTeamName());
        team.setDepartment(department);
        team.setTeamLeader(leader);
        team.setCreatedByUser(creator);
        team.setTeamGoal(dto.getTeamGoal());
        team.setStatus(dto.getStatus() != null ? dto.getStatus() : "Active");
        team.setCreatedDate(new Date());

        Team savedTeam = teamRepository.save(team);

        // KHN added parts
        // (Save team members)
        if (dto.getMemberEmployeeIds() != null) {
            for (Integer employeeId : dto.getMemberEmployeeIds()) {
                Employee employee = employeeRepository.findById(employeeId)
                        .orElseThrow(() -> new RuntimeException("Employee not found: " + employeeId));
                
                // KHN added parts
                // (Validation: Ensure member is not already in another Active team)
                List<TeamMember> existingMemberships = teamMemberRepository.findByEmployeeId(employeeId);
                for (TeamMember m : existingMemberships) {
                    if ("Active".equalsIgnoreCase(m.getTeam().getStatus())) {
                        throw new RuntimeException("Employee " + employee.getFirstName() + " is already in an Active team: " + m.getTeam().getTeamName());
                    }
                }

                TeamMember member = new TeamMember();
                member.setTeam(savedTeam);
                member.setEmployee(employee);
                member.setStartedDate(new Date());
                member.setEditedByUser(creator);
                teamMemberRepository.save(member);
            }
        }

        return mapToResponseDto(savedTeam);
    }

    @Override
    public List<TeamResponseDto> getAllTeams() {
        return teamRepository.findAll().stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public List<TeamResponseDto> getTeamsByDepartment(Integer departmentId) {
        return teamRepository.findByDepartmentId(departmentId).stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public TeamResponseDto getTeamById(Integer id) {
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found"));
        return mapToResponseDto(team);
    }

    private TeamResponseDto mapToResponseDto(Team team) {
        TeamResponseDto dto = new TeamResponseDto();
        dto.setId(team.getId());
        dto.setTeamName(team.getTeamName());
        dto.setDepartmentId(team.getDepartment().getId());
        dto.setDepartmentName(team.getDepartment().getDepartmentName());
        dto.setTeamLeaderId(team.getTeamLeader() != null ? team.getTeamLeader().getId() : null);
        dto.setTeamLeaderName(team.getTeamLeader() != null ? team.getTeamLeader().getFullName() : "N/A");
        dto.setCreatedById(team.getCreatedByUser().getId());
        dto.setCreatedByName(team.getCreatedByUser().getFullName());
        dto.setCreatedDate(team.getCreatedDate());
        dto.setStatus(team.getStatus());
        dto.setTeamGoal(team.getTeamGoal());

        // KHN added parts
        // (Map member info)
        List<TeamResponseDto.MemberInfo> members = team.getTeamMembers().stream()
                .map(m -> new TeamResponseDto.MemberInfo(
                        m.getEmployee().getId(),
                        m.getEmployee().getFirstName() + " " + m.getEmployee().getLastName(),
                        m.getStartedDate()
                ))
                .collect(Collectors.toList());
        dto.setMembers(members);

        return dto;
    }

    @Override
    @Transactional
    public TeamResponseDto updateTeam(Integer id, TeamRequestDto dto) {
        // KHN added parts
        // (Full update workflow with validation and sync)
        Team team = teamRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Team not found"));

        if (dto.getTeamName() != null && !dto.getTeamName().isEmpty()) {
            team.setTeamName(dto.getTeamName());
        }
        if (dto.getTeamGoal() != null) {
            team.setTeamGoal(dto.getTeamGoal());
        }
        
        // Status toggle logic
        if (dto.getStatus() != null && !dto.getStatus().equalsIgnoreCase(team.getStatus())) {
            // Cannot activate a team if any member is currently active in another team
            if ("Active".equalsIgnoreCase(dto.getStatus())) {
                if (team.getTeamLeader() != null) {
                    List<Team> activeLeaderTeams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(team.getTeamLeader().getId(), "Active");
                    if (!activeLeaderTeams.isEmpty() && !activeLeaderTeams.get(0).getId().equals(team.getId())) {
                        throw new RuntimeException("Cannot activate team: Leader is already active in another team.");
                    }
                }
                
                for (TeamMember m : team.getTeamMembers()) {
                    List<TeamMember> activeMemberships = teamMemberRepository.findByEmployeeId(m.getEmployee().getId());
                    for (TeamMember am : activeMemberships) {
                        if ("Active".equalsIgnoreCase(am.getTeam().getStatus()) && !am.getTeam().getId().equals(team.getId())) {
                            throw new RuntimeException("Cannot activate team: Member " + m.getEmployee().getFirstName() + " is active in another team.");
                        }
                    }
                }
            }
            team.setStatus(dto.getStatus());
        }

        if (dto.getTeamLeaderId() != null && (team.getTeamLeader() == null || !dto.getTeamLeaderId().equals(team.getTeamLeader().getId()))) {
            User newLeader = userRepository.findById(dto.getTeamLeaderId())
                    .orElseThrow(() -> new RuntimeException("New Team Leader not found"));
            
            if (!newLeader.getDepartmentId().equals(team.getDepartment().getId())) {
                throw new RuntimeException("New Team Leader must belong to the same department");
            }

            if ("Active".equalsIgnoreCase(team.getStatus())) {
                List<Team> activeLeaderTeams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(newLeader.getId(), "Active");
                if (!activeLeaderTeams.isEmpty()) {
                    throw new RuntimeException("Selected Team Leader is already leading an Active team.");
                }
            }
            team.setTeamLeader(newLeader);
        }

        Team updatedTeam = teamRepository.save(team);

        // Sync members if provided
        if (dto.getMemberEmployeeIds() != null) {
            List<TeamMember> currentMembers = teamMemberRepository.findByTeamId(updatedTeam.getId());
            teamMemberRepository.deleteAll(currentMembers);

            User editor = userRepository.findById(dto.getCreatedById())
                    .orElseThrow(() -> new RuntimeException("Editor not found"));

            for (Integer employeeId : dto.getMemberEmployeeIds()) {
                Employee employee = employeeRepository.findById(employeeId)
                        .orElseThrow(() -> new RuntimeException("Employee not found"));

                if ("Active".equalsIgnoreCase(updatedTeam.getStatus())) {
                    List<TeamMember> existingMemberships = teamMemberRepository.findByEmployeeId(employeeId);
                    for (TeamMember m : existingMemberships) {
                        // Skip if it is the team we are currently updating (since we just deleted members, this is a safety net)
                        if ("Active".equalsIgnoreCase(m.getTeam().getStatus()) && !m.getTeam().getId().equals(updatedTeam.getId())) {
                            throw new RuntimeException("Employee " + employee.getFirstName() + " is already in an Active team.");
                        }
                    }
                }

                TeamMember member = new TeamMember();
                member.setTeam(updatedTeam);
                member.setEmployee(employee);
                member.setStartedDate(new Date());
                member.setEditedByUser(editor);
                teamMemberRepository.save(member);
            }
            
            // Refresh relationship for mapping
            updatedTeam.setTeamMembers(teamMemberRepository.findByTeamId(updatedTeam.getId()));
        }

        return mapToResponseDto(updatedTeam);
    }

    @Override
    public List<CandidateResponseDto> getCandidateUsers(Integer departmentId) {
        List<User> users = userRepository.findByDepartmentIdAndActiveTrue(departmentId);
        List<CandidateResponseDto> candidates = new ArrayList<>();
        
        for (User u : users) {
            List<Team> activeTeams = teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(u.getId(), "Active");
            Team activeTeam = activeTeams.isEmpty() ? null : activeTeams.get(0);
            
            candidates.add(new CandidateResponseDto(
                u.getId(),
                u.getFullName(),
                "USER",
                u.getDepartmentId(),
                null, // Join/derive if needed
                activeTeam == null,
                activeTeam != null ? activeTeam.getId() : null,
                activeTeam != null ? activeTeam.getTeamName() : null
            ));
        }
        return candidates;
    }

    @Override
    public List<CandidateResponseDto> getCandidateEmployees() {
        List<Employee> employees = employeeRepository.findAll();
        List<CandidateResponseDto> candidates = new ArrayList<>();
        
        for (Employee e : employees) {
            List<TeamMember> memberships = teamMemberRepository.findByEmployeeId(e.getId());
            Team activeTeam = null;
            for (TeamMember m : memberships) {
                if ("Active".equalsIgnoreCase(m.getTeam().getStatus())) {
                    activeTeam = m.getTeam();
                    break;
                }
            }
            
            candidates.add(new CandidateResponseDto(
                e.getId(),
                e.getFirstName() + " " + e.getLastName(),
                "EMPLOYEE",
                null,
                null,
                activeTeam == null,
                activeTeam != null ? activeTeam.getId() : null,
                activeTeam != null ? activeTeam.getTeamName() : null
            ));
        }
        return candidates;
    }
}
