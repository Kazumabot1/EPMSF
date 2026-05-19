package com.epms.service.impl;

import com.epms.dto.KpiFormItemDTO;
import com.epms.dto.KpiFormRequestDTO;
import com.epms.dto.KpiFormResponseDTO;
import com.epms.dto.KpiPositionAssignmentDto;
import com.epms.dto.KpiPositionAvailabilityDto;
import com.epms.dto.PositionResponseDto;
import com.epms.entity.*;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.entity.enums.KpiPositionStatus;
import com.epms.repository.*;
import com.epms.exception.KpiTemplatePositionConflictException;
import com.epms.security.SecurityUtils;
import com.epms.service.KpiFormService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class KpiFormServiceImpl implements KpiFormService {

    private static final String KPI_POSITIONS_TABLE = "kpi_positions";

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
        validateItems(dto.getItems());
        KpiFormStatus status = dto.getStatus() != null ? dto.getStatus() : KpiFormStatus.DRAFT;
        validateWeights(status, dto.getItems());

        User author = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        Integer existingTemplateId = findExistingTemplateIdForCreate(dto.getPositionIds());
        if (existingTemplateId != null) {
            log.info(
                    "POST /kpi-templates/create received occupied position; updating existing KPI template {} instead.",
                    existingTemplateId
            );
            return updateExistingTemplate(existingTemplateId, dto, status, author);
        }

        KpiForm form = KpiForm.builder()
                .title(dto.getTitle().trim())
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
        validateItems(dto.getItems());
        KpiFormStatus status = dto.getStatus() != null ? dto.getStatus() : KpiFormStatus.DRAFT;
        validateWeights(status, dto.getItems());

        User editor = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        return updateExistingTemplate(id, dto, status, editor);
    }

    private KpiFormResponseDTO updateExistingTemplate(
            Integer id,
            KpiFormRequestDTO dto,
            KpiFormStatus status,
            User editor
    ) {
        KpiForm form = kpiFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found"));

        form.setTitle(dto.getTitle().trim());
        form.setStatus(status);
        form.setUpdatedByUser(editor);

        form.getItems().clear();
        form.getKpiPositions().clear();
        // Orphan deletes must hit the database before we insert new links/rows, or MySQL can reject
        // duplicate (kpi_form_id, position_id) on kpi_positions (insert before delete in one flush).
        kpiFormRepository.flush();

        applyPositions(form, dto.getPositionIds());
        applyItems(form, dto.getItems());

        kpiFormRepository.save(form);
        return getTemplateById(id);
    }

    private Integer findExistingTemplateIdForCreate(List<Integer> positionIds) {
        if (positionIds == null || positionIds.isEmpty()) {
            return null;
        }
        List<Integer> distinctIds = positionIds.stream().distinct().toList();
        if (distinctIds.size() != 1) {
            return null;
        }
        return findOccupyingLink(distinctIds.get(0), null)
                .map(link -> link.getKpiForm().getId())
                .orElse(null);
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
                .map(form -> {
                    List<KpiPosition> links = kpiPositionRepository.findWithPositionByKpiForm_Id(form.getId());
                    return toSummaryDto(form, links);
                })
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

    @Override
    @Transactional(readOnly = true)
    public List<Integer> getAssignedPositionIds(Integer excludeFormId) {
        return kpiPositionRepository.findAssignedPositionIds(excludeFormId);
    }

    @Override
    @Transactional(readOnly = true)
    public KpiFormResponseDTO getTemplateByPositionId(Integer positionId) {
        KpiPosition link = kpiPositionRepository.findWithFormByPositionId(positionId)
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "No KPI template is assigned to this position."
                ));
        return getTemplateById(link.getKpiForm().getId());
    }

    @Override
    @Transactional(readOnly = true)
    public List<KpiPositionAssignmentDto> getPositionAssignments(Integer excludeFormId) {
        return kpiPositionRepository.findActiveAssignments(excludeFormId).stream()
                .filter(kp -> kp.getPosition() != null && kp.getKpiForm() != null)
                .map(kp -> KpiPositionAssignmentDto.builder()
                        .positionId(kp.getPosition().getId())
                        .positionTitle(kp.getPosition().getPositionTitle())
                        .templateId(kp.getKpiForm().getId())
                        .templateTitle(kp.getKpiForm().getTitle())
                        .build())
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public KpiPositionAvailabilityDto checkPositionAvailability(Integer positionId, Integer excludeFormId) {
        Optional<KpiPosition> existingLink = findOccupyingLink(positionId, excludeFormId);
        logDuplicateCheck(positionId, excludeFormId, existingLink);
        if (existingLink.isEmpty()) {
            return KpiPositionAvailabilityDto.builder().available(true).build();
        }
        KpiPosition link = existingLink.get();
        return KpiPositionAvailabilityDto.builder()
                .available(false)
                .existingTemplateId(link.getKpiForm().getId())
                .templateTitle(link.getKpiForm().getTitle())
                .positionTitle(link.getPosition().getPositionTitle())
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public List<PositionResponseDto> getAvailablePositions(Integer excludeFormId) {
        List<Position> positions = positionRepository.findAvailableForKpiTemplate(excludeFormId);
        log.info(
                "KPI template available-positions (table={}): excludeFormId={}, count={}",
                KPI_POSITIONS_TABLE,
                excludeFormId,
                positions.size()
        );
        return positions.stream().map(this::toPositionResponseDto).toList();
    }

    /**
     * Same lookup used by create/update duplicate guard and GET available-positions (via NOT EXISTS).
     */
    private Optional<KpiPosition> findOccupyingLink(Integer positionId, Integer excludeFormId) {
        return excludeFormId == null
                ? kpiPositionRepository.findWithFormByPositionId(positionId)
                : kpiPositionRepository.findWithFormByPositionIdExcludingForm(positionId, excludeFormId);
    }

    private void logDuplicateCheck(Integer positionId, Integer excludeFormId, Optional<KpiPosition> existingLink) {
        if (existingLink.isEmpty()) {
            log.info(
                    "KPI template position check (table={}): positionId={}, available=true, excludeFormId={}",
                    KPI_POSITIONS_TABLE,
                    positionId,
                    excludeFormId
            );
            return;
        }
        Integer matchedTemplateId = existingLink.get().getKpiForm().getId();
        log.info(
                "Position {} already linked to KPI template {} (table={}, excludeFormId={})",
                positionId,
                matchedTemplateId,
                KPI_POSITIONS_TABLE,
                excludeFormId
        );
    }

    private PositionResponseDto toPositionResponseDto(Position position) {
        PositionLevel level = position.getLevel();
        return new PositionResponseDto(
                position.getId(),
                position.getPositionTitle(),
                level != null ? level.getId() : null,
                level != null ? level.getLevelCode() : null,
                position.getDescription(),
                position.getStatus(),
                position.getCreatedAt(),
                position.getCreatedBy()
        );
    }

    private KpiFormResponseDTO toSummaryDto(KpiForm form) {
        return toSummaryDto(form, List.of());
    }

    private KpiFormResponseDTO toSummaryDto(KpiForm form, List<KpiPosition> links) {
        List<KpiFormResponseDTO.KpiPositionSummaryDTO> positions = mapPositionSummaries(links);

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
                .createdByUserId(resolveCreatedByUserId(form))
                .positions(positions)
                .items(new ArrayList<>())
                .build();
    }

    private KpiFormResponseDTO toDetailDto(KpiForm form, List<KpiPosition> links) {
        List<KpiFormResponseDTO.KpiPositionSummaryDTO> positions = mapPositionSummaries(links);

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
                .createdByUserId(resolveCreatedByUserId(form))
                .positions(positions)
                .items(rows)
                .build();
    }

    private static Integer resolveCreatedByUserId(KpiForm form) {
        User creator = form.getCreatedByUser();
        return creator != null ? creator.getId() : null;
    }

    private static List<KpiFormResponseDTO.KpiPositionSummaryDTO> mapPositionSummaries(List<KpiPosition> links) {
        return links.stream()
                .filter(kp -> kp.getPosition() != null)
                .map(kp -> KpiFormResponseDTO.KpiPositionSummaryDTO.builder()
                        .id(kp.getId())
                        .positionId(kp.getPosition().getId())
                        .positionTitle(kp.getPosition().getPositionTitle())
                        .build())
                .toList();
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
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a position.");
        }
        List<Integer> distinctIds = positionIds.stream().distinct().toList();
        if (distinctIds.size() > 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only one position can be assigned per KPI form.");
        }
        Integer pid = distinctIds.get(0);
        Integer currentFormId = form.getId();
        Optional<KpiPosition> existingLink = findOccupyingLink(pid, currentFormId);
        logDuplicateCheck(pid, currentFormId, existingLink);
        if (existingLink.isPresent()) {
            Integer existingTemplateId = existingLink.get().getKpiForm().getId();
            throw new KpiTemplatePositionConflictException(
                    existingTemplateId,
                    "This position already has a KPI form. Choose another position or edit the existing form."
            );
        }
        Position position = positionRepository.findById(pid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Position not found: " + pid));
        KpiPosition link = KpiPosition.builder()
                .kpiForm(form)
                .position(position)
                .build();
        form.getKpiPositions().add(link);
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
