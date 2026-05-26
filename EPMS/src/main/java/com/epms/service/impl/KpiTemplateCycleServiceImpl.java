package com.epms.service.impl;

import com.epms.dto.KpiTemplateCycleRequestDTO;
import com.epms.dto.KpiTemplateCycleResponseDTO;
import com.epms.dto.KpiTemplateCycleStatusRequestDTO;
import com.epms.entity.KpiForm;
import com.epms.entity.KpiTemplateCycle;
import com.epms.entity.KpiTemplateCycleForm;
import com.epms.entity.KpiTemplateCyclePeriod;
import com.epms.entity.User;
import com.epms.entity.enums.KpiEarlyCloseReviewDecision;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.entity.enums.KpiGraceExtension;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.repository.KpiFormRepository;
import com.epms.repository.KpiTemplateCycleFormRepository;
import com.epms.repository.KpiTemplateCyclePeriodRepository;
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
import java.time.LocalDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Service
@RequiredArgsConstructor
public class KpiTemplateCycleServiceImpl implements KpiTemplateCycleService {

    private static final Set<Integer> ALLOWED_DURATION_YEARS = Set.of(1, 2, 3, 4, 5);

    private final KpiTemplateCycleRepository cycleRepository;
    private final KpiTemplateCycleFormRepository cycleFormRepository;
    private final KpiTemplateCyclePeriodRepository cyclePeriodRepository;
    private final KpiFormRepository kpiFormRepository;
    private final UserRepository userRepository;
    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @Override
    @Transactional
    public KpiTemplateCycleResponseDTO create(KpiTemplateCycleRequestDTO dto) {
        validateRequest(dto);
        User author = currentUser();
        Integer durationYears = normalizedDurationYears(dto);
        LocalDate endDate = calculateEndDate(dto.getStartDate(), durationYears);

        KpiTemplateCycle cycle = KpiTemplateCycle.builder()
                .cycleName(dto.getCycleName().trim())
                .startDate(dto.getStartDate())
                .endDate(endDate)
                .durationMonths(durationYears * 12)
                .durationYears(durationYears)
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
        Integer durationYears = normalizedDurationYears(dto);
        cycle.setDurationYears(durationYears);
        cycle.setDurationMonths(durationYears * 12);
        cycle.setEndDate(calculateEndDate(dto.getStartDate(), durationYears));
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
    public KpiTemplateCycleResponseDTO updateStatus(Integer id, KpiTemplateCycleStatusRequestDTO request) {
        KpiTemplateCycle cycle = cycleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template cycle not found"));
        boolean active = Boolean.TRUE.equals(request.getActive());

        if (active) {
            if (cycle.getStatus() == KpiTemplateCycleStatus.ACTIVE) {
                return getById(id);
            }
            if (cycle.getStatus() == KpiTemplateCycleStatus.CLOSING
                    || cycle.getStatus() == KpiTemplateCycleStatus.PENDING_APPROVAL) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "This cycle cannot be activated from its current status.");
            }
            cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);
            cycle.setClosingRequestedAt(null);
            cycle.setGraceEndsAt(null);
            cycle.setClosedAt(null);
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
            if (isBeforeOfficialEndDate(cycle)) {
                requestEarlyClose(cycle, request);
                cycleRepository.save(cycle);
                return getById(id);
            }
        }

        cycle.setUpdatedByUser(currentUser());
        cycleRepository.save(cycle);
        cycleRepository.flush();
        if (active) {
            employeeKpiWorkflowService.useCycleForAllActiveDepartments(id);
        } else {
            employeeKpiWorkflowService.startCycleClosingGrace(id);
        }
        return getById(id);
    }

    @Override
    @Transactional(readOnly = true)
    public List<KpiTemplateCycleResponseDTO> listPendingEarlyCloseRequests() {
        return cycleRepository
                .findByStatusOrderByEarlyCloseRequestedAtAsc(KpiTemplateCycleStatus.PENDING_APPROVAL)
                .stream()
                .map(this::toSummaryDto)
                .toList();
    }

    @Override
    @Transactional
    public KpiTemplateCycleResponseDTO approveEarlyClose(Integer id, String reviewReason) {
        KpiTemplateCycle cycle = requirePendingApproval(id);
        User reviewer = currentUser();
        LocalDateTime now = LocalDateTime.now();
        KpiGraceExtension extension = cycle.getGraceExtension();
        if (extension == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grace period extension is missing.");
        }

        cycle.setEarlyCloseReviewedAt(now);
        cycle.setEarlyCloseReviewedByUser(reviewer);
        cycle.setEarlyCloseReviewDecision(KpiEarlyCloseReviewDecision.APPROVED);
        cycle.setEarlyCloseReviewReason(normalizeText(reviewReason, 1000));
        cycle.setUpdatedByUser(reviewer);
        cycleRepository.save(cycle);
        cycleRepository.flush();

        employeeKpiWorkflowService.startCycleClosingGrace(id, extension.addTo(now));
        return getById(id);
    }

    @Override
    @Transactional
    public KpiTemplateCycleResponseDTO rejectEarlyClose(Integer id, String reviewReason) {
        KpiTemplateCycle cycle = requirePendingApproval(id);
        User reviewer = currentUser();
        cycle.setStatus(KpiTemplateCycleStatus.ACTIVE);
        cycle.setEarlyCloseReviewedAt(LocalDateTime.now());
        cycle.setEarlyCloseReviewedByUser(reviewer);
        cycle.setEarlyCloseReviewDecision(KpiEarlyCloseReviewDecision.REJECTED);
        cycle.setEarlyCloseReviewReason(normalizeText(reviewReason, 1000));
        cycle.setClosingRequestedAt(null);
        cycle.setGraceEndsAt(null);
        cycle.setClosedAt(null);
        cycle.setUpdatedByUser(reviewer);
        cycleRepository.save(cycle);
        return getById(id);
    }

    private KpiTemplateCycle requirePendingApproval(Integer id) {
        KpiTemplateCycle cycle = cycleRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template cycle not found"));
        if (cycle.getStatus() != KpiTemplateCycleStatus.PENDING_APPROVAL) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "No pending KPI early close request exists for this cycle.");
        }
        return cycle;
    }

    private void requestEarlyClose(KpiTemplateCycle cycle, KpiTemplateCycleStatusRequestDTO request) {
        String reason = normalizeText(request.getReason(), 1000);
        if (reason == null || reason.isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason is required to request early cycle closure.");
        }
        if (request.getGraceExtension() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Grace period extension is required.");
        }
        cycle.setStatus(KpiTemplateCycleStatus.PENDING_APPROVAL);
        cycle.setEarlyCloseReason(reason);
        cycle.setGraceExtension(request.getGraceExtension());
        cycle.setEarlyCloseRequestedAt(LocalDateTime.now());
        cycle.setEarlyCloseRequestedByUser(currentUser());
        cycle.setEarlyCloseReviewedAt(null);
        cycle.setEarlyCloseReviewedByUser(null);
        cycle.setEarlyCloseReviewDecision(null);
        cycle.setEarlyCloseReviewReason(null);
        cycle.setUpdatedByUser(cycle.getEarlyCloseRequestedByUser());
    }

    private boolean isBeforeOfficialEndDate(KpiTemplateCycle cycle) {
        LocalDate officialEnd = cyclePeriodRepository
                .findTopByCycle_IdAndStatusInOrderByPeriodNumberDesc(
                        cycle.getId(),
                        List.of(KpiTemplateCyclePeriodStatus.OPEN, KpiTemplateCyclePeriodStatus.CLOSING)
                )
                .map(KpiTemplateCyclePeriod::getEndDate)
                .orElse(cycle.getEndDate());
        return officialEnd != null && LocalDate.now().isBefore(officialEnd);
    }

    private void validateRequest(KpiTemplateCycleRequestDTO dto) {
        if (dto.getCycleName() == null || dto.getCycleName().isBlank()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cycle name is required.");
        }
        if (dto.getStartDate() == null) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Start date is required.");
        }
        Integer durationYears = normalizedDurationYears(dto);
        if (!ALLOWED_DURATION_YEARS.contains(durationYears)) {
            throw new ResponseStatusException(
                    HttpStatus.BAD_REQUEST,
                    "Cycle period must be between 1 and 5 years."
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
            if (form.getStatus() != KpiFormStatus.ACTIVE) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "KPI template cycles can only use active KPI forms: " + form.getTitle()
                );
            }
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

    private Integer normalizedDurationYears(KpiTemplateCycleRequestDTO dto) {
        if (dto.getDurationYears() != null) {
            return dto.getDurationYears();
        }
        if (dto.getDurationMonths() != null) {
            return Math.max(1, Math.min(5, (int) Math.ceil(dto.getDurationMonths() / 12.0)));
        }
        return null;
    }

    private LocalDate calculateEndDate(LocalDate startDate, int durationYears) {
        return startDate.plusYears(durationYears).minusDays(1);
    }

    private String durationLabel(int years) {
        return years == 1 ? "1 year" : years + " years";
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
        KpiTemplateCyclePeriod currentPeriod = cyclePeriodRepository
                .findTopByCycle_IdOrderByPeriodNumberDesc(cycle.getId())
                .orElse(null);
        Integer durationYears = responseDurationYears(cycle);

        return KpiTemplateCycleResponseDTO.builder()
                .id(cycle.getId())
                .cycleName(cycle.getCycleName())
                .startDate(cycle.getStartDate())
                .endDate(cycle.getEndDate())
                .durationMonths(cycle.getDurationMonths())
                .durationYears(durationYears)
                .durationLabel(durationLabel(durationYears))
                .status(cycle.getStatus())
                .currentPeriodId(currentPeriod != null ? currentPeriod.getId() : null)
                .currentPeriodNumber(currentPeriod != null ? currentPeriod.getPeriodNumber() : null)
                .currentPeriodStartDate(currentPeriod != null ? currentPeriod.getStartDate() : null)
                .currentPeriodEndDate(currentPeriod != null ? currentPeriod.getEndDate() : null)
                .closingRequestedAt(cycle.getClosingRequestedAt())
                .graceEndsAt(cycle.getGraceEndsAt())
                .closedAt(cycle.getClosedAt())
                .earlyCloseReason(cycle.getEarlyCloseReason())
                .graceExtension(cycle.getGraceExtension())
                .earlyCloseRequestedAt(cycle.getEarlyCloseRequestedAt())
                .earlyCloseRequestedByUserId(cycle.getEarlyCloseRequestedByUser() != null ? cycle.getEarlyCloseRequestedByUser().getId() : null)
                .earlyCloseRequestedByName(displayUser(cycle.getEarlyCloseRequestedByUser()))
                .earlyCloseReviewedAt(cycle.getEarlyCloseReviewedAt())
                .earlyCloseReviewedByUserId(cycle.getEarlyCloseReviewedByUser() != null ? cycle.getEarlyCloseReviewedByUser().getId() : null)
                .earlyCloseReviewedByName(displayUser(cycle.getEarlyCloseReviewedByUser()))
                .earlyCloseReviewDecision(cycle.getEarlyCloseReviewDecision())
                .earlyCloseReviewReason(cycle.getEarlyCloseReviewReason())
                .createdAt(cycle.getCreatedAt())
                .updatedAt(cycle.getUpdatedAt())
                .kpiForms(forms)
                .build();
    }

    private Integer responseDurationYears(KpiTemplateCycle cycle) {
        if (cycle.getDurationYears() != null && ALLOWED_DURATION_YEARS.contains(cycle.getDurationYears())) {
            return cycle.getDurationYears();
        }
        if (cycle.getDurationMonths() != null) {
            return Math.max(1, Math.min(5, (int) Math.ceil(cycle.getDurationMonths() / 12.0)));
        }
        return 1;
    }

    private String normalizeText(String value, int maxLength) {
        if (value == null) {
            return null;
        }
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            return null;
        }
        return normalized.length() > maxLength ? normalized.substring(0, maxLength) : normalized;
    }

    private String displayUser(User user) {
        if (user == null) {
            return null;
        }
        if (user.getFullName() != null && !user.getFullName().isBlank()) {
            return user.getFullName();
        }
        return user.getEmail();
    }

    private User currentUser() {
        return userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));
    }
}
