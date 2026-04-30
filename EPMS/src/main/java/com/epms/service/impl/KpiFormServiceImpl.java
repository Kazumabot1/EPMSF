package com.epms.service.impl;

import com.epms.dto.KpiFormItemDTO;
import com.epms.dto.KpiFormRequestDTO;
import com.epms.dto.KpiFormResponseDTO;
import com.epms.entity.*;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.repository.*;
import com.epms.security.SecurityUtils;
import com.epms.service.KpiFormService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class KpiFormServiceImpl implements KpiFormService {

    private final KpiFormRepository kpiFormRepository;
    private final KpiPositionRepository kpiPositionRepository;
    private final PositionRepository positionRepository;
    private final KpiCategoryRepository kpiCategoryRepository;
    private final KpiUnitRepository kpiUnitRepository;
    private final KpiItemRepository kpiItemRepository;
    private final UserRepository userRepository;
    private final EmployeeKpiFormRepository employeeKpiFormRepository;

    @Override
    @Transactional
    public KpiFormResponseDTO createTemplate(KpiFormRequestDTO dto) {
        validateDates(dto);
        validateItems(dto.getItems());
        KpiFormStatus status = dto.getStatus() != null ? dto.getStatus() : KpiFormStatus.DRAFT;
        validateWeights(status, dto.getItems());

        User author = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        KpiForm form = KpiForm.builder()
                .title(dto.getTitle().trim())
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .status(status)
                .createdByUser(author)
                .createdBy(author.getEmail())
                .build();

        applyPositions(form, dto.getPositionIds());
        applyItems(form, dto.getItems());

        KpiForm saved = kpiFormRepository.save(form);
        // Ensure INSERT is flushed before the follow-up load query (avoids edge-case visibility issues).
        kpiFormRepository.flush();
        return getTemplateById(saved.getId());
    }

    @Override
    @Transactional
    public KpiFormResponseDTO updateTemplate(Integer id, KpiFormRequestDTO dto) {
        validateDates(dto);
        validateItems(dto.getItems());
        KpiFormStatus status = dto.getStatus() != null ? dto.getStatus() : KpiFormStatus.DRAFT;
        validateWeights(status, dto.getItems());

        KpiForm form = kpiFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found"));

        User editor = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        form.setTitle(dto.getTitle().trim());
        form.setStartDate(dto.getStartDate());
        form.setEndDate(dto.getEndDate());
        form.setStatus(status);
        form.setUpdatedByUser(editor);

        form.getItems().clear();
        form.getKpiPositions().clear();

        applyPositions(form, dto.getPositionIds());
        applyItems(form, dto.getItems());

        kpiFormRepository.save(form);
        return getTemplateById(id);
    }

    @Override
    @Transactional
    public void deleteTemplate(Integer id) {
        if (employeeKpiFormRepository.countByKpiForm_Id(id) > 0) {
            throw new ResponseStatusException(
                    HttpStatus.CONFLICT,
                    "Cannot delete this KPI template because employees are already assigned."
            );
        }
        KpiForm form = kpiFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found"));
        kpiFormRepository.delete(form);
    }

    @Override
    @Transactional(readOnly = true)
    public List<KpiFormResponseDTO> getAllTemplates() {
        return kpiFormRepository.findAllByOrderByCreatedAtDesc().stream()
                .map(this::toSummaryDto)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public KpiFormResponseDTO getTemplateById(Integer id) {
        KpiForm form = kpiFormRepository.findDetailWithItemsById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found"));
        List<KpiPosition> links = kpiPositionRepository.findWithPositionByKpiForm_Id(id);
        return toDetailDto(form, links);
    }

    private KpiFormResponseDTO toSummaryDto(KpiForm form) {
        return KpiFormResponseDTO.builder()
                .id(form.getId())
                .title(form.getTitle())
                .startDate(form.getStartDate())
                .endDate(form.getEndDate())
                .status(form.getStatus())
                .version(form.getVersion())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .createdBy(form.getCreatedBy())
                .createdByUserId(form.getCreatedByUser() != null ? form.getCreatedByUser().getId() : null)
                .positions(new ArrayList<>())
                .items(new ArrayList<>())
                .build();
    }

    private KpiFormResponseDTO toDetailDto(KpiForm form, List<KpiPosition> links) {
        List<KpiFormResponseDTO.KpiPositionSummaryDTO> positions = links.stream()
                .map(kp -> KpiFormResponseDTO.KpiPositionSummaryDTO.builder()
                        .id(kp.getId())
                        .positionId(kp.getPosition().getId())
                        .positionTitle(kp.getPosition().getPositionTitle())
                        .build())
                .toList();

        List<KpiFormItemDTO> rows = form.getItems().stream()
                .sorted((a, b) -> {
                    int sa = a.getSortOrder() != null ? a.getSortOrder() : 0;
                    int sb = b.getSortOrder() != null ? b.getSortOrder() : 0;
                    return Integer.compare(sa, sb);
                })
                .map(this::toItemDto)
                .toList();

        return KpiFormResponseDTO.builder()
                .id(form.getId())
                .title(form.getTitle())
                .startDate(form.getStartDate())
                .endDate(form.getEndDate())
                .status(form.getStatus())
                .version(form.getVersion())
                .createdAt(form.getCreatedAt())
                .updatedAt(form.getUpdatedAt())
                .createdBy(form.getCreatedBy())
                .createdByUserId(form.getCreatedByUser() != null ? form.getCreatedByUser().getId() : null)
                .positions(positions)
                .items(rows)
                .build();
    }

    private KpiFormItemDTO toItemDto(KpiFormItem item) {
        KpiItem ki = item.getKpiItem();
        KpiCategory cat = item.getKpiCategory();
        KpiUnit unit = item.getKpiUnit();

        return KpiFormItemDTO.builder()
                .id(item.getId())
                .kpiLabel(item.getKpiLabel())
                .kpiItemId(ki != null ? ki.getId() : null)
                .kpiItemName(ki != null ? ki.getName() : null)
                .kpiCategoryId(cat != null ? cat.getId() : null)
                .kpiCategoryName(cat != null ? cat.getName() : null)
                .kpiUnitId(unit != null ? unit.getId() : null)
                .kpiUnitName(unit != null ? unit.getName() : null)
                .target(item.getTarget())
                .weight(item.getWeight())
                .sortOrder(item.getSortOrder())
                .actual(null)
                .score(null)
                .weightedScore(null)
                .build();
    }

    private void validateDates(KpiFormRequestDTO dto) {
        if (dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date must be on or after the start date.");
        }
    }

    private void validateItems(List<KpiFormItemDTO> items) {
        if (items == null || items.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "At least one KPI row is required.");
        }
        for (int i = 0; i < items.size(); i++) {
            KpiFormItemDTO row = items.get(i);
            boolean hasMasterItem = row.getKpiItemId() != null;
            boolean hasLabel = row.getKpiLabel() != null && !row.getKpiLabel().isBlank();
            if (!hasMasterItem && !hasLabel) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Row " + (i + 1) + ": enter a KPI name or select a KPI item.");
            }
            if (row.getKpiCategoryId() == null || row.getKpiUnitId() == null || row.getTarget() == null || row.getWeight() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Row " + (i + 1) + ": category, unit, target, and weight are required.");
            }
        }
    }

    private void validateWeights(KpiFormStatus status, List<KpiFormItemDTO> items) {
        int total = items.stream()
                .mapToInt(r -> r.getWeight() == null ? 0 : r.getWeight())
                .sum();
        if ((status == KpiFormStatus.ACTIVE || status == KpiFormStatus.FINALIZED) && total != 100) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Total weight must equal 100% before status can be ACTIVE or FINALIZED.");
        }
    }

    private void applyPositions(KpiForm form, List<Integer> positionIds) {
        if (positionIds == null || positionIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select at least one position.");
        }
        List<Integer> distinctIds = positionIds.stream().distinct().toList();
        for (Integer pid : distinctIds) {
            Position position = positionRepository.findById(pid)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Position not found: " + pid));
            KpiPosition link = KpiPosition.builder()
                    .kpiForm(form)
                    .position(position)
                    .build();
            form.getKpiPositions().add(link);
        }
    }

    private void applyItems(KpiForm form, List<KpiFormItemDTO> rows) {
        for (int i = 0; i < rows.size(); i++) {
            KpiFormItemDTO row = rows.get(i);

            KpiCategory category = kpiCategoryRepository.findById(row.getKpiCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI category not found."));
            KpiUnit unit = kpiUnitRepository.findById(row.getKpiUnitId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI unit not found."));

            KpiItem masterItem = null;
            if (row.getKpiItemId() != null) {
                masterItem = kpiItemRepository.findById(row.getKpiItemId())
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI item not found."));
            }

            String label = row.getKpiLabel() != null ? row.getKpiLabel().trim() : null;

            KpiFormItem entity = KpiFormItem.builder()
                    .kpiForm(form)
                    .kpiCategory(category)
                    .kpiUnit(unit)
                    .kpiItem(masterItem)
                    .kpiLabel(masterItem == null ? label : null)
                    .target(row.getTarget())
                    .weight(row.getWeight())
                    .sortOrder(row.getSortOrder() != null ? row.getSortOrder() : i)
                    .build();

            form.addItem(entity);
        }
    }
}
