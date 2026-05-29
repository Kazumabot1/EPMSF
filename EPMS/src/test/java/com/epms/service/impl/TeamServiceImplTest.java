package com.epms.service.impl;

import com.epms.dto.CandidateResponseDto;
import com.epms.entity.Position;
import com.epms.entity.PositionPermission;
import com.epms.entity.Team;
import com.epms.entity.User;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeDepartmentRepository;
import com.epms.repository.RoleRepository;
import com.epms.repository.TeamHistoryRepository;
import com.epms.repository.TeamMemberRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.repository.UserRoleRepository;
import com.epms.security.UserPrincipal;
import com.epms.service.NotificationService;
import com.epms.service.PositionPermissionService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamServiceImplTest {

    @Mock
    private TeamRepository teamRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private TeamMemberRepository teamMemberRepository;
    @Mock
    private EmployeeDepartmentRepository employeeDepartmentRepository;
    @Mock
    private TeamHistoryRepository teamHistoryRepository;
    @Mock
    private NotificationService notificationService;
    @Mock
    private UserRoleRepository userRoleRepository;
    @Mock
    private RoleRepository roleRepository;
    @Mock
    private PositionPermissionService positionPermissionService;

    @InjectMocks
    private TeamServiceImpl teamService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void candidatesKeepTeamLeaderAndProjectManagerOutOfMemberList() {
        User currentHead = user(99, "Department Head", position("PS HEAD", "none"));
        currentHead.setDashboard("DEPARTMENT_HEAD_DASHBOARD");
        User teamLeader = user(20, "Team Leader", position("19-TEAM LEADER", "teamAssignAsLeader"));
        User projectManager = user(19, "Project Manager", position("17-PROJECT MANAGER", "teamAssignAsPm"));
        User normalEmployee = user(21, "Normal Employee", position("26-SE", "teamAssignAsMember"));
        User departmentHead = user(18, "Other Department Head", position("07-PS HEAD", "none"));

        Team activeTeam = new Team();
        activeTeam.setId(1);
        activeTeam.setTeamName("IT Platform Team");
        activeTeam.setStatus("Active");

        authenticate(currentHead);
        when(userRepository.findById(99)).thenReturn(Optional.of(currentHead));
        when(userRoleRepository.findByUserId(anyInt())).thenReturn(List.of());
        when(positionPermissionService.currentUserHasPermission("teamCreate")).thenReturn(true);
        when(employeeDepartmentRepository.findActiveUsersByWorkingDepartmentId(4))
                .thenReturn(List.of(teamLeader, projectManager, normalEmployee, departmentHead));
        when(employeeDepartmentRepository.findWorkingDepartmentNamesByUserId(anyInt())).thenReturn(List.of("IT"));
        when(teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(anyInt(), eq("Active"))).thenReturn(List.of());
        when(teamRepository.findByTeamLeaderIdAndStatusIgnoreCase(20, "Active")).thenReturn(List.of(activeTeam));
        when(teamRepository.findByProjectManagerIdAndStatusIgnoreCase(anyInt(), eq("Active"))).thenReturn(List.of());
        when(teamMemberRepository.findByMemberUserId(anyInt())).thenReturn(List.of());

        List<CandidateResponseDto> leaders = teamService.getCandidateUsers(4);
        List<CandidateResponseDto> members = teamService.getCandidateMembers(4);
        List<CandidateResponseDto> projectManagers = teamService.getCandidateProjectManagers(4);

        assertThat(leaders).extracting(CandidateResponseDto::getId).containsExactly(20);
        assertThat(leaders.get(0).getAvailable()).isFalse();
        assertThat(leaders.get(0).getCurrentTeamName()).isEqualTo("IT Platform Team");

        assertThat(projectManagers).extracting(CandidateResponseDto::getId).containsExactly(19);
        assertThat(members).extracting(CandidateResponseDto::getId).containsExactly(21);
    }

    private static User user(Integer id, String name, Position position) {
        User user = new User();
        user.setId(id);
        user.setFullName(name);
        user.setDepartmentId(4);
        user.setPosition(position);
        user.setActive(true);
        return user;
    }

    private static Position position(String title, String assignmentPermission) {
        Position position = new Position();
        position.setPositionTitle(title);
        position.setPermissions(permission(assignmentPermission));
        return position;
    }

    private static PositionPermission permission(String assignmentPermission) {
        PositionPermission permission = new PositionPermission();
        permission.setTeamAssignAsLeader("teamAssignAsLeader".equals(assignmentPermission));
        permission.setTeamAssignAsPm("teamAssignAsPm".equals(assignmentPermission));
        permission.setTeamAssignAsMember("teamAssignAsMember".equals(assignmentPermission));
        return permission;
    }

    private static void authenticate(User user) {
        UserPrincipal principal = new UserPrincipal(
                user,
                List.of("DEPARTMENT_HEAD"),
                List.of(),
                "DEPARTMENT_HEAD_DASHBOARD"
        );
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities())
        );
    }
}
