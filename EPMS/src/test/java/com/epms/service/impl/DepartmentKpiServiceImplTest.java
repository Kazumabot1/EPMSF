package com.epms.service.impl;

import com.epms.dto.DepartmentKpiCycleRequestDto;
import com.epms.dto.DepartmentKpiResultDto;
import com.epms.dto.UpdateDepartmentKpiScoresRequest;
import com.epms.entity.Department;
import com.epms.entity.DepartmentKpiCycle;
import com.epms.entity.DepartmentKpiCycleTemplate;
import com.epms.entity.DepartmentKpiResult;
import com.epms.entity.DepartmentKpiScore;
import com.epms.entity.DepartmentKpiTemplate;
import com.epms.entity.DepartmentKpiTemplateRow;
import com.epms.entity.User;
import com.epms.entity.enums.DepartmentKpiResultStatus;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.repository.DepartmentKpiCyclePeriodRepository;
import com.epms.repository.DepartmentKpiCycleRepository;
import com.epms.repository.DepartmentKpiCycleTemplateRepository;
import com.epms.repository.DepartmentKpiResultRepository;
import com.epms.repository.DepartmentKpiTemplateRepository;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.KpiCategoryRepository;
import com.epms.repository.KpiItemRepository;
import com.epms.repository.KpiUnitRepository;
import com.epms.repository.UserRepository;
import com.epms.security.UserPrincipal;
import com.epms.service.NotificationService;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;

@ExtendWith(MockitoExtension.class)
class DepartmentKpiServiceImplTest {

    @Mock
    private DepartmentKpiTemplateRepository templateRepository;
    @Mock
    private DepartmentKpiCycleRepository cycleRepository;
    @Mock
    private DepartmentKpiCycleTemplateRepository cycleTemplateRepository;
    @Mock
    private DepartmentKpiCyclePeriodRepository cyclePeriodRepository;
    @Mock
    private DepartmentKpiResultRepository resultRepository;
    @Mock
    private DepartmentRepository departmentRepository;
    @Mock
    private KpiCategoryRepository kpiCategoryRepository;
    @Mock
    private KpiUnitRepository kpiUnitRepository;
    @Mock
    private KpiItemRepository kpiItemRepository;
    @Mock
    private UserRepository userRepository;
    @Mock
    private NotificationService notificationService;

    @InjectMocks
    private DepartmentKpiServiceImpl service;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updateScoresAllowsActualEqualToTargetAndCapsWeightScoreAtWeight() {
        User hr = user(1);
        DepartmentKpiResult result = result(700, row(501, 80.0, 40, 0));
        authenticate(hr);
        when(userRepository.findById(1)).thenReturn(Optional.of(hr));
        when(resultRepository.findDetailById(700)).thenReturn(Optional.of(result));

        DepartmentKpiResultDto updated = service.updateScores(700, scoreRequest(501, 80.0));

        assertThat(updated.getLines()).singleElement().satisfies(line -> {
            assertThat(line.getActualValue()).isEqualTo(80.0);
            assertThat(line.getScore()).isEqualTo(100.0);
            assertThat(line.getWeightedScore()).isEqualTo(40.0);
        });
    }

