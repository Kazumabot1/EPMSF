package com.epms.service.impl;

import com.epms.dto.KpiTemplateCycleRequestDTO;
import com.epms.dto.KpiTemplateCycleStatusRequestDTO;
import com.epms.entity.KpiTemplateCycle;
import com.epms.entity.KpiTemplateCycleForm;
import com.epms.entity.KpiTemplateCyclePeriod;
import com.epms.entity.KpiForm;
import com.epms.entity.User;
import com.epms.entity.enums.KpiFormStatus;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.server.ResponseStatusException;

import java.time.Clock;
import java.time.Instant;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.http.HttpStatus.BAD_REQUEST;
import static org.springframework.http.HttpStatus.CONFLICT;

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

    @Mock
    private Clock clock;

    @InjectMocks
    private KpiTemplateCycleServiceImpl service;

    private static final Clock FIXED_CLOCK = Clock.fixed(Instant.parse("2026-01-01T00:00:00Z"), ZoneId.systemDefault());

    @BeforeEach
    void setUpClock() {
        lenient().when(clock.instant()).thenReturn(FIXED_CLOCK.instant());
        lenient().when(clock.getZone()).thenReturn(FIXED_CLOCK.getZone());
    }

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

    @Test
    void createUsesDurationYearsToCalculateCycleEndDate() {
        User hr = user(17, "HR User");
        KpiForm form = new KpiForm();
        form.setId(200);
        form.setTitle("Engineering KPI");
        form.setStatus(KpiFormStatus.ACTIVE);
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(userRepository.findById(17)).thenReturn(Optional.of(hr));
        when(kpiFormRepository.findById(200)).thenReturn(Optional.of(form));
        when(cycleFormRepository.findConflictingLinks(anyCollection(), any(), anyCollection())).thenReturn(List.of());
        when(cycleRepository.save(any(KpiTemplateCycle.class))).thenAnswer(invocation -> {
            KpiTemplateCycle saved = invocation.getArgument(0);
            saved.setId(100);
            return saved;
        });
        stubCycle(activeCycle());

        com.epms.dto.KpiTemplateCycleRequestDTO request = new com.epms.dto.KpiTemplateCycleRequestDTO();
        request.setCycleName("FY KPI");
        request.setStartDate(LocalDate.of(2026, 1, 1));
        request.setDurationYears(3);
        request.setKpiFormIds(List.of(200));

        service.create(request);

        ArgumentCaptor<KpiTemplateCycle> saved = ArgumentCaptor.forClass(KpiTemplateCycle.class);
        verify(cycleRepository).save(saved.capture());
        assertThat(saved.getValue().getEndDate()).isEqualTo(LocalDate.of(2028, 12, 31));
        assertThat(saved.getValue().getDurationYears()).isEqualTo(3);
        assertThat(saved.getValue().getDurationMonths()).isEqualTo(36);
    }

    @Test
    void updateRejectsActiveCycle() {
        User hr = user(17, "HR User");
        KpiTemplateCycle cycle = activeCycle();
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(cycleRepository.findById(100)).thenReturn(Optional.of(cycle));

        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("Adjusted", "Because");

        assertThatThrownBy(() -> service.update(100, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(CONFLICT));
    }

    @Test
    void createRejectsMissingStartDate() {
        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("FY KPI", "Because");
        request.setStartDate(null);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Start date is required.");
    }

    @Test
    void createRejectsPastStartDate() {
        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("FY KPI", "Because");
        request.setStartDate(LocalDate.of(2025, 12, 31));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Start date cannot be in the past.");
    }

    @Test
    void createAcceptsTomorrowStartDate() {
        User hr = user(17, "HR User");
        KpiForm form = activeForm();
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(userRepository.findById(17)).thenReturn(Optional.of(hr));
        when(kpiFormRepository.findById(200)).thenReturn(Optional.of(form));
        when(cycleFormRepository.findConflictingLinks(anyCollection(), any(), anyCollection())).thenReturn(List.of());
        when(cycleRepository.save(any(KpiTemplateCycle.class))).thenAnswer(invocation -> {
            KpiTemplateCycle saved = invocation.getArgument(0);
            saved.setId(100);
            return saved;
        });
        stubCycle(activeCycle());

        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("FY KPI", "Because");
        request.setStartDate(LocalDate.of(2026, 1, 2));

        service.create(request);

        ArgumentCaptor<KpiTemplateCycle> saved = ArgumentCaptor.forClass(KpiTemplateCycle.class);
        verify(cycleRepository).save(saved.capture());
        assertThat(saved.getValue().getStartDate()).isEqualTo(LocalDate.of(2026, 1, 2));
    }

    @Test
    void createRejectsOutOfRangeDurationYears() {
        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("FY KPI", "Because");
        request.setDurationYears(0);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cycle period must be between 1 and 5 years.");

        request.setDurationYears(6);

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Cycle period must be between 1 and 5 years.");
    }

    @Test
    void createCalculatesBoundaryEndDates() {
        User hr = user(17, "HR User");
        KpiForm form = activeForm();
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(userRepository.findById(17)).thenReturn(Optional.of(hr));
        when(kpiFormRepository.findById(200)).thenReturn(Optional.of(form));
        when(cycleFormRepository.findConflictingLinks(anyCollection(), any(), anyCollection())).thenReturn(List.of());
        when(cycleRepository.save(any(KpiTemplateCycle.class))).thenAnswer(invocation -> {
            KpiTemplateCycle saved = invocation.getArgument(0);
            saved.setId(100);
            return saved;
        });
        stubCycle(activeCycle());

        KpiTemplateCycleRequestDTO mayStart = cycleUpdateRequest("May KPI", "Because");
        mayStart.setStartDate(LocalDate.of(2026, 5, 26));
        mayStart.setDurationYears(5);
        service.create(mayStart);

        KpiTemplateCycleRequestDTO yearEndStart = cycleUpdateRequest("Year End KPI", "Because");
        yearEndStart.setStartDate(LocalDate.of(2026, 12, 31));
        yearEndStart.setDurationYears(1);
        service.create(yearEndStart);

        KpiTemplateCycleRequestDTO leapDayStart = cycleUpdateRequest("Leap KPI", "Because");
        leapDayStart.setStartDate(LocalDate.of(2028, 2, 29));
        leapDayStart.setDurationYears(1);
        service.create(leapDayStart);

        ArgumentCaptor<KpiTemplateCycle> saved = ArgumentCaptor.forClass(KpiTemplateCycle.class);
        verify(cycleRepository, org.mockito.Mockito.times(3)).save(saved.capture());
        assertThat(saved.getAllValues().get(0).getEndDate()).isEqualTo(LocalDate.of(2031, 5, 25));
        assertThat(saved.getAllValues().get(1).getEndDate()).isEqualTo(LocalDate.of(2027, 12, 30));
        assertThat(saved.getAllValues().get(2).getEndDate()).isEqualTo(LocalDate.of(2029, 2, 28));
    }

    @Test
    void updateRejectsPastStartDateForDraftCycle() {
        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("Adjusted", "Because");
        request.setStartDate(LocalDate.of(2025, 12, 31));

        assertThatThrownBy(() -> service.update(100, request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("Start date cannot be in the past.");
    }

    @Test
    void updateRejectsPendingApprovalCycle() {
        User hr = user(17, "HR User");
        KpiTemplateCycle cycle = pendingCycle();
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(cycleRepository.findById(100)).thenReturn(Optional.of(cycle));

        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("Adjusted", "Because");

        assertThatThrownBy(() -> service.update(100, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(CONFLICT))
                .hasMessageContaining("pending CEO approval");
    }

    @Test
    void updateAllowsClosingCycleBeforeGraceEnds() {
        User hr = user(17, "HR User");
        KpiTemplateCycle cycle = closingCycle(LocalDateTime.now().plusHours(1));
        KpiForm form = new KpiForm();
        form.setId(200);
        form.setTitle("Engineering KPI");
        form.setStatus(KpiFormStatus.ACTIVE);
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        stubCycle(cycle);
        when(userRepository.findById(17)).thenReturn(Optional.of(hr));
        when(kpiFormRepository.findById(200)).thenReturn(Optional.of(form));
        when(cycleFormRepository.findConflictingLinks(anyCollection(), any(), anyCollection())).thenReturn(List.of());

        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("Adjusted", "Still inside grace");

        service.update(100, request);

        assertThat(cycle.getCycleName()).isEqualTo("Adjusted");
        assertThat(cycle.getLastEditReason()).isEqualTo("Still inside grace");
        verify(cycleRepository).save(cycle);
    }

    @Test
    void updateRejectsCeoApprovedClosingCycleBeforeGraceEnds() {
        User hr = user(17, "HR User");
        KpiTemplateCycle cycle = closingCycle(LocalDateTime.now().plusHours(1));
        cycle.setEarlyCloseReviewDecision(KpiEarlyCloseReviewDecision.APPROVED);
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(cycleRepository.findById(100)).thenReturn(Optional.of(cycle));

        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("Adjusted", "Because");

        assertThatThrownBy(() -> service.update(100, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(CONFLICT))
                .hasMessageContaining("CEO approved closure");
    }

    @Test
    void updateRejectsClosingCycleWhenGraceHasEnded() {
        User hr = user(17, "HR User");
        KpiTemplateCycle cycle = closingCycle(LocalDateTime.now().minusSeconds(1));
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(cycleRepository.findById(100)).thenReturn(Optional.of(cycle));

        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("Adjusted", "Because");

        assertThatThrownBy(() -> service.update(100, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(CONFLICT))
                .hasMessageContaining("Grace period has ended");
    }

    @Test
    void updateRequiresEditReason() {
        User hr = user(17, "HR User");
        KpiTemplateCycle cycle = draftCycle();
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(cycleRepository.findById(100)).thenReturn(Optional.of(cycle));

        KpiTemplateCycleRequestDTO request = cycleUpdateRequest("Adjusted", "   ");

        assertThatThrownBy(() -> service.update(100, request))
                .isInstanceOf(ResponseStatusException.class)
                .satisfies(ex -> assertThat(((ResponseStatusException) ex).getStatusCode()).isEqualTo(BAD_REQUEST));
    }

    @Test
    void createRejectsFormAlreadyOnRunningCycle() {
        User hr = user(17, "HR User");
        KpiForm form = new KpiForm();
        form.setId(200);
        form.setTitle("Engineering KPI");
        form.setStatus(KpiFormStatus.ACTIVE);
        KpiTemplateCycle otherCycle = activeCycle();
        otherCycle.setCycleName("Other cycle");
        KpiTemplateCycleForm link = KpiTemplateCycleForm.builder()
                .cycle(otherCycle)
                .kpiForm(form)
                .build();
        authenticate(hr, List.of("HR"), "HR_DASHBOARD");
        when(userRepository.findById(17)).thenReturn(Optional.of(hr));
        when(cycleFormRepository.findConflictingLinks(anyCollection(), any(), anyCollection()))
                .thenReturn(List.of(link));

        KpiTemplateCycleRequestDTO request = new KpiTemplateCycleRequestDTO();
        request.setCycleName("FY KPI");
        request.setStartDate(LocalDate.of(2026, 1, 1));
        request.setDurationYears(1);
        request.setKpiFormIds(List.of(200));

        assertThatThrownBy(() -> service.create(request))
                .isInstanceOf(ResponseStatusException.class)
                .hasMessageContaining("already used by the running cycle");
    }

    private KpiTemplateCycle draftCycle() {
        KpiTemplateCycle cycle = activeCycle();
        cycle.setStatus(KpiTemplateCycleStatus.DRAFT);
        return cycle;
    }

    private KpiTemplateCycle closingCycle(LocalDateTime graceEndsAt) {
        KpiTemplateCycle cycle = activeCycle();
        cycle.setStatus(KpiTemplateCycleStatus.CLOSING);
        cycle.setGraceEndsAt(graceEndsAt);
        return cycle;
    }

    private KpiTemplateCycleRequestDTO cycleUpdateRequest(String name, String editReason) {
        KpiTemplateCycleRequestDTO request = new KpiTemplateCycleRequestDTO();
        request.setCycleName(name);
        request.setStartDate(LocalDate.of(2026, 1, 1));
        request.setDurationYears(1);
        request.setKpiFormIds(List.of(200));
        request.setEditReason(editReason);
        return request;
    }

    private KpiForm activeForm() {
        KpiForm form = new KpiForm();
        form.setId(200);
        form.setTitle("Engineering KPI");
        form.setStatus(KpiFormStatus.ACTIVE);
        return form;
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
