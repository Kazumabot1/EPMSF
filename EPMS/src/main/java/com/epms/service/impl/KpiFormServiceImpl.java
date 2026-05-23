package com.epms.service.impl;

import com.epms.dto.KpiFormItemDTO;
import com.epms.dto.KpiFormRequestDTO;
import com.epms.dto.KpiFormResponseDTO;
import com.epms.dto.KpiPositionAssignmentDto;
import com.epms.dto.KpiPositionAvailabilityDto;
import com.epms.dto.KpiVersionHistoryDetailDTO;
import com.epms.dto.KpiVersionHistorySummaryDTO;
import com.epms.dto.KpiVersionRowSnapshotDTO;
import com.epms.dto.PositionResponseDto;
import com.epms.entity.*;
import com.epms.entity.enums.KpiChangeType;
import com.epms.entity.enums.KpiFormStatus;
import com.epms.entity.enums.KpiVersionRowStatus;
import com.epms.repository.*;
import com.epms.exception.KpiTemplatePositionConflictException;
import com.epms.security.SecurityUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.epms.service.KpiFormService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

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
    private final KpiFormItemRepository kpiFormItemRepository;
    private final UserRepository userRepository;
    private final KpiVersionHistoryRepository kpiVersionHistoryRepository;
    private final KpiTemplateVersionRowRepository kpiTemplateVersionRowRepository;
    private final ObjectMapper objectMapper;

    @Override
    @Transactional
    public KpiFormResponseDTO createTemplate(KpiFormRequestDTO dto) {
        validateDates(dto);
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
                .startDate(dto.getStartDate())
                .endDate(dto.getEndDate())
                .status(status)
                .createdByUser(author)
                .createdBy(author.getEmail())
                .build();
        applyLifecycleTimestamps(form, status);

        applyPositions(form, dto.getPositionIds());
        applyItems(form, dto.getItems());

        KpiForm saved = kpiFormRepository.save(form);
        // Ensure INSERT is flushed before the follow-up load query (avoids edge-case visibility issues).
        kpiFormRepository.flush();
        ensureVersionSnapshot(saved, 1, new ArrayList<>(saved.getItems()), KpiVersionRowStatus.INITIAL, author);
        return getTemplateById(saved.getId());
    }

    @Override
    @Transactional
    public KpiFormResponseDTO updateTemplate(Integer id, KpiFormRequestDTO dto) {
        validateDates(dto);
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
        form.setStartDate(dto.getStartDate());
        form.setEndDate(dto.getEndDate());
        form.setStatus(status);
        form.setUpdatedByUser(editor);
        applyLifecycleTimestamps(form, status);

        Integer submittedPositionId = singleSubmittedPositionId(dto.getPositionIds());
        Integer currentPositionId = currentPositionId(form);
        boolean positionChanged = currentPositionId == null || !currentPositionId.equals(submittedPositionId);
        if (positionChanged) {
            validatePositionCanMoveTo(form, submittedPositionId);
        }

        List<KpiFormItem> existingItems = new ArrayList<>(form.getItems());
        RowDiff rowDiff = buildRowDiff(existingItems, dto);
        Integer previousVersionNumber = form.getVersion() == null ? 1 : form.getVersion();
        if (rowDiff.hasChanges()) {
            validateRowChangeReasons(rowDiff);
            ensureVersionSnapshot(form, previousVersionNumber, existingItems, previousVersionNumber == 1 ? KpiVersionRowStatus.INITIAL : KpiVersionRowStatus.UNCHANGED, editor);
            form.setVersion((form.getVersion() == null ? 1 : form.getVersion()) + 1);
        }
        Integer versionNumber = form.getVersion() == null ? 1 : form.getVersion();
        if (rowDiff.hasChanges()) {
            recordRowVersionHistory(form, rowDiff, editor, versionNumber);
        }

        if (positionChanged) {
            form.getKpiPositions().clear();
        }
        // Orphan deletes must hit the database before we insert new links/rows, or MySQL can reject
        // duplicate (kpi_form_id, position_id) on kpi_positions (insert before delete in one flush).
        kpiFormRepository.flush();

        if (positionChanged) {
            applyPositions(form, dto.getPositionIds());
        }
        syncItems(form, dto.getItems());

        kpiFormRepository.save(form);
        if (rowDiff.hasChanges()) {
            recordVersionCollection(form, rowDiff, dto.getItems(), editor, versionNumber);
        }
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
        KpiForm form = kpiFormRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found"));
        User editor = userRepository.findById(SecurityUtils.currentUserId())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "User not found"));

        form.setStatus(KpiFormStatus.ARCHIVED);
        form.setUpdatedByUser(editor);
        form.getKpiPositions().clear();
        kpiFormRepository.save(form);
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
    @Transactional
    public List<KpiVersionHistorySummaryDTO> getVersionHistory() {
        List<KpiForm> forms = kpiFormRepository.findAllByOrderByCreatedAtDesc();
        forms.forEach(this::ensureBaselineSnapshot);
        List<KpiVersionHistorySummaryDTO> summaries = new ArrayList<>(
                summarizeVersionRows(kpiTemplateVersionRowRepository.findAllByOrderByChangedAtDesc())
        );
        mergeMissingHistorySummaries(summaries, summarizeHistory(kpiVersionHistoryRepository.findAllByOrderByChangedAtDesc()));
        appendBaselineSummaries(summaries, forms);
        return sortVersionSummaries(summaries);
    }

    @Override
    @Transactional
    public List<KpiVersionHistorySummaryDTO> getTemplateVersions(Integer templateId) {
        KpiForm form = kpiFormRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found"));
        ensureBaselineSnapshot(form);
        List<KpiVersionHistorySummaryDTO> summaries = new ArrayList<>(
                summarizeVersionRows(kpiTemplateVersionRowRepository.findByKpiForm_IdOrderByVersionNumberDescChangedAtDesc(templateId))
        );
        mergeMissingHistorySummaries(summaries, summarizeHistory(kpiVersionHistoryRepository.findByKpiForm_IdOrderByVersionNumberDescChangedAtDesc(templateId)));
        appendBaselineSummaries(summaries, List.of(form));
        return sortVersionSummaries(summaries);
    }

    @Override
    @Transactional
    public KpiVersionHistoryDetailDTO getTemplateVersionDetail(Integer templateId, Integer versionNumber) {
        KpiForm form = kpiFormRepository.findById(templateId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found"));
        if (versionNumber == 1) {
            ensureBaselineSnapshot(form);
        }
        List<KpiTemplateVersionRow> collectionRows = kpiTemplateVersionRowRepository
                .findByKpiForm_IdAndVersionNumberOrderByIdAsc(templateId, versionNumber);
        if (!collectionRows.isEmpty()) {
            KpiTemplateVersionRow last = collectionRows.get(collectionRows.size() - 1);
            return KpiVersionHistoryDetailDTO.builder()
                    .templateId(form.getId())
                    .templateTitle(form.getTitle())
                    .versionNumber(versionNumber)
                    .versionTitle(versionTitle(form, versionNumber))
                    .positionName(positionName(form))
                    .createdAt(form.getCreatedAt())
                    .editedAt(last.getChangedAt())
                    .editedBy(displayUser(last))
                    .changes(collectionRows.stream()
                            .map(row -> KpiVersionHistoryDetailDTO.RowChangeDTO.builder()
                                    .historyId(row.getId())
                                    .changeType(changeTypeForStatus(row.getRowStatus()))
                                    .rowStatus(row.getRowStatus())
                                    .reason(row.getReason())
                                    .changedAt(row.getChangedAt())
                                    .changedBy(displayUser(row))
                                    .initialVersion(row.getRowStatus() == KpiVersionRowStatus.INITIAL)
                                    .row(readSnapshot(row))
                                    .build())
                            .toList())
                    .build();
        }
        List<KpiVersionHistory> rows = kpiVersionHistoryRepository
                .findByKpiForm_IdAndVersionNumberOrderByChangedAtAsc(templateId, versionNumber);
        if (rows.isEmpty()) {
            Integer fallbackVersion = form.getVersion() == null ? 1 : form.getVersion();
            if (!versionNumber.equals(fallbackVersion) && versionNumber != 1) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI version history not found");
            }
            KpiForm detailForm = kpiFormRepository.findDetailWithItemsById(templateId)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found"));
            return baselineDetail(detailForm, versionNumber);
        }
        KpiVersionHistory last = rows.get(rows.size() - 1);
        return KpiVersionHistoryDetailDTO.builder()
                .templateId(form.getId())
                .templateTitle(form.getTitle())
                .versionNumber(versionNumber)
                .versionTitle(versionTitle(form, versionNumber))
                .positionName(positionName(form))
                .createdAt(form.getCreatedAt())
                .editedAt(last.getChangedAt())
                .editedBy(displayUser(last))
                .changes(rows.stream()
                        .map(history -> KpiVersionHistoryDetailDTO.RowChangeDTO.builder()
                                .historyId(history.getId())
                                .changeType(history.getChangeType())
                                .rowStatus(history.getChangeType() == KpiChangeType.DELETED ? KpiVersionRowStatus.REMOVED : KpiVersionRowStatus.ADDED)
                                .reason(history.getChangedReason())
                                .changedAt(history.getChangedAt())
                                .changedBy(displayUser(history))
                                .row(readSnapshot(history))
                                .build())
                        .toList())
                .build();
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
                .finalizedAt(form.getFinalizedAt())
                .sentAt(form.getSentAt())
                .createdBy(form.getCreatedBy())
                .createdByUserId(resolveCreatedByUserId(form))
                .updatedByUserId(resolveUpdatedByUserId(form))
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
                .finalizedAt(form.getFinalizedAt())
                .sentAt(form.getSentAt())
                .createdBy(form.getCreatedBy())
                .createdByUserId(resolveCreatedByUserId(form))
                .updatedByUserId(resolveUpdatedByUserId(form))
                .positions(positions)
                .items(rows)
                .build();
    }

    private static Integer resolveCreatedByUserId(KpiForm form) {
        User creator = form.getCreatedByUser();
        return creator != null ? creator.getId() : null;
    }

    private static Integer resolveUpdatedByUserId(KpiForm form) {
        User updater = form.getUpdatedByUser();
        return updater != null ? updater.getId() : null;
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
                .kpiCategoryName(categoryDisplayName(item))
                .kpiCategoryLabel(item.getKpiCategoryLabel())
                .kpiUnitId(unit != null ? unit.getId() : null)
                .kpiUnitName(unitDisplayName(item))
                .kpiUnitLabel(item.getKpiUnitLabel())
                .target(item.getTarget())
                .weight(item.getWeight())
                .sortOrder(item.getSortOrder())
                .actual(null)
                .score(null)
                .weightedScore(null)
                .build();
    }

    private void ensureTemplateExists(Integer templateId) {
        if (!kpiFormRepository.existsById(templateId)) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND, "KPI template not found");
        }
    }

    private RowDiff buildRowDiff(List<KpiFormItem> existingItems, KpiFormRequestDTO dto) {
        Map<Integer, KpiFormItem> existingById = existingItems.stream()
                .filter(item -> item.getId() != null)
                .collect(Collectors.toMap(KpiFormItem::getId, Function.identity()));
        Set<Integer> submittedIds = dto.getItems().stream()
                .map(KpiFormItemDTO::getId)
                .filter(id -> id != null && existingById.containsKey(id))
                .collect(Collectors.toSet());
        List<KpiFormItemDTO> addedRows = dto.getItems().stream()
                .filter(row -> row.getId() == null || !existingById.containsKey(row.getId()))
                .toList();
        List<KpiFormItem> removedRows = existingItems.stream()
                .filter(item -> item.getId() != null && !submittedIds.contains(item.getId()))
                .toList();
        return new RowDiff(addedRows, removedRows, dto.getRemovedItemReasons());
    }

    private void validateRowChangeReasons(RowDiff rowDiff) {
        for (KpiFormItemDTO added : rowDiff.addedRows()) {
            if (isBlank(added.getChangeReason())) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason is required when adding KPI rows.");
            }
        }
        for (KpiFormItem removed : rowDiff.removedRows()) {
            String reason = rowDiff.removedReasons().get(removed.getId());
            if (isBlank(reason)) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Reason is required when removing KPI rows.");
            }
        }
    }

    private void recordRowVersionHistory(KpiForm form, RowDiff rowDiff, User editor, Integer versionNumber) {
        List<KpiVersionHistory> rows = new ArrayList<>();
        for (KpiFormItem removed : rowDiff.removedRows()) {
            String reason = rowDiff.removedReasons().get(removed.getId()).trim();
            rows.add(KpiVersionHistory.builder()
                    .kpiForm(form)
                    .columnName("items")
                    .oldValue(writeSnapshot(snapshot(removed)))
                    .changedReason(reason)
                    .modifiedByUser(editor)
                    .modifiedBy(displayUser(editor))
                    .versionNumber(versionNumber)
                    .changeType(KpiChangeType.DELETED)
                    .build());
        }
        for (KpiFormItemDTO added : rowDiff.addedRows()) {
            String reason = added.getChangeReason().trim();
            rows.add(KpiVersionHistory.builder()
                    .kpiForm(form)
                    .columnName("items")
                    .newValue(writeSnapshot(snapshot(added)))
                    .changedReason(reason)
                    .modifiedByUser(editor)
                    .modifiedBy(displayUser(editor))
                    .versionNumber(versionNumber)
                    .changeType(KpiChangeType.CREATED)
                    .build());
        }
        kpiVersionHistoryRepository.saveAll(rows);
    }

    private void ensureVersionSnapshot(
            KpiForm form,
            Integer versionNumber,
            List<KpiFormItem> items,
            KpiVersionRowStatus rowStatus,
            User actor
    ) {
        if (form.getId() == null || kpiTemplateVersionRowRepository.existsByKpiForm_IdAndVersionNumber(form.getId(), versionNumber)) {
            return;
        }
        List<KpiTemplateVersionRow> rows = items.stream()
                .sorted(Comparator.comparing(item -> item.getSortOrder() == null ? 0 : item.getSortOrder()))
                .map(item -> versionRow(
                        form,
                        versionNumber,
                        rowStatus,
                        snapshot(item),
                        rowStatus == KpiVersionRowStatus.INITIAL ? "Initial template version" : null,
                        form.getCreatedAt(),
                        actor
                ))
                .toList();
        kpiTemplateVersionRowRepository.saveAll(rows);
    }

    private void ensureBaselineSnapshot(KpiForm form) {
        if (form.getId() == null || kpiTemplateVersionRowRepository.existsByKpiForm_IdAndVersionNumber(form.getId(), 1)) {
            return;
        }
        KpiForm detailForm = kpiFormRepository.findDetailWithItemsById(form.getId()).orElse(form);
        ensureVersionSnapshot(
                detailForm,
                1,
                new ArrayList<>(detailForm.getItems()),
                KpiVersionRowStatus.INITIAL,
                detailForm.getCreatedByUser()
        );
    }

    private void recordVersionCollection(
            KpiForm form,
            RowDiff rowDiff,
            List<KpiFormItemDTO> submittedRows,
            User editor,
            Integer versionNumber
    ) {
        if (form.getId() == null || kpiTemplateVersionRowRepository.existsByKpiForm_IdAndVersionNumber(form.getId(), versionNumber)) {
            return;
        }
        Set<Integer> removedIds = rowDiff.removedRows().stream()
                .map(KpiFormItem::getId)
                .collect(Collectors.toSet());
        List<KpiTemplateVersionRow> rows = new ArrayList<>();
        for (KpiFormItemDTO submitted : submittedRows) {
            KpiVersionRowStatus status = submitted.getId() == null
                    || removedIds.contains(submitted.getId())
                    || rowDiff.addedRows().contains(submitted)
                    ? KpiVersionRowStatus.ADDED
                    : KpiVersionRowStatus.UNCHANGED;
            String reason = status == KpiVersionRowStatus.ADDED ? submitted.getChangeReason() : null;
            rows.add(versionRow(form, versionNumber, status, snapshot(submitted), reason, LocalDateTime.now(), editor));
        }
        for (KpiFormItem removed : rowDiff.removedRows()) {
            rows.add(versionRow(
                    form,
                    versionNumber,
                    KpiVersionRowStatus.REMOVED,
                    snapshot(removed),
                    rowDiff.removedReasons().get(removed.getId()),
                    LocalDateTime.now(),
                    editor
            ));
        }
        kpiTemplateVersionRowRepository.saveAll(rows);
    }

    private KpiTemplateVersionRow versionRow(
            KpiForm form,
            Integer versionNumber,
            KpiVersionRowStatus status,
            KpiVersionRowSnapshotDTO snapshot,
            String reason,
            LocalDateTime changedAt,
            User actor
    ) {
        return KpiTemplateVersionRow.builder()
                .kpiForm(form)
                .versionNumber(versionNumber)
                .rowStatus(status)
                .rowSnapshot(writeSnapshot(snapshot))
                .reason(reason)
                .changedAt(changedAt)
                .changedByUser(actor)
                .changedBy(displayUser(actor))
                .build();
    }

    private List<KpiVersionHistorySummaryDTO> summarizeVersionRows(List<KpiTemplateVersionRow> rows) {
        Map<String, List<KpiTemplateVersionRow>> grouped = rows.stream()
                .filter(row -> row.getKpiForm() != null && row.getVersionNumber() != null)
                .collect(Collectors.groupingBy(
                        row -> row.getKpiForm().getId() + ":" + row.getVersionNumber(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        return grouped.values().stream()
                .map(group -> {
                    KpiTemplateVersionRow first = group.get(0);
                    KpiTemplateVersionRow latest = group.stream()
                            .max(Comparator.comparing(KpiTemplateVersionRow::getChangedAt))
                            .orElse(first);
                    KpiForm form = first.getKpiForm();
                    return KpiVersionHistorySummaryDTO.builder()
                            .templateId(form.getId())
                            .templateTitle(form.getTitle())
                            .versionNumber(first.getVersionNumber())
                            .versionTitle(versionTitle(form, first.getVersionNumber()))
                            .positionName(positionName(form))
                            .createdAt(form.getCreatedAt())
                            .editedAt(latest.getChangedAt())
                            .editedBy(displayUser(latest))
                            .changeCount((int) group.stream()
                                    .filter(row -> row.getRowStatus() == KpiVersionRowStatus.ADDED || row.getRowStatus() == KpiVersionRowStatus.REMOVED)
                                    .count())
                            .build();
                })
                .toList();
    }

    private void mergeMissingHistorySummaries(
            List<KpiVersionHistorySummaryDTO> target,
            List<KpiVersionHistorySummaryDTO> candidates
    ) {
        Set<String> existingKeys = target.stream()
                .map(summary -> summary.getTemplateId() + ":" + summary.getVersionNumber())
                .collect(Collectors.toSet());
        for (KpiVersionHistorySummaryDTO candidate : candidates) {
            String key = candidate.getTemplateId() + ":" + candidate.getVersionNumber();
            if (!existingKeys.contains(key)) {
                target.add(candidate);
                existingKeys.add(key);
            }
        }
    }

    private List<KpiVersionHistorySummaryDTO> summarizeHistory(List<KpiVersionHistory> historyRows) {
        Map<String, List<KpiVersionHistory>> grouped = historyRows.stream()
                .filter(row -> row.getKpiForm() != null && row.getVersionNumber() != null)
                .collect(Collectors.groupingBy(
                        row -> row.getKpiForm().getId() + ":" + row.getVersionNumber(),
                        LinkedHashMap::new,
                        Collectors.toList()
                ));
        return grouped.values().stream()
                .map(rows -> {
                    KpiVersionHistory first = rows.get(0);
                    KpiVersionHistory latest = rows.stream()
                            .max(Comparator.comparing(KpiVersionHistory::getChangedAt))
                            .orElse(first);
                    KpiForm form = first.getKpiForm();
                    return KpiVersionHistorySummaryDTO.builder()
                            .templateId(form.getId())
                            .templateTitle(form.getTitle())
                            .versionNumber(first.getVersionNumber())
                            .versionTitle(versionTitle(form, first.getVersionNumber()))
                            .positionName(positionName(form))
                            .createdAt(form.getCreatedAt())
                            .editedAt(latest.getChangedAt())
                            .editedBy(displayUser(latest))
                            .changeCount(rows.size())
                            .build();
                })
                .toList();
    }

    private void appendBaselineSummaries(List<KpiVersionHistorySummaryDTO> summaries, List<KpiForm> forms) {
        Set<String> existingKeys = summaries.stream()
                .map(summary -> summary.getTemplateId() + ":" + summary.getVersionNumber())
                .collect(Collectors.toSet());
        for (KpiForm form : forms) {
            appendBaselineSummary(summaries, existingKeys, form, 1);
            Integer currentVersion = form.getVersion() == null ? 1 : form.getVersion();
            if (currentVersion > 1) {
                appendBaselineSummary(summaries, existingKeys, form, currentVersion);
            }
        }
    }

    private void appendBaselineSummary(
            List<KpiVersionHistorySummaryDTO> summaries,
            Set<String> existingKeys,
            KpiForm form,
            Integer versionNumber
    ) {
        String key = form.getId() + ":" + versionNumber;
        if (existingKeys.contains(key)) {
            return;
        }
        summaries.add(KpiVersionHistorySummaryDTO.builder()
                .templateId(form.getId())
                .templateTitle(form.getTitle())
                .versionNumber(versionNumber)
                .versionTitle(versionTitle(form, versionNumber))
                .positionName(positionName(form))
                .createdAt(form.getCreatedAt())
                .editedAt(versionNumber == 1 ? form.getCreatedAt() : form.getUpdatedAt())
                .editedBy(versionNumber == 1 ? form.getCreatedBy() : displayUser(form.getUpdatedByUser()))
                .changeCount(0)
                .build());
        existingKeys.add(key);
    }

    private List<KpiVersionHistorySummaryDTO> sortVersionSummaries(List<KpiVersionHistorySummaryDTO> summaries) {
        return summaries.stream()
                .sorted((a, b) -> {
                    LocalDateTime aEdited = a.getEditedAt();
                    LocalDateTime bEdited = b.getEditedAt();
                    if (aEdited != null && bEdited != null) {
                        int dateCompare = bEdited.compareTo(aEdited);
                        if (dateCompare != 0) {
                            return dateCompare;
                        }
                    } else if (aEdited != null) {
                        return -1;
                    } else if (bEdited != null) {
                        return 1;
                    }
                    String aTitle = a.getTemplateTitle() == null ? "" : a.getTemplateTitle();
                    String bTitle = b.getTemplateTitle() == null ? "" : b.getTemplateTitle();
                    return aTitle.compareToIgnoreCase(bTitle);
                })
                .toList();
    }

    private KpiVersionHistoryDetailDTO baselineDetail(KpiForm form, Integer versionNumber) {
        return KpiVersionHistoryDetailDTO.builder()
                .templateId(form.getId())
                .templateTitle(form.getTitle())
                .versionNumber(versionNumber)
                .versionTitle(versionTitle(form, versionNumber))
                .positionName(positionName(form))
                .createdAt(form.getCreatedAt())
                .editedAt(form.getUpdatedAt() != null ? form.getUpdatedAt() : form.getCreatedAt())
                .editedBy(form.getUpdatedByUser() != null ? displayUser(form.getUpdatedByUser()) : form.getCreatedBy())
                .changes(form.getItems().stream()
                        .sorted(Comparator.comparing(item -> item.getSortOrder() == null ? 0 : item.getSortOrder()))
                        .map(item -> KpiVersionHistoryDetailDTO.RowChangeDTO.builder()
                                .historyId(item.getId())
                                .changeType(KpiChangeType.CREATED)
                                .rowStatus(KpiVersionRowStatus.INITIAL)
                                .reason("Initial template version")
                                .changedAt(form.getCreatedAt())
                                .changedBy(form.getCreatedBy())
                                .initialVersion(true)
                                .row(snapshot(item))
                                .build())
                        .toList())
                .build();
    }

    private String versionTitle(KpiForm form, Integer versionNumber) {
        return "Version " + (versionNumber == null ? 1 : versionNumber);
    }

    private String positionName(KpiForm form) {
        if (form.getKpiPositions() == null) {
            return null;
        }
        return form.getKpiPositions().stream()
                .filter(link -> link.getPosition() != null)
                .map(link -> link.getPosition().getPositionTitle())
                .findFirst()
                .orElse(null);
    }

    private String displayUser(KpiVersionHistory history) {
        User user = history.getModifiedByUser();
        if (user != null) {
            return displayUser(user);
        }
        return history.getModifiedBy();
    }

    private String displayUser(KpiTemplateVersionRow row) {
        User user = row.getChangedByUser();
        if (user != null) {
            return displayUser(user);
        }
        return row.getChangedBy();
    }

    private String displayUser(User user) {
        if (user == null) {
            return null;
        }
        if (!isBlank(user.getFullName())) {
            return user.getFullName();
        }
        return user.getEmail();
    }

    private KpiVersionRowSnapshotDTO readSnapshot(KpiVersionHistory history) {
        String source = history.getChangeType() == KpiChangeType.DELETED
                ? history.getOldValue()
                : history.getNewValue();
        if (isBlank(source)) {
            return null;
        }
        try {
            return objectMapper.readValue(source, KpiVersionRowSnapshotDTO.class);
        } catch (JsonProcessingException e) {
            log.warn("Could not parse KPI version history snapshot {}: {}", history.getId(), e.getMessage());
            return null;
        }
    }

    private KpiVersionRowSnapshotDTO readSnapshot(KpiTemplateVersionRow row) {
        if (isBlank(row.getRowSnapshot())) {
            return null;
        }
        try {
            return objectMapper.readValue(row.getRowSnapshot(), KpiVersionRowSnapshotDTO.class);
        } catch (JsonProcessingException e) {
            log.warn("Could not parse KPI version collection snapshot {}: {}", row.getId(), e.getMessage());
            return null;
        }
    }

    private KpiChangeType changeTypeForStatus(KpiVersionRowStatus status) {
        if (status == KpiVersionRowStatus.REMOVED) {
            return KpiChangeType.DELETED;
        }
        return KpiChangeType.CREATED;
    }

    private String writeSnapshot(KpiVersionRowSnapshotDTO snapshot) {
        try {
            return objectMapper.writeValueAsString(snapshot);
        } catch (JsonProcessingException e) {
            throw new ResponseStatusException(HttpStatus.INTERNAL_SERVER_ERROR, "Could not record KPI row history.");
        }
    }

    private KpiVersionRowSnapshotDTO snapshot(KpiFormItem item) {
        KpiItem master = item.getKpiItem();
        KpiCategory category = item.getKpiCategory();
        KpiUnit unit = item.getKpiUnit();
        return KpiVersionRowSnapshotDTO.builder()
                .itemId(item.getId())
                .kpiName(master != null ? master.getName() : item.getKpiLabel())
                .kpiItemId(master != null ? master.getId() : null)
                .kpiCategoryId(category != null ? category.getId() : null)
                .kpiCategoryName(categoryDisplayName(item))
                .kpiCategoryLabel(item.getKpiCategoryLabel())
                .kpiUnitId(unit != null ? unit.getId() : null)
                .kpiUnitName(unitDisplayName(item))
                .kpiUnitLabel(item.getKpiUnitLabel())
                .target(item.getTarget())
                .weight(item.getWeight())
                .sortOrder(item.getSortOrder())
                .build();
    }

    private KpiVersionRowSnapshotDTO snapshot(KpiFormItemDTO row) {
        KpiItem master = row.getKpiItemId() == null
                ? null
                : kpiItemRepository.findById(row.getKpiItemId()).orElse(null);
        KpiCategory category = row.getKpiCategoryId() == null
                ? null
                : kpiCategoryRepository.findById(row.getKpiCategoryId()).orElse(null);
        KpiUnit unit = row.getKpiUnitId() == null
                ? null
                : kpiUnitRepository.findById(row.getKpiUnitId()).orElse(null);
        return KpiVersionRowSnapshotDTO.builder()
                .itemId(row.getId())
                .kpiName(master != null ? master.getName() : row.getKpiLabel())
                .kpiItemId(master != null ? master.getId() : row.getKpiItemId())
                .kpiCategoryId(category != null ? category.getId() : row.getKpiCategoryId())
                .kpiCategoryName(category != null ? category.getName() : categoryLabel(row))
                .kpiCategoryLabel(categoryLabel(row))
                .kpiUnitId(unit != null ? unit.getId() : row.getKpiUnitId())
                .kpiUnitName(unit != null ? unit.getName() : unitLabel(row))
                .kpiUnitLabel(unitLabel(row))
                .target(row.getTarget())
                .weight(row.getWeight())
                .sortOrder(row.getSortOrder())
                .build();
    }

    private static boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private record RowDiff(
            List<KpiFormItemDTO> addedRows,
            List<KpiFormItem> removedRows,
            Map<Integer, String> removedReasons
    ) {
        private RowDiff {
            removedReasons = removedReasons == null ? Map.of() : removedReasons;
        }

        private boolean hasChanges() {
            return !addedRows.isEmpty() || !removedRows.isEmpty();
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
            boolean hasMasterCategory = row.getKpiCategoryId() != null;
            boolean hasCategoryLabel = categoryLabel(row) != null;
            boolean hasMasterUnit = row.getKpiUnitId() != null;
            boolean hasUnitLabel = unitLabel(row) != null;
            if ((!hasMasterCategory && !hasCategoryLabel) || (!hasMasterUnit && !hasUnitLabel) || row.getTarget() == null || row.getWeight() == null) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Row " + (i + 1) + ": category, unit, target, and weight are required.");
            }
            if (!Double.isFinite(row.getTarget()) || row.getTarget() < 1 || row.getTarget() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Row " + (i + 1) + ": target must be between 1 and 100.");
            }
            if (row.getWeight() < 1 || row.getWeight() > 100) {
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                        "Row " + (i + 1) + ": weight must be between 1 and 100.");
            }
        }
    }

    private void validateDates(KpiFormRequestDTO dto) {
        if (dto.getStartDate() != null
                && dto.getEndDate() != null
                && dto.getEndDate().isBefore(dto.getStartDate())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "End date cannot be before start date.");
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

    private Integer singleSubmittedPositionId(List<Integer> positionIds) {
        if (positionIds == null || positionIds.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Select a position.");
        }
        List<Integer> distinctIds = positionIds.stream().distinct().toList();
        if (distinctIds.size() > 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only one position can be assigned per KPI form.");
        }
        return distinctIds.get(0);
    }

    private Integer currentPositionId(KpiForm form) {
        if (form.getKpiPositions() == null) {
            return null;
        }
        return form.getKpiPositions().stream()
                .filter(link -> link.getPosition() != null)
                .map(link -> link.getPosition().getId())
                .findFirst()
                .orElse(null);
    }

    private void validatePositionCanMoveTo(KpiForm form, Integer positionId) {
        positionRepository.findById(positionId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "Position not found: " + positionId));
        Optional<KpiPosition> existingLink = findOccupyingLink(positionId, form.getId());
        logDuplicateCheck(positionId, form.getId(), existingLink);
        if (existingLink.isPresent()) {
            Integer existingTemplateId = existingLink.get().getKpiForm().getId();
            throw new KpiTemplatePositionConflictException(
                    existingTemplateId,
                    "This position already has a KPI form. Choose another position or edit the existing form."
            );
        }
    }

    private void applyLifecycleTimestamps(KpiForm form, KpiFormStatus status) {
        LocalDateTime now = LocalDateTime.now();
        if (status == KpiFormStatus.FINALIZED && form.getFinalizedAt() == null) {
            form.setFinalizedAt(now);
        }
        if (status == KpiFormStatus.SENT && form.getSentAt() == null) {
            form.setSentAt(now);
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
        kpiPositionRepository.deleteArchivedLinksByPositionId(pid);
        kpiPositionRepository.flush();

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

            KpiFormItem entity = KpiFormItem.builder()
                    .kpiForm(form)
                    .build();
            applyItemFields(entity, row, i);
            form.addItem(entity);
        }
    }

    private void syncItems(KpiForm form, List<KpiFormItemDTO> rows) {
        Map<Integer, KpiFormItem> existingById = form.getItems().stream()
                .filter(item -> item.getId() != null)
                .collect(Collectors.toMap(KpiFormItem::getId, Function.identity()));
        Set<Integer> submittedIds = rows.stream()
                .map(KpiFormItemDTO::getId)
                .filter(id -> id != null && existingById.containsKey(id))
                .collect(Collectors.toSet());

        List<KpiFormItem> removedItems = form.getItems().stream()
                .filter(item -> item.getId() != null && !submittedIds.contains(item.getId()))
                .toList();
        for (KpiFormItem removed : removedItems) {
            if (kpiFormItemRepository.isReferencedByEmployeeScores(removed.getId())) {
                throw new ResponseStatusException(
                        HttpStatus.BAD_REQUEST,
                        "This KPI row is already used in employee KPI records and cannot be removed."
                );
            }
            form.removeItem(removed);
        }

        for (int i = 0; i < rows.size(); i++) {
            KpiFormItemDTO row = rows.get(i);
            KpiFormItem entity = row.getId() == null ? null : existingById.get(row.getId());
            if (entity == null) {
                entity = KpiFormItem.builder().kpiForm(form).build();
                form.addItem(entity);
            }
            applyItemFields(entity, row, i);
        }
    }

    private void applyItemFields(KpiFormItem entity, KpiFormItemDTO row, int index) {
        KpiCategory category = null;
        if (row.getKpiCategoryId() != null) {
            category = kpiCategoryRepository.findById(row.getKpiCategoryId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI category not found."));
        }
        KpiUnit unit = null;
        if (row.getKpiUnitId() != null) {
            unit = kpiUnitRepository.findById(row.getKpiUnitId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI unit not found."));
        }

        KpiItem masterItem = null;
        if (row.getKpiItemId() != null) {
            masterItem = kpiItemRepository.findById(row.getKpiItemId())
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.BAD_REQUEST, "KPI item not found."));
        }

        String label = row.getKpiLabel() != null ? row.getKpiLabel().trim() : null;
        String categoryLabel = categoryLabel(row);
        String unitLabel = unitLabel(row);
        entity.setKpiCategory(category);
        entity.setKpiCategoryLabel(category == null ? categoryLabel : null);
        entity.setKpiUnit(unit);
        entity.setKpiUnitLabel(unit == null ? unitLabel : null);
        entity.setKpiItem(masterItem);
        entity.setKpiLabel(masterItem == null ? label : null);
        entity.setTarget(row.getTarget());
        entity.setWeight(row.getWeight());
        entity.setSortOrder(row.getSortOrder() != null ? row.getSortOrder() : index);
    }

    private String categoryDisplayName(KpiFormItem item) {
        KpiCategory category = item.getKpiCategory();
        if (category != null) {
            return category.getName();
        }
        return item.getKpiCategoryLabel();
    }

    private String unitDisplayName(KpiFormItem item) {
        KpiUnit unit = item.getKpiUnit();
        if (unit != null) {
            return unit.getName();
        }
        return item.getKpiUnitLabel();
    }

    private String unitLabel(KpiFormItemDTO row) {
        String label = row.getKpiUnitLabel() != null ? row.getKpiUnitLabel() : row.getKpiUnitName();
        if (label == null || label.trim().isEmpty()) {
            return null;
        }
        return label.trim();
    }

    private String categoryLabel(KpiFormItemDTO row) {
        String label = row.getKpiCategoryLabel() != null ? row.getKpiCategoryLabel() : row.getKpiCategoryName();
        if (label == null || label.trim().isEmpty()) {
            return null;
        }
        return label.trim();
    }
}
