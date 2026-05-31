package com.epms.service.impl;

import com.epms.dto.ManagerKpiAssignmentDto;
import com.epms.dto.UpdateEmployeeKpiScoresRequest;
import com.epms.dto.UseKpiDepartmentRequest;
import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeKpiForm;
import com.epms.entity.EmployeeKpiScore;
import com.epms.entity.KpiForm;
import com.epms.entity.KpiFormItem;
import com.epms.entity.KpiPosition;
import com.epms.entity.Position;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.KpiTemplateCycle;
import com.epms.entity.KpiTemplateCyclePeriod;
import com.epms.entity.enums.EmployeeKpiStatus;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeKpiFormRepository;
import com.epms.repository.EmployeeKpiFormEvaluatorRepository;
import com.epms.repository.EmployeeKpiPositionTransitionRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.KpiFormRepository;
import com.epms.repository.KpiPositionRepository;
import com.epms.repository.KpiTemplateCycleFormRepository;
import com.epms.repository.KpiTemplateCyclePeriodRepository;
import com.epms.repository.KpiTemplateCycleRepository;
import com.epms.repository.PositionRepository;
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
import org.springframework.web.server.ResponseStatusException;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import java.time.LocalDate;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
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
    private KpiTemplateCyclePeriodRepository kpiTemplateCyclePeriodRepository;

    @Mock
    private KpiPositionRepository kpiPositionRepository;

    @Mock
    private EmployeeRepository employeeRepository;

    @Mock
    private EmployeeKpiFormRepository employeeKpiFormRepository;

    @Mock
    private EmployeeKpiFormEvaluatorRepository employeeKpiFormEvaluatorRepository;

    @Mock
    private EmployeeKpiPositionTransitionRepository employeeKpiPositionTransitionRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private TeamRepository teamRepository;

    @Mock
    private DepartmentRepository departmentRepository;

    @Mock
    private PositionRepository positionRepository;

    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private EmployeeKpiWorkflowServiceImpl service;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void generatePeriodsCreatesAllThreeMonthPeriodsForOneYearCycleAndCapsAtCycleEnd() {
        KpiTemplateCycle cycle = new KpiTemplateCycle();
        cycle.setId(1);
        cycle.setStartDate(LocalDate.of(2026, 1, 1));
        cycle.setEndDate(LocalDate.of(2026, 12, 31));
        cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);

        KpiForm form = new KpiForm();
        form.setId(10);
        form.setTitle("Engineering KPI");
        form.setStatus(KpiFormStatus.ACTIVE);

        KpiPosition link = new KpiPosition();
        link.setDurationMonths(3);
        when(kpiPositionRepository.findWithPositionByKpiForm_Id(10)).thenReturn(List.of(link));
        when(kpiTemplateCyclePeriodRepository.findByCycle_IdAndKpiForm_IdOrderByPeriodNumberAsc(1, 10)).thenReturn(List.of());
        when(kpiTemplateCyclePeriodRepository.save(any(KpiTemplateCyclePeriod.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<KpiTemplateCyclePeriod> periods = service.ensureAllCycleFormPeriodsGenerated(cycle, form);

        assertThat(periods).hasSize(4);
        assertThat(periods).extracting(KpiTemplateCyclePeriod::getPeriodNumber).containsExactly(1, 2, 3, 4);
        assertThat(periods).extracting(KpiTemplateCyclePeriod::getStartDate).containsExactly(
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 4, 1),
                LocalDate.of(2026, 7, 1),
                LocalDate.of(2026, 10, 1)
        );
        assertThat(periods).extracting(KpiTemplateCyclePeriod::getEndDate).containsExactly(
                LocalDate.of(2026, 3, 31),
                LocalDate.of(2026, 6, 30),
                LocalDate.of(2026, 9, 30),
                LocalDate.of(2026, 12, 31)
        );
    }

    @Test
    void generatePeriodsCapsUnevenDurationFinalPeriodAtCycleEnd() {
        KpiTemplateCycle cycle = new KpiTemplateCycle();
        cycle.setId(1);
        cycle.setStartDate(LocalDate.of(2026, 1, 1));
        cycle.setEndDate(LocalDate.of(2026, 12, 31));
        cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);

        KpiForm form = new KpiForm();
        form.setId(10);
        form.setTitle("Engineering KPI");
        form.setStatus(KpiFormStatus.ACTIVE);

        KpiPosition link = new KpiPosition();
        link.setDurationMonths(5);
        when(kpiPositionRepository.findWithPositionByKpiForm_Id(10)).thenReturn(List.of(link));
        when(kpiTemplateCyclePeriodRepository.findByCycle_IdAndKpiForm_IdOrderByPeriodNumberAsc(1, 10)).thenReturn(List.of());
        when(kpiTemplateCyclePeriodRepository.save(any(KpiTemplateCyclePeriod.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<KpiTemplateCyclePeriod> periods = service.ensureAllCycleFormPeriodsGenerated(cycle, form);

        assertThat(periods).hasSize(3);
        assertThat(periods).extracting(KpiTemplateCyclePeriod::getStartDate).containsExactly(
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 11, 1)
        );
        assertThat(periods).extracting(KpiTemplateCyclePeriod::getEndDate).containsExactly(
                LocalDate.of(2026, 5, 31),
                LocalDate.of(2026, 10, 31),
                LocalDate.of(2026, 12, 31)
        );
    }

    @Test
    void generatePeriodsIsIdempotentAndDoesNotDuplicateExistingPeriodNumbers() {
        KpiTemplateCycle cycle = new KpiTemplateCycle();
        cycle.setId(1);
        cycle.setStartDate(LocalDate.of(2026, 1, 1));
        cycle.setEndDate(LocalDate.of(2026, 12, 31));
        cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);

        KpiForm form = new KpiForm();
        form.setId(10);
        form.setTitle("Engineering KPI");
        form.setStatus(KpiFormStatus.ACTIVE);

        KpiPosition link = new KpiPosition();
        link.setDurationMonths(3);
        when(kpiPositionRepository.findWithPositionByKpiForm_Id(10)).thenReturn(List.of(link));

        KpiTemplateCyclePeriod existing = new KpiTemplateCyclePeriod();
        existing.setId(100);
        existing.setCycle(cycle);
        existing.setKpiForm(form);
        existing.setPeriodNumber(1);
        existing.setStartDate(LocalDate.of(2026, 1, 1));
        existing.setEndDate(LocalDate.of(2026, 3, 31));
        existing.setStatus(KpiTemplateCyclePeriodStatus.OPEN);

        when(kpiTemplateCyclePeriodRepository.findByCycle_IdAndKpiForm_IdOrderByPeriodNumberAsc(1, 10)).thenReturn(List.of(existing));
        when(kpiTemplateCyclePeriodRepository.save(any(KpiTemplateCyclePeriod.class))).thenAnswer(invocation -> invocation.getArgument(0));

        List<KpiTemplateCyclePeriod> periods = service.ensureAllCycleFormPeriodsGenerated(cycle, form);

        assertThat(periods).extracting(KpiTemplateCyclePeriod::getPeriodNumber).contains(1, 2, 3, 4);
        verify(kpiTemplateCyclePeriodRepository, never()).save(org.mockito.Mockito.argThat(p -> p.getPeriodNumber() != null && p.getPeriodNumber() == 1 && p.getId() == null));
    }

    @Test
    void useTemplateForDepartmentAssignsAllActiveMatchingAccountsAndNotifiesOnlyScopedEvaluators() {
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
        when(userRepository.findActiveDepartmentHeadsByDepartmentId(7)).thenReturn(List.of());
        when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenReturn(List.of());
        when(employeeKpiFormRepository.findByEmployee_IdAndKpiForm_Id(anyInt(), eq(100))).thenReturn(Optional.empty());
        when(employeeKpiFormRepository.save(any(EmployeeKpiForm.class))).thenAnswer(invocation -> invocation.getArgument(0));

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
        when(userRepository.findActiveDepartmentHeadsByDepartmentId(7)).thenReturn(List.of());
        when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenReturn(List.of());
        when(employeeKpiFormRepository.findByEmployee_IdAndKpiForm_Id(anyInt(), eq(100))).thenReturn(Optional.empty());
        when(employeeKpiFormRepository.save(any(EmployeeKpiForm.class))).thenAnswer(invocation -> invocation.getArgument(0));

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
    void useTemplateForDepartmentRoutesTeamLeaderAssignmentsToDepartmentHead() {
        Position teamLeaderPosition = position(53, "Team Leader");
        KpiForm form = form(100, teamLeaderPosition);
        Department department = department(7);
        User managerA = user(1, 7, 101, true);
        User departmentHead = user(90, 7, 90, true);
        User teamLeaderUser = user(31, 7, 11, true);
        Employee teamLeaderEmployee = employee(11, teamLeaderPosition, true);

        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form));
        when(kpiPositionRepository.findWithPositionByKpiForm_Id(100)).thenReturn(List.of(kpiPosition(form, teamLeaderPosition)));
        when(departmentRepository.findById(7)).thenReturn(Optional.of(department));
        when(employeeRepository.findCurrentByWorkingDepartmentId(7, false)).thenReturn(List.of(teamLeaderEmployee));
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(7, "Active"))
                .thenReturn(List.of(team(21, department, managerA, teamLeaderUser)));
        when(userRepository.findActiveByEmployeeId(11)).thenReturn(Optional.of(teamLeaderUser));
        when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of(managerA));
        when(userRepository.findActiveDepartmentHeadsByDepartmentId(7)).thenReturn(List.of(departmentHead));
        when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenReturn(List.of());
        when(userRepository.findById(90)).thenReturn(Optional.of(departmentHead));
        when(userRepository.findNormalizedRoleNamesByUserId(anyInt())).thenReturn(List.of());
        when(employeeKpiFormRepository.findByEmployee_IdAndKpiForm_Id(11, 100)).thenReturn(Optional.empty());
        when(employeeKpiFormRepository.save(any(EmployeeKpiForm.class))).thenAnswer(invocation -> invocation.getArgument(0));

        service.useTemplateForDepartment(100, departmentRequest(7));

        ArgumentCaptor<EmployeeKpiForm> saved = ArgumentCaptor.forClass(EmployeeKpiForm.class);
        verify(employeeKpiFormRepository).save(saved.capture());
        assertThat(saved.getValue().getEmployee().getId()).isEqualTo(11);
        assertThat(saved.getValue().getEvaluators())
                .extracting(evaluator -> evaluator.getEvaluatorUser().getId())
                .containsExactly(90);
        verify(notificationService).send(eq(90), eq("KPI scoring requested"), any(), eq(EmployeeKpiWorkflowServiceImpl.TYPE_KPI_MANAGER_ASSIGNMENT), eq(100));
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

        when(userRepository.findById(1)).thenReturn(Optional.of(projectManager));
        when(employeeRepository.findCurrentByWorkingDepartmentId(7, false)).thenReturn(List.of(teamMember, teamless));
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(7, "Active"))
                .thenReturn(List.of(team(21, department, projectManager, member(user(31, 7, 11, true)))));
        when(userRepository.findActiveByEmployeeId(anyInt())).thenAnswer(invocation ->
                Optional.of(user(1000 + invocation.<Integer>getArgument(0), 7, invocation.getArgument(0), true)));
        when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of(projectManager, user(2, 7, null, true)));
        when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenReturn(List.of());
        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form(100, engineer)));
        when(employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(eq(100), any())).thenReturn(List.of());

        List<ManagerKpiAssignmentDto> result = service.listDepartmentAssignmentsForManager(100);

        assertThat(result).isEmpty();
        ArgumentCaptor<Collection<Integer>> employeeIds = ArgumentCaptor.forClass(Collection.class);
        verify(employeeKpiFormRepository).findByKpiFormIdAndEmployeeIdIn(eq(100), employeeIds.capture());
        assertThat(employeeIds.getValue()).containsExactly(11);
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void managerAssignmentListDoesNotIncludeTeamLeaderForProjectManagers() {
        Position teamLeaderPosition = position(53, "Team Leader");
        Department department = department(7);
        User managerA = user(1, 7, 101, true);
        User managerB = user(2, 7, 102, true);
        User teamLeaderUser = user(31, 7, 11, true);
        Employee teamLeaderEmployee = employee(11, teamLeaderPosition, true);
        authenticate(managerB);

        when(userRepository.findById(2)).thenReturn(Optional.of(managerB));
        when(employeeRepository.findCurrentByWorkingDepartmentId(7, false)).thenReturn(List.of(teamLeaderEmployee));
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(7, "Active"))
                .thenReturn(List.of(team(21, department, managerA, teamLeaderUser)));
        when(userRepository.findActiveByEmployeeId(11)).thenReturn(Optional.of(teamLeaderUser));
        when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of(managerA, managerB));
        when(userRepository.findActiveDepartmentHeadsByDepartmentId(7)).thenReturn(List.of());
        when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenReturn(List.of());
        when(userRepository.findNormalizedRoleNamesByUserId(anyInt())).thenReturn(List.of());
        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form(100, teamLeaderPosition)));
        when(employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(eq(100), any())).thenReturn(List.of());

        List<ManagerKpiAssignmentDto> result = service.listDepartmentAssignmentsForManager(100);

        assertThat(result).isEmpty();
        ArgumentCaptor<Collection<Integer>> employeeIds = ArgumentCaptor.forClass(Collection.class);
        verify(employeeKpiFormRepository).findByKpiFormIdAndEmployeeIdIn(eq(100), employeeIds.capture());
        assertThat(employeeIds.getValue()).isEmpty();
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void departmentHeadAssignmentListUsesOnlyManagersInOwnDepartment() {
        Position managerPosition = position(20, "Manager");
        User departmentHead = user(50, 7, 50, true);
        User ownDepartmentManager = user(1, 7, 11, true);
        User otherDepartmentManager = user(2, 8, 12, true);
        authenticate(departmentHead, List.of("DEPARTMENT_HEAD"), "DEPARTMENT_HEAD_DASHBOARD");

        when(userRepository.findById(50)).thenReturn(Optional.of(departmentHead));
        when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of(ownDepartmentManager));
        when(employeeRepository.findById(11)).thenReturn(Optional.of(employee(11, managerPosition, true)));
        when(userRepository.findActiveByEmployeeId(11)).thenReturn(Optional.of(user(1011, 7, 11, true)));
        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form(100, managerPosition)));
        when(employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(eq(100), any())).thenReturn(List.of());

        List<ManagerKpiAssignmentDto> result = service.listDepartmentAssignmentsForManager(100);

        assertThat(result).isEmpty();
        ArgumentCaptor<Collection<Integer>> employeeIds = ArgumentCaptor.forClass(Collection.class);
        verify(employeeKpiFormRepository).findByKpiFormIdAndEmployeeIdIn(eq(100), employeeIds.capture());
        assertThat(employeeIds.getValue()).containsExactly(11);
        assertThat(employeeIds.getValue()).doesNotContain(12, 50);
        assertThat(otherDepartmentManager.getDepartmentId()).isEqualTo(8);
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void executiveAssignmentListUsesDepartmentHeadsAndHrAcrossDepartments() {
        Position leadershipPosition = position(30, "Leadership");
        User executive = user(99, null, 99, true);
        User departmentHead = user(50, 7, 21, true);
        User hr = user(60, 8, 22, true);
        User manager = user(70, 7, 23, true);
        authenticate(executive, List.of("EXECUTIVE"), "EXECUTIVE_DASHBOARD");

        when(userRepository.findById(99)).thenReturn(Optional.of(executive));
        when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenAnswer(invocation -> {
            Collection<String> roles = invocation.getArgument(0);
            if (roles.contains("DEPARTMENT_HEAD")) {
                return List.of(departmentHead);
            }
            if (roles.contains("HR")) {
                return List.of(hr);
            }
            if (roles.contains("MANAGER")) {
                return List.of(manager);
            }
            return List.of();
        });
        when(employeeRepository.findById(21)).thenReturn(Optional.of(employee(21, leadershipPosition, true)));
        when(employeeRepository.findById(22)).thenReturn(Optional.of(employee(22, leadershipPosition, true)));
        when(userRepository.findActiveByEmployeeId(21)).thenReturn(Optional.of(user(1021, 7, 21, true)));
        when(userRepository.findActiveByEmployeeId(22)).thenReturn(Optional.of(user(1022, 8, 22, true)));
        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form(100, leadershipPosition)));
        when(employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(eq(100), any())).thenReturn(List.of());

        List<ManagerKpiAssignmentDto> result = service.listDepartmentAssignmentsForManager(100);

        assertThat(result).isEmpty();
        ArgumentCaptor<Collection<Integer>> employeeIds = ArgumentCaptor.forClass(Collection.class);
        verify(employeeKpiFormRepository).findByKpiFormIdAndEmployeeIdIn(eq(100), employeeIds.capture());
        assertThat(employeeIds.getValue()).containsExactly(21, 22);
        assertThat(employeeIds.getValue()).doesNotContain(23, 99);
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void managerAssignmentListExcludesManagerDepartmentHeadAndHrTargets() {
        Position engineer = position(10, "Engineer");
        Department department = department(7);
        User projectManager = user(1, 7, null, true);
        User managerTarget = user(2, 7, 12, true);
        User departmentHeadTarget = user(3, 7, 13, true);
        User hrTarget = user(4, 7, 14, true);
        Employee regular = employee(11, engineer, true);
        Employee managerEmployee = employee(12, engineer, true);
        Employee departmentHeadEmployee = employee(13, engineer, true);
        Employee hrEmployee = employee(14, engineer, true);
        authenticate(projectManager);

        when(userRepository.findById(1)).thenReturn(Optional.of(projectManager));
        when(employeeRepository.findCurrentByWorkingDepartmentId(7, false))
                .thenReturn(List.of(regular, managerEmployee, departmentHeadEmployee, hrEmployee));
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(7, "Active"))
                .thenReturn(List.of(team(
                        21,
                        department,
                        projectManager,
                        member(user(31, 7, 11, true)),
                        member(user(32, 7, 12, true)),
                        member(user(33, 7, 13, true)),
                        member(user(34, 7, 14, true))
                )));
        when(userRepository.findActiveByEmployeeId(anyInt())).thenAnswer(invocation ->
                Optional.of(user(1000 + invocation.<Integer>getArgument(0), 7, invocation.getArgument(0), true)));
        when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenAnswer(invocation -> {
            Collection<String> roles = invocation.getArgument(0);
            if (roles.contains("MANAGER")) {
                return List.of(managerTarget);
            }
            if (roles.contains("DEPARTMENT_HEAD")) {
                return List.of(departmentHeadTarget);
            }
            if (roles.contains("HR")) {
                return List.of(hrTarget);
            }
            return List.of();
        });
        when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of(projectManager));
        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form(100, engineer)));
        when(employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(eq(100), any())).thenReturn(List.of());

        List<ManagerKpiAssignmentDto> result = service.listDepartmentAssignmentsForManager(100);

        assertThat(result).isEmpty();
        ArgumentCaptor<Collection<Integer>> employeeIds = ArgumentCaptor.forClass(Collection.class);
        verify(employeeKpiFormRepository).findByKpiFormIdAndEmployeeIdIn(eq(100), employeeIds.capture());
        assertThat(employeeIds.getValue()).containsExactly(11);
    }

    @Test
    @SuppressWarnings({"unchecked", "rawtypes"})
    void managerAssignmentListReconcilesMissingRowsForNonFinalizedAssignmentsOnly() {
        Position engineer = position(10, "Engineer");
        Department department = department(7);
        User projectManager = user(1, 7, null, true);
        Employee employeeA = employee(11, engineer, true);
        Employee employeeB = employee(12, engineer, true);
        KpiForm form = form(
                100,
                engineer,
                item(501, "Delivery", 100.0, 40, 0),
                item(502, "Quality", 80.0, 40, 1),
                item(503, "Milestone", 90.0, 20, 2)
        );
        EmployeeKpiForm assigned = employeeAssignment(
                700,
                form,
                employeeA,
                EmployeeKpiStatus.ASSIGNED,
                form.getItems().get(0),
                form.getItems().get(1)
        );
        EmployeeKpiForm finalized = employeeAssignment(
                701,
                form,
                employeeB,
                EmployeeKpiStatus.FINALIZED,
                form.getItems().get(0),
                form.getItems().get(1)
        );
        authenticate(projectManager);

        when(userRepository.findById(1)).thenReturn(Optional.of(projectManager));
        when(employeeRepository.findCurrentByWorkingDepartmentId(7, false)).thenReturn(List.of(employeeA, employeeB));
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(7, "Active"))
                .thenReturn(List.of(team(
                        21,
                        department,
                        projectManager,
                        member(user(31, 7, 11, true)),
                        member(user(32, 7, 12, true))
                )));
        when(userRepository.findActiveByEmployeeId(anyInt())).thenAnswer(invocation ->
                Optional.of(user(1000 + invocation.<Integer>getArgument(0), 7, invocation.getArgument(0), true)));
        when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of(projectManager));
        when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenReturn(List.of());
        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form));
        when(employeeKpiFormRepository.findByKpiFormIdAndEmployeeIdIn(eq(100), any()))
                .thenReturn(List.of(assigned, finalized));

        List<ManagerKpiAssignmentDto> result = service.listDepartmentAssignmentsForManager(100);

        assertThat(result)
                .filteredOn(row -> row.getEmployeeKpiFormId().equals(700))
                .singleElement()
                .satisfies(row -> assertThat(row.getLines()).hasSize(3));
        assertThat(result)
                .filteredOn(row -> row.getEmployeeKpiFormId().equals(701))
                .singleElement()
                .satisfies(row -> assertThat(row.getLines()).hasSize(2));

        ArgumentCaptor<EmployeeKpiForm> saved = ArgumentCaptor.forClass(EmployeeKpiForm.class);
        verify(employeeKpiFormRepository).save(saved.capture());
        assertThat(saved.getValue().getId()).isEqualTo(700);
        assertThat(saved.getValue().getScores())
                .extracting(score -> score.getKpiFormItem().getId())
                .containsExactlyInAnyOrder(501, 502, 503);
    }

    @Test
    void updateScoresAllowsActualEqualToTargetAndCapsWeightScoreAtWeight() {
        User projectManager = user(1, 7, null, true);
        Position engineer = position(10, "Engineer");
        KpiForm form = form(100, engineer, item(501, "Delivery", 80.0, 40, 0));
        Employee employee = employee(11, engineer, true);
        EmployeeKpiForm assignment = employeeAssignment(700, form, employee, EmployeeKpiStatus.ASSIGNED, form.getItems().get(0));
        authenticate(projectManager);
        stubManagerScoreScope(projectManager, employee, assignment);

        ManagerKpiAssignmentDto result = service.updateScores(700, employeeScoreRequest(501, 80.0));

        assertThat(result.getLines()).singleElement().satisfies(line -> {
            assertThat(line.getActualValue()).isEqualTo(80.0);
            assertThat(line.getScore()).isEqualTo(100.0);
            assertThat(line.getWeightedScore()).isEqualTo(40.0);
        });
    }

    @Test
    void updateScoresRejectsActualGreaterThanTarget() {
        User projectManager = user(1, 7, null, true);
        Position engineer = position(10, "Engineer");
        KpiForm form = form(100, engineer, item(501, "Delivery", 80.0, 40, 0));
        Employee employee = employee(11, engineer, true);
        EmployeeKpiForm assignment = employeeAssignment(700, form, employee, EmployeeKpiStatus.ASSIGNED, form.getItems().get(0));
        authenticate(projectManager);
        stubManagerScoreScope(projectManager, employee, assignment);

        assertThatThrownBy(() -> service.updateScores(700, employeeScoreRequest(501, 81.0)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Actual % must be less than or equal to Target %");
    }

    private void stubManagerScoreScope(User projectManager, Employee employee, EmployeeKpiForm assignment) {
        when(userRepository.findById(projectManager.getId())).thenReturn(Optional.of(projectManager));
        when(employeeKpiFormEvaluatorRepository.findEmployeeIdsByEvaluatorUserId(projectManager.getId()))
                .thenReturn(List.of(employee.getId()));
        when(employeeRepository.findCurrentByWorkingDepartmentId(projectManager.getDepartmentId(), false)).thenReturn(List.of());
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(projectManager.getDepartmentId(), "Active")).thenReturn(List.of());
        when(userRepository.findActiveManagersByDepartmentId(projectManager.getDepartmentId())).thenReturn(List.of());
        when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenReturn(List.of());
        when(userRepository.findActiveByEmployeeId(employee.getId())).thenReturn(Optional.of(user(1000 + employee.getId(), projectManager.getDepartmentId(), employee.getId(), true)));
        when(employeeKpiFormRepository.findWithScoresForUpdate(assignment.getId())).thenReturn(Optional.of(assignment));
    }

    private static UpdateEmployeeKpiScoresRequest employeeScoreRequest(Integer itemId, Double actualValue) {
        return UpdateEmployeeKpiScoresRequest.builder()
                .scores(List.of(UpdateEmployeeKpiScoresRequest.EmployeeKpiScoreUpdateDto.builder()
                        .kpiFormItemId(itemId)
                        .actualValue(actualValue)
                        .build()))
                .build();
    }

    private static UseKpiDepartmentRequest departmentRequest(Integer departmentId) {
        UseKpiDepartmentRequest request = new UseKpiDepartmentRequest();
        request.setDepartmentId(departmentId);
        return request;
    }

    private static KpiForm form(Integer id, Position position) {
        return form(
                id,
                position,
                item(501, "Delivery", 100.0, 100, 1)
        );
    }

    private static KpiForm form(Integer id, Position position, KpiFormItem... items) {
        KpiForm form = new KpiForm();
        form.setId(id);
        form.setTitle("Engineering KPI");
        form.setStatus(KpiFormStatus.ACTIVE);
        for (KpiFormItem item : items) {
            form.addItem(item);
        }
        form.setKpiPositions(List.of(kpiPosition(form, position)));
        return form;
    }

    private static KpiFormItem item(Integer id, String label, Double target, Integer weight, Integer sortOrder) {
        return KpiFormItem.builder()
                .id(id)
                .kpiLabel(label)
                .target(target)
                .weight(weight)
                .sortOrder(sortOrder)
                .build();
    }

    private static EmployeeKpiForm employeeAssignment(
            Integer id,
            KpiForm form,
            Employee employee,
            EmployeeKpiStatus status,
            KpiFormItem... scoredItems
    ) {
        EmployeeKpiForm assignment = new EmployeeKpiForm();
        assignment.setId(id);
        assignment.setEmployee(employee);
        assignment.setKpiForm(form);
        assignment.setStatus(status);
        int nextScoreId = 800;
        for (KpiFormItem item : scoredItems) {
            EmployeeKpiScore score = EmployeeKpiScore.builder()
                    .kpiFormItem(item)
                    .build();
            score.setId(nextScoreId++);
            assignment.addScore(score);
        }
        return assignment;
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
        return team(id, department, manager, null, members);
    }

    private static Team team(Integer id, Department department, User manager, User teamLeader, TeamMember... members) {
        Team team = new Team();
        team.setId(id);
        team.setDepartment(department);
        team.setProjectManager(manager);
        team.setTeamLeader(teamLeader);
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
        authenticate(user, List.of("MANAGER"), "MANAGER");
    }

    private static void authenticate(User user, List<String> roles, String dashboard) {
        UserPrincipal principal = new UserPrincipal(user, roles, List.of(), dashboard);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities())
        );
    }
}
