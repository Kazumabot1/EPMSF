package com.epms.service;

import com.epms.dto.OneOnOneAccessContextResponseDto;
import com.epms.dto.OneOnOneMeetingRequestDto;
import com.epms.entity.Department;
import com.epms.entity.Team;
import com.epms.entity.User;
import com.epms.exception.UnauthorizedActionException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.security.UserPrincipal;
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
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TeamAccessServiceTest {

    @Mock
    private TeamRepository teamRepository;
    @Mock
    private EmployeeRepository employeeRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private PositionPermissionService positionPermissionService;

    @InjectMocks
    private TeamAccessService teamAccessService;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void departmentHeadContextHasNoDepartmentSelector() {
        User user = user(20, 55);
        Department department = department(55, "Engineering");
        authenticate(user, List.of("DEPARTMENT_HEAD"), "DEPARTMENT_HEAD_DASHBOARD");
        when(userRepository.findById(20)).thenReturn(Optional.of(user));
        when(departmentRepository.findById(55)).thenReturn(Optional.of(department));
        when(positionPermissionService.currentUserHasPermission("oneOnOneCreate")).thenReturn(true);
        when(positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection")).thenReturn(true);

        OneOnOneAccessContextResponseDto context = teamAccessService.getOneOnOneContext();

        assertThat(context.getAccessMode()).isEqualTo("DEPARTMENT_HEAD_SCOPE");
        assertThat(context.isCanSelectDepartment()).isFalse();
        assertThat(context.getDepartmentId()).isEqualTo(55);
        assertThat(context.isCanUseDepartmentEmployeeScope()).isTrue();
    }

    @Test
    void managerContextRequiresManagedTeam() {
        User user = user(30, 60);
        Department department = department(60, "Operations");
        authenticate(user, List.of("MANAGER"), "MANAGER_DASHBOARD");
        when(userRepository.findById(30)).thenReturn(Optional.of(user));
        when(departmentRepository.findById(60)).thenReturn(Optional.of(department));
        when(positionPermissionService.currentUserHasPermission("oneOnOneCreate")).thenReturn(true);
        when(positionPermissionService.currentUserHasPermission("oneOnOneDeptSelection")).thenReturn(true);

        OneOnOneAccessContextResponseDto context = teamAccessService.getOneOnOneContext();

        assertThat(context.getAccessMode()).isEqualTo("MANAGED_TEAM_ONLY");
        assertThat(context.isCanSelectDepartment()).isFalse();
        assertThat(context.isTeamRequired()).isTrue();
        assertThat(context.isCanUseDepartmentEmployeeScope()).isFalse();
    }

    @Test
    void managerRejectsTeamOutsideManagedScope() {
        User manager = user(30, 60);
        Team team = team(9, 60, 99, 88);
        authenticate(manager, List.of("MANAGER"), "MANAGER_DASHBOARD");
        when(positionPermissionService.currentUserHasPermission("oneOnOneCreate")).thenReturn(true);
        when(teamRepository.findById(9)).thenReturn(Optional.of(team));

        assertThatThrownBy(() -> teamAccessService.requireManagedTeam(9, 30))
                .isInstanceOf(UnauthorizedActionException.class)
                .hasMessageContaining("own teams");
    }

    @Test
    void departmentHeadRejectsAnotherDepartmentOnCreate() {
        User head = user(40, 70);
        authenticate(head, List.of("DEPARTMENT_HEAD"), "DEPARTMENT_HEAD_DASHBOARD");
        when(positionPermissionService.currentUserHasPermission("oneOnOneCreate")).thenReturn(true);
        when(userRepository.findById(40)).thenReturn(Optional.of(head));
        when(departmentRepository.findById(70)).thenReturn(Optional.of(department(70, "Finance")));

        OneOnOneMeetingRequestDto request = new OneOnOneMeetingRequestDto();
        request.setEmployeeId(500);
        request.setDepartmentId(99);

        assertThatThrownBy(() -> teamAccessService.validateOneOnOneCreateRequest(request))
                .isInstanceOf(UnauthorizedActionException.class)
                .hasMessageContaining("only in your department");
    }

    private static User user(Integer id, Integer departmentId) {
        User user = new User();
        user.setId(id);
        user.setDepartmentId(departmentId);
        user.setActive(true);
        return user;
    }

    private static Department department(Integer id, String name) {
        Department department = new Department();
        department.setId(id);
        department.setDepartmentName(name);
        return department;
    }

    private static Team team(Integer id, Integer departmentId, Integer leaderId, Integer pmId) {
        Team team = new Team();
        team.setId(id);
        team.setTeamName("Team " + id);
        team.setStatus("Active");
        Department department = department(departmentId, "Dept");
        team.setDepartment(department);
        if (leaderId != null) {
            User leader = new User();
            leader.setId(leaderId);
            team.setTeamLeader(leader);
        }
        if (pmId != null) {
            User pm = new User();
            pm.setId(pmId);
            team.setProjectManager(pm);
        }
        return team;
    }

    private static void authenticate(User user, List<String> roles, String dashboard) {
        UserPrincipal principal = new UserPrincipal(user, roles, List.of(), dashboard);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities())
        );
    }
}
