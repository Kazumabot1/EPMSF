package com.epms.service.impl;

import com.epms.dto.ManagerKpiAssignmentDto;
import com.epms.dto.UseKpiDepartmentRequest;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeKpiForm;
import com.epms.entity.KpiForm;
import com.epms.entity.KpiFormItem;
import com.epms.entity.KpiPosition;
import com.epms.entity.Position;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeKpiFormRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.KpiFormRepository;
import com.epms.repository.KpiPositionRepository;
import com.epms.repository.KpiTemplateCycleFormRepository;
import com.epms.repository.KpiTemplateCycleRepository;
import com.epms.repository.TeamRepository;
import com.epms.repository.UserRepository;
import com.epms.security.UserPrincipal;
import com.epms.service.NotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeKpiWorkflowServiceImplTest {

    @Mock
    private KpiFormRepository kpiFormRepository;

    @Mock
    private KpiTemplateCycleRepository kpiTemplateCycleRepository;

    @Mock
    private KpiTemplateCycleFormRepository kpiTemplateCycleFormRepository;

    @Mock
    private KpiPositionRepository kpiPositionRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EmployeeKpiFormRepository employeeKpiFormRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private EmployeeKpiWorkflowServiceImpl service;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void useTemplateForDepartmentAssignsOnlyActiveMembersUnderActiveProjectManagers() {
        Position engineer = position(10, "Engineer");
        KpiForm form = form(100, engineer);
        Department department = department(7);
        User managerA = user(1, 7, null, true);
        User managerB = user(2, 7, null, true);
        Employee employeeA = employee(11, engineer, true);
        Employee employeeB = employee(12, engineer, true);
        Employee inactiveEmployee = employee(13, engineer, false);
        Employee noAccountEmployee = employee(14, engineer, true);

        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form));
        when(kpiPositionRepository.findWithPositionByKpiForm_Id(100)).thenReturn(List.of(kpiPosition(form, engineer)));
        when(departmentRepository.findById(7)).thenReturn(Optional.of(department));
        when(employeeRepository.findCurrentByWorkingDepartmentId(7, false))
                .thenReturn(List.of(employeeA, employeeB, inactiveEmployee, noAccountEmployee));
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(7, "Active"))
                .thenReturn(List.of(
                        team(21, department, managerA, member(user(31, 7, 11, true))),
                        team(22, department, managerB, member(user(32, 7, 12, true))),
                        team(23, department, user(3, 7, null, false), member(user(33, 7, 14, true)))
                ));
        when(userRepository.findActiveByEmployeeId(anyInt())).thenAnswer(invocation -> {
            Integer employeeId = invocation.getArgument(0);
            return employeeId == 11 || employeeId == 12 || employeeId == 14
                    ? Optional.of(user(1000 + employeeId, 7, employeeId, true))
                    : Optional.empty();
        });
        when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of());
        when(employeeKpiFormRepository.findByEmployee_IdAndKpiForm_Id(anyInt(), eq(100))).thenReturn(Optional.empty());

        service.useTemplateForDepartment(100, departmentRequest(7));

        ArgumentCaptor<EmployeeKpiForm> saved = ArgumentCaptor.forClass(EmployeeKpiForm.class);
        verify(employeeKpiFormRepository, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues())
                .extracting(ekf -> ekf.getEmployee().getId())
                .containsExactlyInAnyOrder(11, 12);
        verify(notificationService).send(eq(1), eq("KPI scoring requested"), any(), eq(EmployeeKpiWorkflowServiceImpl.TYPE_KPI_MANAGER_ASSIGNMENT), eq(100));
        verify(notificationService).send(eq(2), eq("KPI scoring requested"), any(), eq(EmployeeKpiWorkflowServiceImpl.TYPE_KPI_MANAGER_ASSIGNMENT), eq(100));
        verify(notificationService, never()).send(eq(3), any(), any(), any(), any());
    }

    @Test
    void useTemplateForDepartmentRoutesTeamlessEmployeesOnlyToNoTeamManagers() {
        Position engineer = position(10, "Engineer");
        KpiForm form = form(100, engineer);
        Department department = department(7);
        User projectManager = user(1, 7, null, true);
        User noTeamManager = user(2, 7, null, true);
        Employee teamMember = employee(11, engineer, true);
        Employee teamless = employee(12, engineer, true);

        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form));
        when(kpiPositionRepository.findWithPositionByKpiForm_Id(100)).thenReturn(List.of(kpiPosition(form, engineer)));
        when(departmentRepository.findById(7)).thenReturn(Optional.of(department));
        when(employeeRepository.findCurrentByWorkingDepartmentId(7, false)).thenReturn(List.of(teamMember, teamless));
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(7, "Active"))
                .thenReturn(List.of(team(21, department, projectManager, member(user(31, 7, 11, true)))));
        when(userRepository.findActiveByEmployeeId(anyInt())).thenAnswer(invocation ->
                Optional.of(user(1000 + invocation.<Integer>getArgument(0), 7, invocation.getArgument(0), true)));
        when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of(projectManager, noTeamManager));
        when(employeeKpiFormRepository.findByEmployee_IdAndKpiForm_Id(anyInt(), eq(100))).thenReturn(Optional.empty());

        service.useTemplateForDepartment(100, departmentRequest(7));

        ArgumentCaptor<EmployeeKpiForm> saved = ArgumentCaptor.forClass(EmployeeKpiForm.class);
        verify(employeeKpiFormRepository, org.mockito.Mockito.times(2)).save(saved.capture());
        assertThat(saved.getAllValues())
                .extracting(ekf -> ekf.getEmployee().getId())
                .containsExactlyInAnyOrder(11, 12);
        verify(notificationService).send(eq(1), eq("KPI scoring requested"), any(), eq(EmployeeKpiWorkflowServiceImpl.TYPE_KPI_MANAGER_ASSIGNMENT), eq(100));
        verify(notificationService).send(eq(2), eq("KPI scoring requested"), any(), eq(EmployeeKpiWorkflowServiceImpl.TYPE_KPI_MANAGER_ASSIGNMENT), eq(100));
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void managerAssignmentListUsesOnlyCurrentManagersActiveTeams() {
        Position engineer = position(10, "Engineer");
        Department department = department(7);
        User projectManager = user(1, 7, null, true);
        Employee teamMember = employee(11, engineer, true);
        Employee teamless = employee(12, engineer, true);
        authenticate(projectManager);

        when(employeeRepository.findCurrentByWorkingDepartmentId(7, false)).thenReturn(List.of(teamMember, teamless));
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(7, "Active"))
                .thenReturn(List.of(team(21, department, projectManager, member(user(31, 7, 11, true)))));
        when(userRepository.findActiveByEmployeeId(anyInt())).thenAnswer(invocation ->
                Optional.of(user(1000 + invocation.<Integer>getArgument(0), 7, invocation.getArgument(0), true)));
        when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of(projectManager, user(2, 7, null, true)));
        when(kpiFormRepository.findById(100)).thenReturn(Optional.of(form(100, engineer)));
        when(employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(eq(100), any())).thenReturn(List.of());

        List<ManagerKpiAssignmentDto> result = service.listDepartmentAssignmentsForManager(100);

        assertThat(result).isEmpty();
        ArgumentCaptor<Collection<Integer>> employeeIds = ArgumentCaptor.forClass(Collection.class);
        verify(employeeKpiFormRepository).findByKpiFormIdAndEmployeeIdIn(eq(100), employeeIds.capture());
        assertThat(employeeIds.getValue()).containsExactly(11);
    }

    private static UseKpiDepartmentRequest departmentRequest(Integer departmentId) {
        UseKpiDepartmentRequest request = new UseKpiDepartmentRequest();
        request.setDepartmentId(departmentId);
        return request;
    }

    private static KpiForm form(Integer id, Position position) {
        KpiForm form = new KpiForm();
        form.setId(id);
        form.setTitle("Engineering KPI");
        form.setStatus(KpiFormStatus.ACTIVE);
        KpiFormItem item = KpiFormItem.builder()
                .id(501)
                .kpiLabel("Delivery")
                .target(100.0)
                .weight(100)
                .sortOrder(1)
                .build();
        form.addItem(item);
        form.setKpiPositions(List.of(kpiPosition(form, position)));
        return form;
    }

    private static KpiPosition kpiPosition(KpiForm form, Position position) {
        return KpiPosition.builder()
                .id(900)
                .kpiForm(form)
                .position(position)
                .build();
    }

    private static Position position(Integer id, String title) {
        Position position = new Position();
        position.setId(id);
        position.setPositionTitle(title);
        return position;
    }

    private static Department department(Integer id) {
        Department department = new Department();
        department.setId(id);
        department.setDepartmentName("Engineering");
        department.setStatus(true);
        return department;
    }

    private static Employee employee(Integer id, Position position, boolean active) {
        Employee employee = new Employee();
        employee.setId(id);
        employee.setFirstName("Employee");
        employee.setLastName(String.valueOf(id));
        employee.setPosition(position);
        employee.setActive(active);
        return employee;
    }

    private static User user(Integer id, Integer departmentId, Integer employeeId, boolean active) {
        User user = new User();
        user.setId(id);
        user.setEmail("user" + id + "@epms.local");
        user.setPassword("password");
        user.setDepartmentId(departmentId);
        user.setEmployeeId(employeeId);
        user.setActive(active);
        return user;
    }

    private static Team team(Integer id, Department department, User manager, TeamMember... members) {
        Team team = new Team();
        team.setId(id);
        team.setDepartment(department);
        team.setProjectManager(manager);
        team.setStatus("Active");
        team.setTeamMembers(new java.util.ArrayList<>());
        for (TeamMember member : members) {
            team.addTeamMember(member);
        }
        return team;
    }

    private static TeamMember member(User user) {
        TeamMember member = new TeamMember();
        member.setMemberUser(user);
        return member;
    }

    private static void authenticate(User user) {
        UserPrincipal principal = new UserPrincipal(user, List.of("MANAGER"), List.of(), "MANAGER");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities())
        );
    }
}
