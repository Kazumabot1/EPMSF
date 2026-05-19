package com.epms.service.impl;

import com.epms.dto.KpiTemplateCycleRequestDTO;
import com.epms.dto.KpiTemplateCycleResponseDTO;
import com.epms.entity.KpiForm;
import com.epms.entity.KpiTemplateCycle;
import com.epms.entity.KpiTemplateCycleForm;
import com.epms.entity.User;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.repository.KpiFormRepository;
import com.epms.repository.KpiTemplateCycleFormRepository;
import com.epms.repository.KpiTemplateCycleRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.EmployeeKpiWorkflowService;
import com.epms.service.KpiTemplateCycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDate;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class KpiTemplateCycleServiceImpl implements KpiTemplateCycleService {

    private static final Set<Integer> ALLOWED_DURATION_MONTHS = Set.of(3, 4, 5, 6, 7, 8, 9, 10, 11, 12);

    private final KpiTemplateCycleRepository cycleRepository;
    private final KpiTemplateCycleFormRepository cycleFormRepository;
    private final KpiFormRepository kpiFormRepository;
    private final UserRepository userRepository;
    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @Override
    @Transactional
    public KpiTemplateCycleResponseDTO create(KpiTemplateCycleRequestDTO dto) {
        validateRequest(dto);
        User author = currentUser();
        LocalDate endDate = calculateEndDate(dto.getStartDate(), dto.getDurationMonths());

        KpiTemplateCycle cycle = KpiTemplateCycle.builder()
                .cycleName(dto.getCycleName().trim())
                .startDate(dto.getStartDate())
                .endDate(endDate)
                .durationMonths(dto.getDurationMonths())
                .status(KpiTemplateCycleStatus.DRAFT)
                .createdByUser(author)
                .build();

        applyForms(cycle, dto.getKpiFormIds());
        KpiTemplateCycle saved = cycleRepository.save(cycle);
        cycleRepository.flush();
        return getById(saved.getId());
    }

    @Override
    @Transactional
    public KpiTemplateCycleResponseDTO update(Integer id, KpiTemplateCycleRequestDTO dto) {
        validateRequest(dto);
        KpiTemplateCycle cycle = cycleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template cycle not found"));

        cycle.setCycleName(dto.getCycleName().trim());
        cycle.setStartDate(dto.getStartDate());
        cycle.setDurationMonths(dto.getDurationMonths());
        cycle.setEndDate(calculateEndDate(dto.getStartDate(), dto.getDurationMonths()));
        cycle.setUpdatedByUser(currentUser());

        cycle.getCycleForms().clear();
        cycleRepository.flush();
        applyForms(cycle, dto.getKpiFormIds());

        cycleRepository.save(cycle);
        return getById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<KpiTemplateCycleResponseDTO> list() {
        return cycleRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toSummaryDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public KpiTemplateCycleResponseDTO getById(Integer id) {
        KpiTemplateCycle cycle = cycleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template cycle not found"));
        List<KpiTemplateCycleForm> links = cycleFormRepository.findWithFormsByCycleId(id);
        return toDetailDto(cycle, links);
    }

    @Override
    @Transactional
    public KpiTemplateCycleResponseDTO updateStatus(Integer id, boolean active) {
        KpiTemplateCycle cycle = cycleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template cycle not found"));

        if (active) {
            if (cycle.getStatus() == KpiTemplateCycleStatus.ACTIVE) {
                return getById(id);
            }
            cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);
        } else {
            if (cycle.getStatus() != KpiTemplateCycleStatus.ACTIVE) {
                if (cycle.getStatus() == KpiTemplateCycleStatus.DEACTIVATED) {
                    return getById(id);
                }
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "Only active cycles can be deactivated."
                );
            }
            cycle.setStatus(KpiTemplateCycleStatus.DEACTIVATED);
        }

        cycle.setUpdatedByUser(currentUser());
        cycleRepository.save(cycle);
        cycleRepository.flush();
        if (active) {
            employeeKpiWorkflowService.useCycleForAllActiveDepartments(id);
        }
        return getById(id);
    }

    private void validateRequest(KpiTemplateCycleRequestDTO dto) {
        if (dto.getCycleName() == null || dto.getCycleName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cycle name is required.");
        }
        if (dto.getStartDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date is required.");
        }
        if (dto.getDurationMonths() == null || !ALLOWED_DURATION_MONTHS.contains(dto.getDurationMonths())) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Duration must be between 3 and 12 months."
            );
        }
        if (dto.getKpiFormIds() == null || dto.getKpiFormIds().isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select at least one KPI form.");
        }
    }

    private void applyForms(KpiTemplateCycle cycle, List<Integer> kpiFormIds) {
        List<Integer> distinctIds = kpiFormIds.stream().distinct().toList();
        Map<Integer, KpiForm> formsById = new LinkedHashMap<>();
        for (Integer formId : distinctIds) {
            KpiForm form = kpiFormRepository.findById(formId)
                    .orElseThrow(() -> new ResponseStatusException(
                            HttpStatus.BAD_REQUEST,
                            "KPI form not found: " + formId
                    ));
            formsById.put(formId, form);
        }
        for (KpiForm form : formsById.values()) {
            KpiTemplateCycleForm link = KpiTemplateCycleForm.builder()
                    .cycle(cycle)
                    .kpiForm(form)
                    .build();
            cycle.getCycleForms().add(link);
        }
    }

    private LocalDate calculateEndDate(LocalDate startDate, int durationMonths) {
        return startDate.plusMonths(durationMonths).minusDays(1);
    }

    private String durationLabel(int months) {
        if (months == 12) {
            return "1 year";
        }
        return months + " months";
    }

    private KpiTemplateCycleResponseDTO toSummaryDto(KpiTemplateCycle cycle) {
        List<KpiTemplateCycleForm> links = cycleFormRepository.findWithFormsByCycleId(cycle.getId());
        return toDetailDto(cycle, links);
    }

    private KpiTemplateCycleResponseDTO toDetailDto(KpiTemplateCycle cycle, List<KpiTemplateCycleForm> links) {
        List<KpiTemplateCycleResponseDTO.KpiFormSummaryDTO> forms = links.stream()
                .map(link -> KpiTemplateCycleResponseDTO.KpiFormSummaryDTO.builder()
                        .id(link.getKpiForm().getId())
                        .title(link.getKpiForm().getTitle())
                        .build())
                .toList();

        return KpiTemplateCycleResponseDTO.builder()
                .id(cycle.getId())
                .cycleName(cycle.getCycleName())
                .startDate(cycle.getStartDate())
                .endDate(cycle.getEndDate())
                .durationMonths(cycle.getDurationMonths())
                .durationLabel(durationLabel(cycle.getDurationMonths()))
                .status(cycle.getStatus())
                .createdAt(cycle.getCreatedAt())
                .updatedAt(cycle.getUpdatedAt())
                .kpiForms(forms)
                .build();
    }

    private User currentUser() {
        return userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
