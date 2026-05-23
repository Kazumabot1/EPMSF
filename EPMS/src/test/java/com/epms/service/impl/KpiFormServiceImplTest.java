package com.epms.service.impl;

import com.epms.dto.KpiFormItemDTO;
import com.epms.dto.KpiFormRequestDTO;
import com.epms.entity.EmployeeKpiForm;
import com.epms.entity.EmployeeKpiScore;
import com.epms.entity.KpiForm;
import com.epms.entity.KpiFormItem;
import com.epms.entity.KpiPosition;
import com.epms.entity.Position;
import com.epms.entity.User;
import com.epms.entity.enums.EmployeeKpiStatus;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.repository.EmployeeKpiFormRepository;
import com.epms.repository.KpiCategoryRepository;
import com.epms.repository.KpiFormItemRepository;
import com.epms.repository.KpiFormRepository;
import com.epms.repository.KpiItemRepository;
import com.epms.repository.KpiPositionRepository;
import com.epms.repository.KpiTemplateVersionRowRepository;
import com.epms.repository.KpiUnitRepository;
import com.epms.repository.KpiVersionHistoryRepository;
import com.epms.repository.PositionRepository;
import com.epms.repository.UserRepository;
import com.epms.security.UserPrincipal;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.List;
import java.util.Optional;
import java.util.concurrent.atomic.AtomicBoolean;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class KpiFormServiceImplTest {

    @Mock
    private KpiFormRepository kpiFormRepository;

    @Mock
    private KpiPositionRepository kpiPositionRepository;

    @Mock
    private PositionRepository positionRepository;

    @Mock
    private KpiCategoryRepository kpiCategoryRepository;

    @Mock
    private KpiUnitRepository kpiUnitRepository;

    @Mock
    private KpiItemRepository kpiItemRepository;

    @Mock
    private KpiFormItemRepository kpiFormItemRepository;

    @Mock
    private EmployeeKpiFormRepository employeeKpiFormRepository;

    @Mock
    private UserRepository userRepository;

    @Mock
    private KpiVersionHistoryRepository kpiVersionHistoryRepository;

    @Mock
    private KpiTemplateVersionRowRepository kpiTemplateVersionRowRepository;

    @Mock
    private ObjectMapper objectMapper;

    @InjectMocks
    private KpiFormServiceImpl service;

    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void updateTemplateBackfillsMissingScoresForNonFinalizedAssignmentsOnly() throws Exception {
        User editor = user(9);
        authenticate(editor);

        Position position = position(47, "Senior HR Officer");
        KpiForm form = form(100, position, item(501, "Employee turnover rate", 90.0, 40, 0));
        EmployeeKpiForm assigned = employeeAssignment(700, form, EmployeeKpiStatus.ASSIGNED, form.getItems().get(0));
        AtomicBoolean savedTemplate = new AtomicBoolean(false);

        when(userRepository.findById(9)).thenReturn(Optional.of(editor));
        when(kpiFormRepository.findById(100)).thenReturn(Optional.of(form));
        when(objectMapper.writeValueAsString(any())).thenReturn("{}");
        when(kpiFormRepository.saveAndFlush(any(KpiForm.class))).thenAnswer(invocation -> {
            KpiForm saved = invocation.getArgument(0);
            savedTemplate.set(true);
            int nextId = 900;
            for (KpiFormItem row : saved.getItems()) {
                if (row.getId() == null) {
                    row.setId(nextId++);
                }
            }
            return saved;
        });
        when(employeeKpiFormRepository.findNonFinalizedByKpiFormIdWithScores(100, EmployeeKpiStatus.FINALIZED))
                .thenReturn(List.of(assigned));
        when(kpiFormRepository.findDetailWithItemsById(100)).thenAnswer(invocation -> {
            if (savedTemplate.get()) {
                boolean hasNewRow = form.getItems().stream()
                        .anyMatch(row -> "Compliance Rate".equals(row.getKpiLabel()));
                if (!hasNewRow) {
                    form.addItem(item(900, "Compliance Rate", 100.0, 60, 1));
                }
            }
            return Optional.of(form);
        });
        when(kpiPositionRepository.findWithPositionByKpiForm_Id(100)).thenReturn(List.of(kpiPosition(form, position)));

        KpiFormRequestDTO request = KpiFormRequestDTO.builder()
                .title("HR KPI")
                .status(KpiFormStatus.ACTIVE)
                .positionIds(List.of(position.getId()))
                .items(List.of(
                        dto(501, "Employee turnover rate", "Turnover rate", 90.0, 40, 0, null),
                        dto(null, "Compliance Rate", "Percent", 100.0, 60, 1, "Added compliance row")
                ))
                .build();

        service.updateTemplate(100, request);

        assertThat(assigned.getScores())
                .extracting(score -> score.getKpiFormItem().getId())
                .containsExactlyInAnyOrder(501, 900);

        ArgumentCaptor<EmployeeKpiForm> savedAssignment = ArgumentCaptor.forClass(EmployeeKpiForm.class);
        verify(employeeKpiFormRepository).save(savedAssignment.capture());
        assertThat(savedAssignment.getValue().getStatus()).isEqualTo(EmployeeKpiStatus.ASSIGNED);
        verify(employeeKpiFormRepository).findNonFinalizedByKpiFormIdWithScores(100, EmployeeKpiStatus.FINALIZED);
    }

    private static KpiFormItemDTO dto(
            Integer id,
            String label,
            String unit,
            Double target,
            Integer weight,
            Integer sortOrder,
            String reason
    ) {
        return KpiFormItemDTO.builder()
                .id(id)
                .kpiLabel(label)
                .kpiCategoryLabel("People")
                .kpiUnitLabel(unit)
                .target(target)
                .weight(weight)
                .sortOrder(sortOrder)
                .changeReason(reason)
                .build();
    }

    private static KpiForm form(Integer id, Position position, KpiFormItem... items) {
        KpiForm form = new KpiForm();
        form.setId(id);
        form.setTitle("HR KPI");
        form.setStatus(KpiFormStatus.ACTIVE);
        form.setKpiPositions(List.of(kpiPosition(form, position)));
        for (KpiFormItem item : items) {
            form.addItem(item);
        }
        return form;
    }

    private static KpiFormItem item(Integer id, String label, Double target, Integer weight, Integer sortOrder) {
        return KpiFormItem.builder()
                .id(id)
                .kpiLabel(label)
                .kpiCategoryLabel("People")
                .kpiUnitLabel("Percent")
                .target(target)
                .weight(weight)
                .sortOrder(sortOrder)
                .build();
    }

    private static EmployeeKpiForm employeeAssignment(
            Integer id,
            KpiForm form,
            EmployeeKpiStatus status,
            KpiFormItem... scoredItems
    ) {
        EmployeeKpiForm assignment = new EmployeeKpiForm();
        assignment.setId(id);
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
                .id(300)
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

    private static User user(Integer id) {
        User user = new User();
        user.setId(id);
        user.setEmail("editor@epms.local");
        user.setPassword("password");
        user.setActive(true);
        return user;
    }

    private static void authenticate(User user) {
        UserPrincipal principal = new UserPrincipal(user, List.of("HR"), List.of(), "HR");
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, principal.getPassword(), principal.getAuthorities())
        );
    }
}