    @Test
    void updateCycleRejectsActiveCycle() {
        User hr = user(1);
        DepartmentKpiCycle cycle = departmentCycle(KpiTemplateCycleStatus.ACTIVE);
        authenticate(hr);
        when(cycleRepository.findDetailById(10)).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.updateCycle(10, cycleUpdateRequest("Renamed", "HR update")))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(CONFLICT));
    }

    @Test
    void updateCycleRequiresEditReason() {
        User hr = user(1);
        DepartmentKpiCycle cycle = departmentCycle(KpiTemplateCycleStatus.DRAFT);
        authenticate(hr);
        when(cycleRepository.findDetailById(10)).thenReturn(Optional.of(cycle));

        assertThatThrownBy(() -> service.updateCycle(10, cycleUpdateRequest("Renamed", "  ")))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(BAD_REQUEST));
    }

    @Test
    void createCycleRejectsTemplateOnActiveCycle() {
        User hr = user(1);
        DepartmentKpiTemplate template = DepartmentKpiTemplate.builder()
                .id(100)
                .title("Finance KPI")
                .status(KpiFormStatus.ACTIVE)
                .build();
        DepartmentKpiCycle other = departmentCycle(KpiTemplateCycleStatus.ACTIVE);
        other.setCycleName("Other");
        DepartmentKpiCycleTemplate link = DepartmentKpiCycleTemplate.builder()
                .cycle(other)
                .template(template)
                .build();
        authenticate(hr);
        when(userRepository.findById(1)).thenReturn(Optional.of(hr));
        when(cycleTemplateRepository.findConflictingLinks(any(), any(), anyCollection())).thenReturn(List.of(link));

        assertThatThrownBy(() -> service.createCycle(cycleCreateRequest(List.of(100))))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already used by the active cycle");
    }

    @Test
    void updateScoresRejectsActualGreaterThanTarget() {
        User hr = user(1);
        DepartmentKpiResult result = result(700, row(501, 80.0, 40, 0));
        authenticate(hr);
        when(userRepository.findById(1)).thenReturn(Optional.of(hr));
        when(resultRepository.findDetailById(700)).thenReturn(Optional.of(result));

        assertThatThrownBy(() -> service.updateScores(700, scoreRequest(501, 81.0)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Actual % must be less than or equal to Target %");
    }

    private static UpdateDepartmentKpiScoresRequest scoreRequest(Integer rowId, Double actualValue) {
        return UpdateDepartmentKpiScoresRequest.builder()
                .scores(List.of(UpdateDepartmentKpiScoresRequest.ScoreUpdate.builder()
                        .templateRowId(rowId)
                        .actualValue(actualValue)
                        .build()))
                .build();
    }

    private static DepartmentKpiResult result(Integer id, DepartmentKpiTemplateRow row) {
        Department department = new Department();
        department.setId(7);
        department.setDepartmentName("Finance");

        DepartmentKpiTemplate template = DepartmentKpiTemplate.builder()
                .id(100)
                .title("Finance KPI")
                .status(KpiFormStatus.ACTIVE)
                .build();
        template.addRow(row);

        DepartmentKpiResult result = DepartmentKpiResult.builder()
                .id(id)
                .department(department)
                .template(template)
                .status(DepartmentKpiResultStatus.ASSIGNED)
                .build();
        result.addScore(DepartmentKpiScore.builder().templateRow(row).build());
        return result;
    }

    private static DepartmentKpiTemplateRow row(Integer id, Double target, Integer weight, Integer sortOrder) {
        return DepartmentKpiTemplateRow.builder()
                .id(id)
                .kpiLabel("Delivery")
                .target(target)
                .weight(weight)
                .sortOrder(sortOrder)
                .build();
    }

    private static User user(Integer id) {
        User user = new User();
        user.setId(id);
        user.setEmail("hr" + id + "@epms.local");
        user.setPassword("password");
        user.setActive(true);
        return user;
    }

    private static DepartmentKpiCycle departmentCycle(KpiTemplateCycleStatus status) {
        return DepartmentKpiCycle.builder()
                .id(10)
                .cycleName("Dept cycle")
                .startDate(LocalDate.of(2026, 1, 1))
                .endDate(LocalDate.of(2026, 3, 31))
                .durationMonths(3)
                .status(status)
                .build();
    }

    private static DepartmentKpiCycleRequestDto cycleCreateRequest(List<Integer> templateIds) {
        DepartmentKpiCycleRequestDto request = new DepartmentKpiCycleRequestDto();
        request.setCycleName("New cycle");
        request.setStartDate(LocalDate.of(2026, 1, 1));
        request.setDurationMonths(3);
        request.setTemplateIds(templateIds);
        return request;
    }

    private static DepartmentKpiCycleRequestDto cycleUpdateRequest(String name, String editReason) {
        DepartmentKpiCycleRequestDto request = cycleCreateRequest(List.of(100));
        request.setCycleName(name);
        request.setEditReason(editReason);
        return request;
    }

    private static void authenticate(User user) {
        UserPrincipal principal = new UserPrincipal(user, List.of("HR"), List.of(), "HR");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities())
        );
    }
}
