package com.epms.service.impl;

import com.epms.dto.KpiTemplateCycleStatusRequestDTO;
import com.epms.entity.KpiTemplateCycle;
import com.epms.entity.KpiTemplateCyclePeriod;
import com.epms.entity.User;
import com.epms.entity.enums.KpiEarlyCloseReviewDecision;
import com.epms.entity.enums.KpiGraceExtension;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.repository.KpiFormRepository;
import com.epms.repository.KpiTemplateCycleFormRepository;
import com.epms.repository.KpiTemplateCyclePeriodRepository;
import com.epms.repository.KpiTemplateCycleRepository;
import com.epms.repository.UserRepository;
import com.epms.security.UserPrincipal;
import com.epms.service.EmployeeKpiWorkflowService;
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

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KpiTemplateCycleServiceImplTest {

    @Mock
    private KpiTemplateCycleRepository cycleRepository;

    @Mock
    private KpiTemplateCycleFormRepository cycleFormRepository;

    @Mock
    private KpiTemplateCyclePeriodRepository cyclePeriodRepository;

    @Mock
    private KpiFormRepository kpiFormRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @InjectMocks
    private KpiTemplateCycleServiceImpl service;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void earlyDeactivateBeforeOfficialEndCreatesPendingApprovalWithoutStartingGrace() {
        User hr = user(17, "HR User");
        KpiTemplateCycle cycle = activeCycle();
        KpiTemplateCyclePeriod period = openPeriod(cycle, LocalDate.now().plusDays(10));
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        stubCycle(cycle);
        when(userRepository.findById(17)).thenReturn(Optional.of(hr));
        when(cyclePeriodRepository.findTopByCycle_IdAndStatusInOrderByPeriodNumberDesc(
                100,
                List.of(KpiTemplateCyclePeriodStatus.OPEN, KpiTemplateCyclePeriodStatus.CLOSING)
        )).thenReturn(Optional.of(period));

        service.updateStatus(100, statusRequest(false, "Need to wrap up early", KpiGraceExtension.TWO_WEEKS));

        assertThat(cycle.getStatus()).isEqualTo(KpiTemplateCycleStatus.PENDING_APPROVAL);
        assertThat(cycle.getEarlyCloseReason()).isEqualTo("Need to wrap up early");
        assertThat(cycle.getGraceExtension()).isEqualTo(KpiGraceExtension.TWO_WEEKS);
        assertThat(cycle.getEarlyCloseRequestedByUser()).isSameAs(hr);
        verify(employeeKpiWorkflowService, never()).startCycleClosingGrace(anyInt());
        verify(employeeKpiWorkflowService, never()).startCycleClosingGrace(anyInt(), any(LocalDateTime.class));
    }

    @Test
    void earlyDeactivateRequiresReasonAndGraceExtension() {
        User hr = user(17, "HR User");
        KpiTemplateCycle cycle = activeCycle();
        KpiTemplateCyclePeriod period = openPeriod(cycle, LocalDate.now().plusDays(10));
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(cycleRepository.findById(100)).thenReturn(Optional.of(cycle));
        when(cyclePeriodRepository.findTopByCycle_IdAndStatusInOrderByPeriodNumberDesc(
                100,
                List.of(KpiTemplateCyclePeriodStatus.OPEN, KpiTemplateCyclePeriodStatus.CLOSING)
        )).thenReturn(Optional.of(period));

        assertThatThrownBy(() -> service.updateStatus(100, statusRequest(false, " ", KpiGraceExtension.ONE_WEEK)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Reason is required");

        assertThatThrownBy(() -> service.updateStatus(100, statusRequest(false, "Reason", null)))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Grace period extension is required");
    }

    @Test
    void ceoApprovalStartsGraceUsingSelectedExtension() {
        User ceo = user(15, "CEO User");
        KpiTemplateCycle cycle = pendingCycle();
        authenticate(ceo, List.of("CEO"), "CEO_DASHBOARD");
        stubCycle(cycle);
        when(userRepository.findById(15)).thenReturn(Optional.of(ceo));

        service.approveEarlyClose(100, "Approved");

        assertThat(cycle.getEarlyCloseReviewDecision()).isEqualTo(KpiEarlyCloseReviewDecision.APPROVED);
        assertThat(cycle.getEarlyCloseReviewReason()).isEqualTo("Approved");
        ArgumentCaptor<LocalDateTime> graceEnds = ArgumentCaptor.forClass(LocalDateTime.class);
        verify(employeeKpiWorkflowService).startCycleClosingGrace(org.mockito.Mockito.eq(100), graceEnds.capture());
        assertThat(graceEnds.getValue()).isAfter(LocalDateTime.now().plusDays(13));
        assertThat(graceEnds.getValue()).isBefore(LocalDateTime.now().plusDays(15));
    }

    @Test
    void ceoRejectionReturnsCycleToActiveAndStoresReason() {
        User ceo = user(15, "CEO User");
        KpiTemplateCycle cycle = pendingCycle();
        authenticate(ceo, List.of("CEO"), "CEO_DASHBOARD");
        stubCycle(cycle);
        when(userRepository.findById(15)).thenReturn(Optional.of(ceo));

        service.rejectEarlyClose(100, "Need more evidence");

        assertThat(cycle.getStatus()).isEqualTo(KpiTemplateCycleStatus.ACTIVE);
        assertThat(cycle.getEarlyCloseReviewDecision()).isEqualTo(KpiEarlyCloseReviewDecision.REJECTED);
        assertThat(cycle.getEarlyCloseReviewReason()).isEqualTo("Need more evidence");
        verify(employeeKpiWorkflowService, never()).startCycleClosingGrace(anyInt(), any(LocalDateTime.class));
    }

    private void stubCycle(KpiTemplateCycle cycle) {
        when(cycleRepository.findById(100)).thenReturn(Optional.of(cycle));
        when(cycleFormRepository.findWithFormsByCycleId(100)).thenReturn(List.of());
        when(cyclePeriodRepository.findTopByCycle_IdOrderByPeriodNumberDesc(100)).thenReturn(Optional.empty());
    }

    private KpiTemplateCycle activeCycle() {
        KpiTemplateCycle cycle = new KpiTemplateCycle();
        cycle.setId(100);
        cycle.setCycleName("Q2 KPI");
        cycle.setStartDate(LocalDate.now().minusDays(10));
        cycle.setEndDate(LocalDate.now().plusDays(20));
        cycle.setDurationMonths(3);
        cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);
        return cycle;
    }

    private KpiTemplateCycle pendingCycle() {
        KpiTemplateCycle cycle = activeCycle();
        cycle.setStatus(KpiTemplateCycleStatus.PENDING_APPROVAL);
        cycle.setGraceExtension(KpiGraceExtension.TWO_WEEKS);
        cycle.setEarlyCloseReason("Need to wrap up early");
        return cycle;
    }

    private KpiTemplateCyclePeriod openPeriod(KpiTemplateCycle cycle, LocalDate endDate) {
        KpiTemplateCyclePeriod period = new KpiTemplateCyclePeriod();
        period.setId(500);
        period.setCycle(cycle);
        period.setPeriodNumber(1);
        period.setStartDate(LocalDate.now().minusDays(10));
        period.setEndDate(endDate);
        period.setStatus(KpiTemplateCyclePeriodStatus.OPEN);
        return period;
    }

    private KpiTemplateCycleStatusRequestDTO statusRequest(
            boolean active,
            String reason,
            KpiGraceExtension graceExtension
    ) {
        KpiTemplateCycleStatusRequestDTO request = new KpiTemplateCycleStatusRequestDTO();
        request.setActive(active);
        request.setReason(reason);
        request.setGraceExtension(graceExtension);
        return request;
    }

    private User user(Integer id, String fullName) {
        User user = new User();
        user.setId(id);
        user.setFullName(fullName);
        user.setEmail("user" + id + "@epms.local");
        user.setPassword("password");
        user.setActive(true);
        return user;
    }

    private void authenticate(User user, List<String> roles, String dashboard) {
        UserPrincipal principal = new UserPrincipal(user, roles, List.of(), dashboard);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities())
        );
    }
}
