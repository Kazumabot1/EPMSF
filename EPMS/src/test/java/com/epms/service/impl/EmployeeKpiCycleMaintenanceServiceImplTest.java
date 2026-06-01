package com.epms.service.impl;

import com.epms.entity.Department;
import com.epms.entity.Employee;
import com.epms.entity.EmployeeKpiForm;
import com.epms.entity.KpiForm;
import com.epms.entity.KpiFormItem;
import com.epms.entity.KpiPosition;
import com.epms.entity.KpiTemplateCycle;
import com.epms.entity.KpiTemplateCycleForm;
import com.epms.entity.KpiTemplateCyclePeriod;
import com.epms.entity.Position;
import com.epms.entity.Team;
import com.epms.entity.TeamMember;
import com.epms.entity.User;
import com.epms.entity.enums.KpiPositionTransitionStatus;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.EmployeeKpiFormEvaluatorRepository;
import com.epms.repository.EmployeeKpiFormRepository;
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
import com.epms.service.NotificationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class EmployeeKpiCycleMaintenanceServiceImplTest {

    @Mock private KpiFormRepository kpiFormRepository;
    @Mock private KpiTemplateCycleRepository kpiTemplateCycleRepository;
    @Mock private KpiTemplateCycleFormRepository kpiTemplateCycleFormRepository;
    @Mock private KpiTemplateCyclePeriodRepository kpiTemplateCyclePeriodRepository;
    @Mock private KpiPositionRepository kpiPositionRepository;
    @Mock private EmployeeRepository employeeRepository;
    @Mock private EmployeeKpiFormRepository employeeKpiFormRepository;
    @Mock private EmployeeKpiFormEvaluatorRepository employeeKpiFormEvaluatorRepository;
    @Mock private EmployeeKpiPositionTransitionRepository employeeKpiPositionTransitionRepository;
    @Mock private UserRepository userRepository;
    @Mock private TeamRepository teamRepository;
    @Mock private DepartmentRepository departmentRepository;
    @Mock private PositionRepository positionRepository;
    @Mock private NotificationService notificationService;
    @Mock private Clock clock;

    @InjectMocks
    private EmployeeKpiWorkflowServiceImpl service;

    @BeforeEach
    void setUpClock() {
        lenient().when(clock.instant()).thenReturn(Instant.parse("2026-06-01T00:00:00Z"));
        lenient().when(clock.getZone()).thenReturn(ZoneId.of("Asia/Rangoon"));
    }

    @Test
    void maintenanceOpensCurrentScheduledPeriodAndCreatesEvaluatorAssignments() {
        KpiTemplateCycle cycle = cycle(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 12, 31));
        Position engineer = position(10, "Engineer");
        KpiForm form = form(100, engineer);
        KpiTemplateCyclePeriod period = period(cycle, form, 2,
                LocalDate.of(2026, 6, 1),
                LocalDate.of(2026, 8, 31),
                KpiTemplateCyclePeriodStatus.SCHEDULED);
        Department department = department(7);
        User manager = user(1, 7, null);
        Employee employee = employee(11, engineer);
        User employeeUser = user(31, 7, 11);

        stubEmptyMaintenanceQueues();
        when(kpiTemplateCycleRepository.findByStatusAndEndDateBefore(KpiTemplateCycleStatus.ACTIVE, LocalDate.of(2026, 6, 1)))
                .thenReturn(List.of());
        when(kpiTemplateCycleRepository.findByStatus(KpiTemplateCycleStatus.ACTIVE)).thenReturn(List.of(cycle));
        when(kpiTemplateCycleFormRepository.findWithFormsByCycleId(100)).thenReturn(List.of(cycleForm(cycle, form)));
        when(kpiFormRepository.findDetailWithItemsById(100)).thenReturn(Optional.of(form));
        when(kpiTemplateCyclePeriodRepository.findByCycle_IdAndKpiForm_IdOrderByPeriodNumberAsc(100, 100))
                .thenReturn(List.of(period));
        when(kpiTemplateCyclePeriodRepository.save(any(KpiTemplateCyclePeriod.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(kpiTemplateCycleRepository.findById(100)).thenReturn(Optional.of(cycle));
        when(kpiTemplateCyclePeriodRepository.findById(500)).thenReturn(Optional.of(period));
        when(departmentRepository.findAll()).thenReturn(List.of(department));
        when(kpiPositionRepository.findWithPositionByKpiForm_Id(100)).thenReturn(List.of(kpiPosition(form, engineer)));
        when(employeeRepository.findCurrentByWorkingDepartmentId(7, false)).thenReturn(List.of(employee));
        when(employeeRepository.findById(11)).thenReturn(Optional.of(employee));
        when(userRepository.findActiveByEmployeeId(11)).thenReturn(Optional.of(employeeUser));
        lenient().when(userRepository.findNormalizedRoleNamesByUserId(anyInt())).thenReturn(List.of());
        when(teamRepository.findByDepartmentIdAndStatusIgnoreCase(7, "Active"))
                .thenReturn(List.of(team(21, department, manager, member(employeeUser))));
        lenient().when(userRepository.findActiveManagersByDepartmentId(7)).thenReturn(List.of(manager));
        lenient().when(userRepository.findActiveDepartmentHeadsByDepartmentId(7)).thenReturn(List.of());
        lenient().when(userRepository.findActiveUsersByNormalizedRoleNames(any())).thenReturn(List.of());
        when(employeeKpiPositionTransitionRepository.existsByEmployee_IdAndStatus(11, KpiPositionTransitionStatus.PENDING))
                .thenReturn(false);
        when(employeeKpiFormRepository.findByEmployee_IdAndKpiForm_IdAndCyclePeriod_Id(11, 100, 500))
                .thenReturn(Optional.empty());
        when(employeeKpiFormRepository.save(any(EmployeeKpiForm.class))).thenAnswer(invocation -> {
            EmployeeKpiForm saved = invocation.getArgument(0);
            saved.setId(700);
            return saved;
        });
        when(userRepository.findById(1)).thenReturn(Optional.of(manager));
        when(employeeKpiFormEvaluatorRepository.existsByEmployeeKpiForm_IdAndEvaluatorUser_Id(700, 1))
                .thenReturn(false);

        int processed = service.runCycleMaintenance();

        assertThat(processed).isEqualTo(1);
        assertThat(period.getStatus()).isEqualTo(KpiTemplateCyclePeriodStatus.OPEN);
        ArgumentCaptor<EmployeeKpiForm> assignment = ArgumentCaptor.forClass(EmployeeKpiForm.class);
        verify(employeeKpiFormRepository).save(assignment.capture());
        assertThat(assignment.getValue().getCyclePeriod()).isSameAs(period);
        assertThat(assignment.getValue().getEvaluators())
                .extracting(evaluator -> evaluator.getEvaluatorUser().getId())
                .containsExactly(1);
        verify(notificationService).sendEvent(
                eq(1),
                eq("KPI_SCORING_REQUESTED"),
                eq("KPI scoring requested"),
                any(),
                eq(EmployeeKpiWorkflowServiceImpl.TYPE_KPI_MANAGER_ASSIGNMENT),
                eq(100)
        );
    }

    @Test
    void maintenanceClosesActiveCycleAfterCycleEndDate() {
        KpiTemplateCycle cycle = cycle(LocalDate.of(2026, 1, 1), LocalDate.of(2026, 5, 31));
        KpiTemplateCyclePeriod period = period(cycle, null, 1,
                LocalDate.of(2026, 1, 1),
                LocalDate.of(2026, 5, 31),
                KpiTemplateCyclePeriodStatus.OPEN);

        when(kpiTemplateCycleRepository.findByStatusAndEndDateBefore(KpiTemplateCycleStatus.ACTIVE, LocalDate.of(2026, 6, 1)))
                .thenReturn(List.of(cycle));
        when(kpiTemplateCycleFormRepository.findWithFormsByCycleId(100)).thenReturn(List.of());
        when(kpiTemplateCyclePeriodRepository.findByCycle_IdOrderByPeriodNumberAsc(100)).thenReturn(List.of(period));
        when(employeeKpiFormRepository.findOpenByCyclePeriodIdWithDetail(eq(500), any())).thenReturn(List.of());
        when(kpiTemplateCyclePeriodRepository.save(any(KpiTemplateCyclePeriod.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(kpiTemplateCycleRepository.save(any(KpiTemplateCycle.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(kpiTemplateCycleRepository.findByStatus(KpiTemplateCycleStatus.ACTIVE)).thenReturn(List.of());
        stubEmptyMaintenanceQueues();

        int processed = service.runCycleMaintenance();

        assertThat(processed).isEqualTo(1);
        assertThat(cycle.getStatus()).isEqualTo(KpiTemplateCycleStatus.CLOSED);
        assertThat(cycle.getClosedAt()).isNotNull();
        assertThat(cycle.getGraceEndsAt()).isNull();
        assertThat(period.getStatus()).isEqualTo(KpiTemplateCyclePeriodStatus.CLOSED);
        assertThat(period.getClosedAt()).isNotNull();
    }

    private void stubEmptyMaintenanceQueues() {
        lenient().when(kpiTemplateCyclePeriodRepository.findOpenPeriodsPastEnd(any(), any())).thenReturn(List.of());
        lenient().when(kpiTemplateCyclePeriodRepository.findClosingPeriodsDue(any(), any())).thenReturn(List.of());
        lenient().when(employeeKpiPositionTransitionRepository.findDueTransitions(any(), any())).thenReturn(List.of());
    }

    private KpiTemplateCycle cycle(LocalDate start, LocalDate end) {
        KpiTemplateCycle cycle = new KpiTemplateCycle();
        cycle.setId(100);
        cycle.setCycleName("FY KPI");
        cycle.setStartDate(start);
        cycle.setEndDate(end);
        cycle.setDurationYears(1);
        cycle.setDurationMonths(12);
        cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);
        return cycle;
    }

    private KpiTemplateCycleForm cycleForm(KpiTemplateCycle cycle, KpiForm form) {
        return KpiTemplateCycleForm.builder()
                .cycle(cycle)
                .kpiForm(form)
                .build();
    }

    private KpiTemplateCyclePeriod period(
            KpiTemplateCycle cycle,
            KpiForm form,
            int number,
            LocalDate start,
            LocalDate end,
            KpiTemplateCyclePeriodStatus status
    ) {
        KpiTemplateCyclePeriod period = new KpiTemplateCyclePeriod();
        period.setId(500);
        period.setCycle(cycle);
        period.setKpiForm(form);
        period.setPeriodNumber(number);
        period.setStartDate(start);
        period.setEndDate(end);
        period.setStatus(status);
        return period;
    }

    private KpiForm form(Integer id, Position position) {
        KpiForm form = new KpiForm();
        form.setId(id);
        form.setTitle("Engineering KPI");
        form.addItem(KpiFormItem.builder()
                .id(900)
                .kpiLabel("Delivery")
                .target(100.0)
                .weight(100)
                .sortOrder(1)
                .build());
        form.setKpiPositions(List.of(kpiPosition(form, position)));
        return form;
    }

    private KpiPosition kpiPosition(KpiForm form, Position position) {
        return KpiPosition.builder()
                .id(800)
                .kpiForm(form)
                .position(position)
                .durationMonths(3)
                .build();
    }

    private Position position(Integer id, String title) {
        Position position = new Position();
        position.setId(id);
        position.setPositionTitle(title);
        return position;
    }

    private Department department(Integer id) {
        Department department = new Department();
        department.setId(id);
        department.setDepartmentName("Engineering");
        department.setStatus(true);
        return department;
    }

    private Employee employee(Integer id, Position position) {
        Employee employee = new Employee();
        employee.setId(id);
        employee.setFirstName("Employee");
        employee.setLastName(String.valueOf(id));
        employee.setPosition(position);
        employee.setActive(true);
        return employee;
    }

    private User user(Integer id, Integer departmentId, Integer employeeId) {
        User user = new User();
        user.setId(id);
        user.setDepartmentId(departmentId);
        user.setEmployeeId(employeeId);
        user.setEmail("user" + id + "@epms.local");
        user.setActive(true);
        return user;
    }

    private Team team(Integer id, Department department, User manager, TeamMember... members) {
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

    private TeamMember member(User user) {
        TeamMember member = new TeamMember();
        member.setMemberUser(user);
        return member;
    }
}
