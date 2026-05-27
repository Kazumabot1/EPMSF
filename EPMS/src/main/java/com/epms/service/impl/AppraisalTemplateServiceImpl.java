package com.epms.service.impl;

import com.epms.dto.appraisal.*;
import com.epms.entity.*;
import com.epms.entity.enums.AppraisalTemplateStatus;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalFormTemplateRepository;
import com.epms.repository.AppraisalSectionRepository;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.UserRepository;
import com.epms.service.AppraisalTemplateService;
import com.epms.service.AuditLogService;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class AppraisalTemplateServiceImpl implements AppraisalTemplateService {
    private static final List<String> ALLOWED_SIGNATURE_DATE_FORMATS = List.of("DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD");

    private final AppraisalFormTemplateRepository templateRepository;
    private final AppraisalSectionRepository sectionRepository;
    private final DepartmentRepository departmentRepository;
    private final UserRepository userRepository;
    private final AuditLogService auditLogService;
    private final JdbcTemplate jdbcTemplate;

    @Override
    public AppraisalTemplateResponse createTemplate(AppraisalTemplateRequest request, Integer createdByUserId) {
        validateTemplateRequest(request);
        if (!Boolean.TRUE.equals(request.getCycleSpecificCopy())) {
            ensureUniqueTemplateNameForCreate(request.getTemplateName());
        }

        AppraisalFormTemplate template = new AppraisalFormTemplate();
        template.setTemplateName(request.getTemplateName().trim());
        template.setDescription(request.getDescription());
        template.setAppraiseeSignatureId(request.getAppraiseeSignatureId());
        template.setAppraiserSignatureId(request.getAppraiserSignatureId());
        template.setHrSignatureId(request.getHrSignatureId());
        template.setSignatureDateFormat(normalizeSignatureDateFormat(request.getSignatureDateFormat()));
        template.setFormType(request.getFormType() != null ? request.getFormType() : com.epms.entity.enums.AppraisalCycleType.ANNUAL);
        template.setTargetAllDepartments(request.getTargetAllDepartments() == null || Boolean.TRUE.equals(request.getTargetAllDepartments()));
        template.setStatus(AppraisalTemplateStatus.DRAFT);
        template.setCycleSpecificCopy(Boolean.TRUE.equals(request.getCycleSpecificCopy()));

        if (createdByUserId != null) {
            User createdBy = userRepository.findById(createdByUserId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found with id: " + createdByUserId));
            template.setCreatedByUser(createdBy);
        }

        applyDepartments(template, request);
        applySections(template, request.getSections());
        applyScoreBands(template, request.getScoreBands());

        AppraisalFormTemplate saved = templateRepository.save(template);
        return mapTemplate(saved, true);
    }

    @Override
    public AppraisalTemplateResponse updateDraftTemplate(Integer templateId, AppraisalTemplateRequest request, Integer updatedByUserId) {
        validateTemplateRequest(request);
        dropLegacyTemplateUniqueIndexesIfPresent();

        AppraisalFormTemplate sourceTemplate = getTemplateEntity(templateId);
        ensureTemplateEditable(sourceTemplate);
        String auditBefore = templateAuditSummary(sourceTemplate);
        List<AuditChangeParts> auditChanges = buildTemplateRequestAuditChanges(sourceTemplate, request);

        // HR template edits must never mutate the template structure that old appraisal
        // cycles/forms already reference.  Save the edited form as a fresh master
        // template record, then hide the previous master from the reusable template list.
        AppraisalFormTemplate replacement = buildReplacementTemplate(sourceTemplate, request, updatedByUserId);
        AppraisalFormTemplate saved = templateRepository.saveAndFlush(replacement);

        hidePreviousTemplateFromMasterList(sourceTemplate);
        auditTemplateUpdateSafely(saved, updatedByUserId, auditBefore, auditChanges, request.getEditReason());
        return mapTemplate(saved, true);
    }

    @Override
    @Transactional(readOnly = true)
    public AppraisalTemplateResponse getTemplate(Integer templateId) {
        AppraisalFormTemplate template = getTemplateEntity(templateId);
        return mapTemplate(template, true);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AppraisalTemplateResponse> getTemplates(AppraisalTemplateStatus status) {
        List<AppraisalFormTemplate> templates = status == null
                ? templateRepository.findByCycleSpecificCopyFalse()
                : templateRepository.findByStatusAndCycleSpecificCopyFalse(status);
        return templates.stream()
                .sorted(Comparator.comparing(AppraisalFormTemplate::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(template -> mapTemplate(template, true))
                .toList();
    }

    @Override
    public AppraisalTemplateResponse activateTemplate(Integer templateId) {
        AppraisalFormTemplate template = getTemplateEntity(templateId);
        if (template.getSections() == null || template.getSections().isEmpty()) {
            throw new BadRequestException("Template must have at least one section before activation.");
        }
        long criteriaCount = template.getSections().stream()
                .flatMap(section -> section.getCriteria().stream())
                .filter(criteria -> Boolean.TRUE.equals(criteria.getActive()))
                .count();
        if (criteriaCount == 0) {
            throw new BadRequestException("Template must have at least one active criteria before activation.");
        }
        template.setStatus(AppraisalTemplateStatus.ACTIVE);
        return mapTemplate(templateRepository.save(template), true);
    }

    @Override
    public AppraisalTemplateResponse archiveTemplate(Integer templateId) {
        AppraisalFormTemplate template = getTemplateEntity(templateId);
        template.setStatus(AppraisalTemplateStatus.ARCHIVED);
        return mapTemplate(templateRepository.save(template), true);
    }


    private List<AuditChangeParts> buildTemplateRequestAuditChanges(AppraisalFormTemplate sourceTemplate, AppraisalTemplateRequest request) {
        List<AuditChangeParts> changes = new ArrayList<>();
        if (sourceTemplate == null || request == null) {
            return changes;
        }

        String oldName = safeAuditText(sourceTemplate.getTemplateName());
        String newName = safeAuditText(request.getTemplateName());
        if (!Objects.equals(oldName, newName)) {
            changes.add(new AuditChangeParts("Template Name", auditState(oldName, newName), oldName, newName));
        }

        String oldDescription = safeAuditText(sourceTemplate.getDescription());
        String newDescription = safeAuditText(request.getDescription());
        if (!Objects.equals(oldDescription, newDescription)) {
            changes.add(new AuditChangeParts("Description", auditState(oldDescription, newDescription), oldDescription, newDescription));
        }

        List<AppraisalSection> oldSections = activeSortedSections(sourceTemplate);
        Map<Integer, AppraisalSection> oldSectionsById = new LinkedHashMap<>();
        for (AppraisalSection section : oldSections) {
            if (section.getId() != null) {
                oldSectionsById.put(section.getId(), section);
            }
        }

        List<AppraisalSectionRequest> requestedSections = request.getSections() == null ? List.of() : request.getSections();
        Set<Integer> requestedSectionIds = new LinkedHashSet<>();
        for (int sectionIndex = 0; sectionIndex < requestedSections.size(); sectionIndex++) {
            AppraisalSectionRequest sectionRequest = requestedSections.get(sectionIndex);
            int sectionNo = sectionIndex + 1;
            AppraisalSection oldSection = sectionRequest.getId() == null ? null : oldSectionsById.get(sectionRequest.getId());
            if (oldSection != null && oldSection.getId() != null) {
                requestedSectionIds.add(oldSection.getId());
            }

            String newSectionName = safeAuditText(sectionRequest.getSectionName());
            if (oldSection == null) {
                changes.add(new AuditChangeParts("Section " + sectionNo, "added", "", formatSectionRequestSnapshot(sectionRequest)));
                List<AppraisalCriterionRequest> criteriaRequests = sectionRequest.getCriteria() == null ? List.of() : sectionRequest.getCriteria();
                for (int criteriaIndex = 0; criteriaIndex < criteriaRequests.size(); criteriaIndex++) {
                    changes.add(new AuditChangeParts(
                            "Criteria " + sectionNo + "." + (criteriaIndex + 1),
                            "added",
                            "",
                            safeAuditText(criteriaRequests.get(criteriaIndex).getCriteriaText())
                    ));
                }
                continue;
            }

            String oldSectionName = safeAuditText(oldSection.getSectionName());
            if (!Objects.equals(oldSectionName, newSectionName)) {
                changes.add(new AuditChangeParts("Section " + sectionNo, "changed", oldSectionName, newSectionName));
            }

            addCriteriaRequestAuditChanges(changes, oldSection, sectionRequest, sectionNo);
        }

        for (int oldIndex = 0; oldIndex < oldSections.size(); oldIndex++) {
            AppraisalSection oldSection = oldSections.get(oldIndex);
            if (oldSection.getId() != null && requestedSectionIds.contains(oldSection.getId())) {
                continue;
            }
            int sectionNo = oldIndex + 1;
            List<String> oldCriteria = activeSortedCriteria(oldSection).stream()
                    .map(criteria -> safeAuditText(criteria.getCriteriaText()))
                    .toList();
            changes.add(new AuditChangeParts(
                    "Section " + sectionNo,
                    "removed",
                    formatSectionSnapshot(new AuditSectionSnapshot(safeAuditText(oldSection.getSectionName()), oldCriteria)),
                    ""
            ));
            for (int criteriaIndex = 0; criteriaIndex < oldCriteria.size(); criteriaIndex++) {
                changes.add(new AuditChangeParts(
                        "Criteria " + sectionNo + "." + (criteriaIndex + 1),
                        "removed",
                        oldCriteria.get(criteriaIndex),
                        ""
                ));
            }
        }

        addScoreBandRequestAuditChanges(changes, sourceTemplate, request);
        return changes;
    }

    private void addCriteriaRequestAuditChanges(List<AuditChangeParts> changes, AppraisalSection oldSection, AppraisalSectionRequest sectionRequest, int sectionNo) {
        List<AppraisalFormCriteria> oldCriteria = activeSortedCriteria(oldSection);
        Map<Integer, AppraisalFormCriteria> oldCriteriaById = new LinkedHashMap<>();
        for (AppraisalFormCriteria criteria : oldCriteria) {
            if (criteria.getId() != null) {
                oldCriteriaById.put(criteria.getId(), criteria);
            }
        }

        List<AppraisalCriterionRequest> criteriaRequests = sectionRequest.getCriteria() == null ? List.of() : sectionRequest.getCriteria();
        Set<Integer> requestedCriteriaIds = new LinkedHashSet<>();
        for (int criteriaIndex = 0; criteriaIndex < criteriaRequests.size(); criteriaIndex++) {
            AppraisalCriterionRequest criteriaRequest = criteriaRequests.get(criteriaIndex);
            int criteriaNo = criteriaIndex + 1;
            AppraisalFormCriteria oldCriterion = criteriaRequest.getId() == null ? null : oldCriteriaById.get(criteriaRequest.getId());
            String newCriteriaText = safeAuditText(criteriaRequest.getCriteriaText());
            if (oldCriterion == null) {
                changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + criteriaNo, "added", "", newCriteriaText));
                continue;
            }
            if (oldCriterion.getId() != null) {
                requestedCriteriaIds.add(oldCriterion.getId());
            }
            String oldCriteriaText = safeAuditText(oldCriterion.getCriteriaText());
            if (!Objects.equals(oldCriteriaText, newCriteriaText)) {
                changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + criteriaNo, "changed", oldCriteriaText, newCriteriaText));
            }
        }

        for (int oldIndex = 0; oldIndex < oldCriteria.size(); oldIndex++) {
            AppraisalFormCriteria oldCriterion = oldCriteria.get(oldIndex);
            if (oldCriterion.getId() != null && requestedCriteriaIds.contains(oldCriterion.getId())) {
                continue;
            }
            changes.add(new AuditChangeParts(
                    "Criteria " + sectionNo + "." + (oldIndex + 1),
                    "removed",
                    safeAuditText(oldCriterion.getCriteriaText()),
                    ""
            ));
        }
    }

    private void addScoreBandRequestAuditChanges(List<AuditChangeParts> changes, AppraisalFormTemplate sourceTemplate, AppraisalTemplateRequest request) {
        List<AppraisalTemplateScoreBand> oldBands = activeSortedScoreBands(sourceTemplate);
        Map<Integer, AppraisalTemplateScoreBand> oldBandsById = new LinkedHashMap<>();
        for (AppraisalTemplateScoreBand band : oldBands) {
            if (band.getId() != null) {
                oldBandsById.put(band.getId(), band);
            }
        }

        List<AppraisalScoreBandRequest> requestedBands = normalizeScoreBandRequests((request.getScoreBands() == null || request.getScoreBands().isEmpty())
                ? defaultScoreBands()
                : request.getScoreBands());
        Set<Integer> requestedBandIds = new LinkedHashSet<>();
        for (int index = 0; index < requestedBands.size(); index++) {
            AppraisalScoreBandRequest bandRequest = requestedBands.get(index);
            AppraisalTemplateScoreBand oldBand = bandRequest.getId() == null ? null : oldBandsById.get(bandRequest.getId());
            String newValue = scoreBandAuditText(bandRequest);
            if (oldBand == null) {
                changes.add(new AuditChangeParts("Score Range " + (index + 1), "added", "", newValue));
                continue;
            }
            if (oldBand.getId() != null) {
                requestedBandIds.add(oldBand.getId());
            }
            String oldValue = scoreBandAuditText(oldBand);
            if (!Objects.equals(oldValue, newValue)) {
                changes.add(new AuditChangeParts("Score Range " + (index + 1), "changed", oldValue, newValue));
            }
        }

        for (int oldIndex = 0; oldIndex < oldBands.size(); oldIndex++) {
            AppraisalTemplateScoreBand oldBand = oldBands.get(oldIndex);
            if (oldBand.getId() != null && requestedBandIds.contains(oldBand.getId())) {
                continue;
            }
            changes.add(new AuditChangeParts("Score Range " + (oldIndex + 1), "removed", scoreBandAuditText(oldBand), ""));
        }
    }

    private List<AppraisalSection> activeSortedSections(AppraisalFormTemplate template) {
        if (template == null || template.getSections() == null) {
            return List.of();
        }
        return template.getSections().stream()
                .filter(section -> section.getActive() == null || Boolean.TRUE.equals(section.getActive()))
                .sorted(Comparator.comparing(AppraisalSection::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .toList();
    }

    private List<AppraisalFormCriteria> activeSortedCriteria(AppraisalSection section) {
        if (section == null || section.getCriteria() == null) {
            return List.of();
        }
        return section.getCriteria().stream()
                .filter(criteria -> criteria.getActive() == null || Boolean.TRUE.equals(criteria.getActive()))
                .sorted(Comparator.comparing(AppraisalFormCriteria::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .toList();
    }

    private List<AppraisalTemplateScoreBand> activeSortedScoreBands(AppraisalFormTemplate template) {
        if (template == null || template.getScoreBands() == null) {
            return List.of();
        }
        return template.getScoreBands().stream()
                .filter(band -> band.getActive() == null || Boolean.TRUE.equals(band.getActive()))
                .sorted(Comparator.comparing(AppraisalTemplateScoreBand::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .toList();
    }

    private String formatSectionRequestSnapshot(AppraisalSectionRequest sectionRequest) {
        if (sectionRequest == null) {
            return "";
        }
        List<String> criteria = sectionRequest.getCriteria() == null
                ? List.of()
                : sectionRequest.getCriteria().stream()
                .map(criteriaRequest -> safeAuditText(criteriaRequest.getCriteriaText()))
                .toList();
        return formatSectionSnapshot(new AuditSectionSnapshot(safeAuditText(sectionRequest.getSectionName()), criteria));
    }

    private String scoreBandAuditText(AppraisalScoreBandRequest band) {
        if (band == null) {
            return "";
        }
        return safeAuditText(band.getLabel()) + " " + band.getMinScore() + "-" + band.getMaxScore();
    }

    private String scoreBandAuditText(AppraisalTemplateScoreBand band) {
        if (band == null) {
            return "";
        }
        return safeAuditText(band.getLabel()) + " " + band.getMinScore() + "-" + band.getMaxScore();
    }


    private void auditTemplateUpdateSafely(AppraisalFormTemplate template, Integer updatedByUserId, String auditBefore, List<AuditChangeParts> requestChanges, String editReason) {
        try {
            String auditAfter = templateAuditSummary(template);
            List<AuditChangeParts> changes = requestChanges != null ? new ArrayList<>(requestChanges) : buildAuditChangeParts(auditBefore, auditAfter);
            if (changes.isEmpty()) {
                changes = List.of(new AuditChangeParts("Updated", "changed", "", ""));
            }
            String auditBatchId = Long.toString(System.nanoTime(), 36);
            for (AuditChangeParts parts : changes) {
                auditLogService.log(
                        updatedByUserId,
                        "UPDATE",
                        "APPRAISAL_TEMPLATE",
                        template.getId(),
                        compactAuditSummary(withAuditBatch(parts.field(), auditBatchId)),
                        compactAuditSummary(parts.oldValue()),
                        compactAuditSummary(encodedAuditNewValue(parts)),
                        normalizeEditReason(editReason)
                );
            }
        } catch (Exception ignored) {
            // Audit records are useful for HR tracking, but they must never block the actual edit save.
        }
    }

    private String withAuditBatch(String value, String auditBatchId) {
        String base = value == null || value.isBlank() ? "Updated" : value;
        if (auditBatchId == null || auditBatchId.isBlank()) {
            return base;
        }
        return base + " @@auditBatch=" + auditBatchId;
    }

    private String encodedAuditNewValue(AuditChangeParts parts) {
        if (parts == null) {
            return "changed";
        }
        String state = parts.state() == null || parts.state().isBlank() ? "changed" : parts.state().trim().toLowerCase();
        String newValue = parts.newValue() == null ? "" : parts.newValue().trim();
        return newValue.isBlank() ? state : state + "::" + newValue;
    }

    private String normalizeEditReason(String value) {
        if (value == null || value.isBlank()) {
            return "No reason provided";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 450 ? normalized : normalized.substring(0, 447) + "...";
    }

    private String compactAuditSummary(String value) {
        if (value == null) {
            return "";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 240 ? normalized : normalized.substring(0, 237) + "...";
    }

    private List<AuditChangeParts> buildAuditChangeParts(String beforeSummary, String afterSummary) {
        Map<String, String> before = parseAuditSummary(beforeSummary);
        Map<String, String> after = parseAuditSummary(afterSummary);
        List<AuditChangeParts> changes = new ArrayList<>();

        addScalarAuditChange(changes, before, after, "Name", "Template Name");
        addScalarAuditChange(changes, before, after, "Description", "Description");
        addScalarAuditChange(changes, before, after, "Departments", "Departments");
        addEvaluationAuditChanges(changes, before.get("evaluation details"), after.get("evaluation details"));
        addScoreRangeAuditChanges(changes, before.get("score ranges"), after.get("score ranges"));
        addScalarAuditChange(changes, before, after, "Status", "Status");

        return changes;
    }

    private void addScalarAuditChange(List<AuditChangeParts> changes, Map<String, String> before, Map<String, String> after, String auditKey, String label) {
        String oldValue = before.getOrDefault(auditKey.toLowerCase(), "");
        String newValue = after.getOrDefault(auditKey.toLowerCase(), "");
        if (!Objects.equals(oldValue, newValue)) {
            changes.add(new AuditChangeParts(label, auditState(oldValue, newValue), oldValue, newValue));
        }
    }

    private String auditState(String oldValue, String newValue) {
        boolean oldBlank = oldValue == null || oldValue.isBlank() || "-".equals(oldValue.trim());
        boolean newBlank = newValue == null || newValue.isBlank() || "-".equals(newValue.trim());
        if (!oldBlank && newBlank) return "removed";
        if (oldBlank && !newBlank) return "added";
        return "changed";
    }

    private void addEvaluationAuditChanges(List<AuditChangeParts> changes, String beforeValue, String afterValue) {
        if (Objects.equals(beforeValue, afterValue)) {
            return;
        }
        List<AuditSectionSnapshot> beforeSections = parseEvaluationSnapshot(beforeValue);
        List<AuditSectionSnapshot> afterSections = parseEvaluationSnapshot(afterValue);
        if (beforeSections.isEmpty() && afterSections.isEmpty()) {
            changes.add(new AuditChangeParts("Evaluation Details", "changed", "", ""));
            return;
        }

        int maxSections = Math.max(beforeSections.size(), afterSections.size());
        for (int sectionIndex = 0; sectionIndex < maxSections; sectionIndex++) {
            int sectionNo = sectionIndex + 1;
            AuditSectionSnapshot beforeSection = sectionIndex < beforeSections.size() ? beforeSections.get(sectionIndex) : null;
            AuditSectionSnapshot afterSection = sectionIndex < afterSections.size() ? afterSections.get(sectionIndex) : null;
            if (beforeSection != null && afterSection == null) {
                changes.add(new AuditChangeParts("Section " + sectionNo, "removed", formatSectionSnapshot(beforeSection), ""));
                for (int criteriaIndex = 0; criteriaIndex < beforeSection.criteria.size(); criteriaIndex++) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + (criteriaIndex + 1), "removed", beforeSection.criteria.get(criteriaIndex), ""));
                }
                continue;
            }
            if (beforeSection == null && afterSection != null) {
                changes.add(new AuditChangeParts("Section " + sectionNo, "added", "", formatSectionSnapshot(afterSection)));
                for (int criteriaIndex = 0; criteriaIndex < afterSection.criteria.size(); criteriaIndex++) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + (criteriaIndex + 1), "added", "", afterSection.criteria.get(criteriaIndex)));
                }
                continue;
            }
            if (!Objects.equals(beforeSection == null ? null : beforeSection.name, afterSection == null ? null : afterSection.name)) {
                changes.add(new AuditChangeParts("Section " + sectionNo, "changed", beforeSection == null ? "" : beforeSection.name, afterSection == null ? "" : afterSection.name));
            }

            List<String> beforeCriteria = beforeSection == null ? List.of() : beforeSection.criteria;
            List<String> afterCriteria = afterSection == null ? List.of() : afterSection.criteria;
            int maxCriteria = Math.max(beforeCriteria.size(), afterCriteria.size());
            for (int criteriaIndex = 0; criteriaIndex < maxCriteria; criteriaIndex++) {
                int criteriaNo = criteriaIndex + 1;
                String oldCriteria = criteriaIndex < beforeCriteria.size() ? beforeCriteria.get(criteriaIndex) : null;
                String newCriteria = criteriaIndex < afterCriteria.size() ? afterCriteria.get(criteriaIndex) : null;
                if (oldCriteria != null && newCriteria == null) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + criteriaNo, "removed", oldCriteria, ""));
                } else if (oldCriteria == null && newCriteria != null) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + criteriaNo, "added", "", newCriteria));
                } else if (!Objects.equals(oldCriteria, newCriteria)) {
                    changes.add(new AuditChangeParts("Criteria " + sectionNo + "." + criteriaNo, "changed", oldCriteria == null ? "" : oldCriteria, newCriteria == null ? "" : newCriteria));
                }
            }
        }
    }

    private String formatSectionSnapshot(AuditSectionSnapshot section) {
        if (section == null) {
            return "";
        }
        String criteriaText = section.criteria == null || section.criteria.isEmpty()
                ? "-"
                : String.join(" / ", section.criteria);
        return section.name + "[" + criteriaText + "]";
    }

    private void addScoreRangeAuditChanges(List<AuditChangeParts> changes, String beforeValue, String afterValue) {
        if (Objects.equals(beforeValue, afterValue)) {
            return;
        }
        List<String> beforeRanges = parseScoreRangeSnapshot(beforeValue);
        List<String> afterRanges = parseScoreRangeSnapshot(afterValue);
        if (beforeRanges.isEmpty() && afterRanges.isEmpty()) {
            changes.add(new AuditChangeParts("Score Ranges", "changed", "", ""));
            return;
        }
        int maxRanges = Math.max(beforeRanges.size(), afterRanges.size());
        for (int index = 0; index < maxRanges; index++) {
            String oldRange = index < beforeRanges.size() ? beforeRanges.get(index) : null;
            String newRange = index < afterRanges.size() ? afterRanges.get(index) : null;
            if (oldRange != null && newRange == null) {
                changes.add(new AuditChangeParts("Score Range " + (index + 1), "removed", oldRange, ""));
            } else if (oldRange == null && newRange != null) {
                changes.add(new AuditChangeParts("Score Range " + (index + 1), "added", "", newRange));
            } else if (!Objects.equals(oldRange, newRange)) {
                changes.add(new AuditChangeParts("Score Range " + (index + 1), "changed", oldRange == null ? "" : oldRange, newRange == null ? "" : newRange));
            }
        }
    }

    private record AuditChangeParts(String field, String state, String oldValue, String newValue) {}

    private List<AuditSectionSnapshot> parseEvaluationSnapshot(String value) {
        List<AuditSectionSnapshot> sections = new ArrayList<>();
        if (value == null || value.isBlank() || "-".equals(value.trim())) {
            return sections;
        }
        for (String sectionPart : value.split("\\s*;\\s*")) {
            String trimmed = sectionPart.trim();
            if (trimmed.isBlank()) {
                continue;
            }
            int open = trimmed.indexOf('[');
            int close = trimmed.lastIndexOf(']');
            String name = open >= 0 ? trimmed.substring(0, open).trim() : trimmed;
            String criteriaValue = open >= 0 && close > open ? trimmed.substring(open + 1, close).trim() : "";
            List<String> criteria = new ArrayList<>();
            if (!criteriaValue.isBlank() && !"-".equals(criteriaValue)) {
                for (String criteriaText : criteriaValue.split("\\s*/\\s*")) {
                    String normalized = criteriaText.trim();
                    if (!normalized.isBlank()) {
                        criteria.add(normalized);
                    }
                }
            }
            sections.add(new AuditSectionSnapshot(name, criteria));
        }
        return sections;
    }

    private void addScoreRangeChanges(List<String> changedLabels, String beforeValue, String afterValue) {
        if (Objects.equals(beforeValue, afterValue)) {
            return;
        }
        List<String> beforeRanges = parseScoreRangeSnapshot(beforeValue);
        List<String> afterRanges = parseScoreRangeSnapshot(afterValue);
        if (beforeRanges.isEmpty() && afterRanges.isEmpty()) {
            changedLabels.add("Score Ranges: changed");
            return;
        }
        int maxRanges = Math.max(beforeRanges.size(), afterRanges.size());
        for (int index = 0; index < maxRanges; index++) {
            String oldRange = index < beforeRanges.size() ? beforeRanges.get(index) : null;
            String newRange = index < afterRanges.size() ? afterRanges.get(index) : null;
            if (oldRange != null && newRange == null) {
                changedLabels.add("Score Range " + (index + 1) + ": removed");
            } else if (oldRange == null && newRange != null) {
                changedLabels.add("Score Range " + (index + 1) + ": added");
            } else if (!Objects.equals(oldRange, newRange)) {
                changedLabels.add("Score Range " + (index + 1) + ": changed");
            }
        }
    }

    private List<String> parseScoreRangeSnapshot(String value) {
        List<String> ranges = new ArrayList<>();
        if (value == null || value.isBlank() || "-".equals(value.trim())) {
            return ranges;
        }
        for (String range : value.split("\\s*;\\s*")) {
            String normalized = range.trim();
            if (!normalized.isBlank()) {
                ranges.add(normalized);
            }
        }
        return ranges;
    }

    private static class AuditSectionSnapshot {
        private final String name;
        private final List<String> criteria;

        private AuditSectionSnapshot(String name, List<String> criteria) {
            this.name = name;
            this.criteria = criteria;
        }
    }

    private Map<String, String> parseAuditSummary(String summary) {
        Map<String, String> values = new LinkedHashMap<>();
        if (summary == null || summary.isBlank()) {
            return values;
        }
        for (String part : summary.split("\\|")) {
            int idx = part.indexOf(':');
            if (idx < 0) {
                continue;
            }
            String key = part.substring(0, idx).trim().toLowerCase();
            String value = part.substring(idx + 1).trim();
            if (!key.isBlank()) {
                values.put(key, value);
            }
        }
        return values;
    }

    private String templateAuditSummary(AppraisalFormTemplate template) {
        if (template == null) {
            return "-";
        }
        int sectionCount = template.getSections() == null
                ? 0
                : (int) template.getSections().stream()
                .filter(section -> section.getActive() == null || Boolean.TRUE.equals(section.getActive()))
                .count();
        int criteriaCount = template.getSections() == null
                ? 0
                : template.getSections().stream()
                .filter(section -> section.getActive() == null || Boolean.TRUE.equals(section.getActive()))
                .mapToInt(section -> section.getCriteria() == null ? 0 : (int) section.getCriteria().stream()
                        .filter(criteria -> criteria.getActive() == null || Boolean.TRUE.equals(criteria.getActive()))
                        .count())
                .sum();
        String scoreRanges = templateScoreRangeSummary(template);
        String departments = Boolean.TRUE.equals(template.getTargetAllDepartments())
                ? "All Departments"
                : template.getTargetDepartments().stream()
                .filter(target -> target.getDepartment() != null)
                .map(target -> target.getDepartment().getDepartmentName())
                .filter(name -> name != null && !name.isBlank())
                .collect(java.util.stream.Collectors.joining(", "));
        if (departments == null || departments.isBlank()) {
            departments = "-";
        }
        return "Name: " + template.getTemplateName()
                + " | Description: " + (template.getDescription() == null ? "-" : template.getDescription())
                + " | Departments: " + departments
                + " | Sections: " + sectionCount
                + " | Criteria: " + criteriaCount
                + " | Evaluation Details: " + templateEvaluationSummary(template)
                + " | Score Ranges: " + scoreRanges
                + " | Status: " + template.getStatus();
    }

    private String templateEvaluationSummary(AppraisalFormTemplate template) {
        if (template.getSections() == null || template.getSections().isEmpty()) {
            return "-";
        }
        return template.getSections().stream()
                .filter(section -> section.getActive() == null || Boolean.TRUE.equals(section.getActive()))
                .sorted(Comparator.comparing(AppraisalSection::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(section -> safeAuditText(section.getSectionName()) + "[" + criteriaSummary(section) + "]")
                .collect(java.util.stream.Collectors.joining(" ; "));
    }

    private String criteriaSummary(AppraisalSection section) {
        if (section.getCriteria() == null || section.getCriteria().isEmpty()) {
            return "-";
        }
        return section.getCriteria().stream()
                .filter(criteria -> criteria.getActive() == null || Boolean.TRUE.equals(criteria.getActive()))
                .sorted(Comparator.comparing(AppraisalFormCriteria::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(criteria -> safeAuditText(criteria.getCriteriaText()))
                .collect(java.util.stream.Collectors.joining(" / "));
    }

    private String templateScoreRangeSummary(AppraisalFormTemplate template) {
        if (template.getScoreBands() == null || template.getScoreBands().isEmpty()) {
            return "-";
        }
        return template.getScoreBands().stream()
                .filter(band -> band.getActive() == null || Boolean.TRUE.equals(band.getActive()))
                .sorted(Comparator.comparing(AppraisalTemplateScoreBand::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(band -> safeAuditText(band.getLabel()) + " " + band.getMinScore() + "-" + band.getMaxScore())
                .collect(java.util.stream.Collectors.joining(" ; "));
    }

    private String safeAuditText(String value) {
        if (value == null || value.isBlank()) {
            return "-";
        }
        return value.replace("|", "/").replaceAll("\\s+", " " ).trim();
    }

    private void ensureUniqueTemplateNameForCreate(String templateName) {
        String normalizedName = templateName == null ? "" : templateName.trim();
        if (templateRepository.existsByTemplateNameIgnoreCase(normalizedName)) {
            throw new BadRequestException("Template name already exists. Please use a different template name.");
        }
    }


    private AppraisalFormTemplate buildReplacementTemplate(AppraisalFormTemplate sourceTemplate, AppraisalTemplateRequest request, Integer updatedByUserId) {
        AppraisalFormTemplate replacement = new AppraisalFormTemplate();
        replacement.setTemplateName(request.getTemplateName().trim());
        replacement.setDescription(request.getDescription());
        replacement.setAppraiseeSignatureId(request.getAppraiseeSignatureId());
        replacement.setAppraiserSignatureId(request.getAppraiserSignatureId());
        replacement.setHrSignatureId(request.getHrSignatureId());
        replacement.setSignatureDateFormat(normalizeSignatureDateFormat(request.getSignatureDateFormat()));
        replacement.setFormType(request.getFormType() != null ? request.getFormType() : sourceTemplate.getFormType());
        replacement.setTargetAllDepartments(request.getTargetAllDepartments() == null || Boolean.TRUE.equals(request.getTargetAllDepartments()));
        replacement.setStatus(sourceTemplate.getStatus() == null ? AppraisalTemplateStatus.DRAFT : sourceTemplate.getStatus());
        replacement.setVersionNo(1);
        replacement.setCycleSpecificCopy(false);

        User editor = null;
        if (updatedByUserId != null) {
            editor = userRepository.findById(updatedByUserId).orElse(null);
        }
        replacement.setCreatedByUser(editor != null ? editor : sourceTemplate.getCreatedByUser());

        applyDepartments(replacement, request);
        applySections(replacement, request.getSections());
        applyScoreBands(replacement, request.getScoreBands());
        return replacement;
    }

    private void hidePreviousTemplateFromMasterList(AppraisalFormTemplate previousTemplate) {
        if (previousTemplate == null || previousTemplate.getId() == null || Boolean.TRUE.equals(previousTemplate.getCycleSpecificCopy())) {
            return;
        }
        previousTemplate.setCycleSpecificCopy(true);
        templateRepository.saveAndFlush(previousTemplate);
    }

    private void dropLegacyTemplateUniqueIndexesIfPresent() {
        try {
            List<String> uniqueIndexes = jdbcTemplate.queryForList(
                    """
                    SELECT INDEX_NAME
                    FROM INFORMATION_SCHEMA.STATISTICS
                    WHERE TABLE_SCHEMA = DATABASE()
                      AND TABLE_NAME = 'appraisal_form_template'
                      AND NON_UNIQUE = 0
                      AND INDEX_NAME <> 'PRIMARY'
                    GROUP BY INDEX_NAME
                    """,
                    String.class
            );
            for (String indexName : uniqueIndexes) {
                try {
                    jdbcTemplate.execute("ALTER TABLE appraisal_form_template DROP INDEX `" + indexName.replace("`", "``") + "`");
                } catch (Exception ignored) {
                    // Already removed or insufficient permissions. Edit flow should continue.
                }
            }
        } catch (Exception ignored) {
            // Non-MySQL database or missing metadata privileges.
        }
    }

    private AppraisalFormTemplate getTemplateEntity(Integer templateId) {
        return templateRepository.findById(templateId)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal template not found with id: " + templateId));
    }

    private void ensureTemplateEditable(AppraisalFormTemplate template) {
        if (template.getStatus() == AppraisalTemplateStatus.ARCHIVED) {
            throw new BadRequestException("Archived appraisal templates cannot be edited.");
        }
    }

    private void validateTemplateRequest(AppraisalTemplateRequest request) {
        if (request == null) {
            throw new BadRequestException("Template request is required.");
        }
        if (request.getTemplateName() == null || request.getTemplateName().isBlank()) {
            throw new BadRequestException("Template name is required.");
        }
        if (request.getDescription() == null || request.getDescription().isBlank()) {
            throw new BadRequestException("Template description is required.");
        }
        // Template master is department/cycle-type independent. Cycle type and target departments
        // are selected when HR creates an Appraisal Cycle from a template.
        if (request.getSections() == null || request.getSections().isEmpty()) {
            throw new BadRequestException("At least one section is required.");
        }
        validateSignatureDateFormat(request.getSignatureDateFormat());
    }

    private void applyDepartments(AppraisalFormTemplate template, AppraisalTemplateRequest request) {
        if (Boolean.TRUE.equals(request.getTargetAllDepartments())) {
            return;
        }
        for (Integer departmentId : distinctDepartmentIds(request.getDepartmentIds())) {
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));
            AppraisalTemplateDepartment target = new AppraisalTemplateDepartment();
            target.setTemplate(template);
            target.setDepartment(department);
            template.getTargetDepartments().add(target);
        }
    }

    private void replaceDepartments(AppraisalFormTemplate template, AppraisalTemplateRequest request) {
        if (Boolean.TRUE.equals(request.getTargetAllDepartments())) {
            template.getTargetDepartments().clear();
            return;
        }

        Set<Integer> requestedDepartmentIds = new LinkedHashSet<>(distinctDepartmentIds(request.getDepartmentIds()));
        if (requestedDepartmentIds.isEmpty()) {
            throw new BadRequestException("Select at least one department or choose all departments.");
        }

        template.getTargetDepartments().removeIf(target -> target.getDepartment() == null
                || target.getDepartment().getId() == null
                || !requestedDepartmentIds.contains(target.getDepartment().getId()));

        Set<Integer> existingDepartmentIds = new LinkedHashSet<>();
        template.getTargetDepartments().forEach(target -> {
            if (target.getDepartment() != null && target.getDepartment().getId() != null) {
                existingDepartmentIds.add(target.getDepartment().getId());
            }
        });

        for (Integer departmentId : requestedDepartmentIds) {
            if (existingDepartmentIds.contains(departmentId)) {
                continue;
            }
            Department department = departmentRepository.findById(departmentId)
                    .orElseThrow(() -> new ResourceNotFoundException("Department not found with id: " + departmentId));
            AppraisalTemplateDepartment target = new AppraisalTemplateDepartment();
            target.setTemplate(template);
            target.setDepartment(department);
            template.getTargetDepartments().add(target);
        }
    }

    private List<Integer> distinctDepartmentIds(List<Integer> departmentIds) {
        if (departmentIds == null) {
            return List.of();
        }
        Set<Integer> uniqueIds = new LinkedHashSet<>();
        departmentIds.stream()
                .filter(id -> id != null)
                .forEach(uniqueIds::add);
        return new ArrayList<>(uniqueIds);
    }

    private void applySections(AppraisalFormTemplate template, List<AppraisalSectionRequest> sectionRequests) {
        int sectionIndex = 0;
        for (AppraisalSectionRequest sectionRequest : sectionRequests) {
            if (sectionRequest.getSectionName() == null || sectionRequest.getSectionName().isBlank()) {
                throw new BadRequestException("Section name is required.");
            }
            AppraisalSection section = new AppraisalSection();
            section.setTemplate(template);
            section.setSectionName(sectionRequest.getSectionName().trim());
            section.setDescription(sectionRequest.getDescription());
            section.setSortOrder(sectionRequest.getSortOrder() != null ? sectionRequest.getSortOrder() : sectionIndex);
            section.setActive(sectionRequest.getActive() == null || sectionRequest.getActive());

            List<AppraisalCriterionRequest> criteriaRequests = sectionRequest.getCriteria() == null
                    ? new ArrayList<>()
                    : sectionRequest.getCriteria();
            int criteriaIndex = 0;
            for (AppraisalCriterionRequest criterionRequest : criteriaRequests) {
                if (criterionRequest.getCriteriaText() == null || criterionRequest.getCriteriaText().isBlank()) {
                    throw new BadRequestException("Criteria text is required.");
                }
                AppraisalFormCriteria criteria = new AppraisalFormCriteria();
                criteria.setSection(section);
                criteria.setCriteriaText(criterionRequest.getCriteriaText().trim());
                criteria.setDescription(criterionRequest.getDescription() == null ? "" : criterionRequest.getDescription().trim());
                criteria.setSortOrder(criterionRequest.getSortOrder() != null ? criterionRequest.getSortOrder() : criteriaIndex);
                criteria.setMaxRating(criterionRequest.getMaxRating() != null ? criterionRequest.getMaxRating() : 5);
                criteria.setRatingRequired(criterionRequest.getRatingRequired() == null || criterionRequest.getRatingRequired());
                criteria.setActive(criterionRequest.getActive() == null || criterionRequest.getActive());
                section.getCriteria().add(criteria);
                criteriaIndex++;
            }
            template.getSections().add(section);
            sectionIndex++;
        }
    }



    private void replaceSections(AppraisalFormTemplate template, List<AppraisalSectionRequest> sectionRequests) {
        Map<Integer, AppraisalSection> existingSectionsById = new LinkedHashMap<>();
        template.getSections().forEach(section -> {
            if (section.getId() != null) {
                existingSectionsById.put(section.getId(), section);
            }
        });

        Set<Integer> requestedExistingSectionIds = new LinkedHashSet<>();
        if (sectionRequests != null) {
            sectionRequests.stream()
                    .map(AppraisalSectionRequest::getId)
                    .filter(existingSectionsById::containsKey)
                    .forEach(requestedExistingSectionIds::add);
        }

        template.getSections().forEach(section -> {
            if (section.getId() != null && !requestedExistingSectionIds.contains(section.getId())) {
                section.setActive(false);
            }
        });

        int sectionIndex = 0;
        for (AppraisalSectionRequest sectionRequest : sectionRequests == null ? List.<AppraisalSectionRequest>of() : sectionRequests) {
            if (sectionRequest.getSectionName() == null || sectionRequest.getSectionName().isBlank()) {
                throw new BadRequestException("Section name is required.");
            }

            AppraisalSection section = sectionRequest.getId() != null ? existingSectionsById.get(sectionRequest.getId()) : null;
            if (section == null) {
                section = new AppraisalSection();
                section.setTemplate(template);
                template.getSections().add(section);
            }

            section.setSectionName(sectionRequest.getSectionName().trim());
            section.setDescription(sectionRequest.getDescription());
            section.setSortOrder(sectionRequest.getSortOrder() != null ? sectionRequest.getSortOrder() : sectionIndex);
            section.setActive(sectionRequest.getActive() == null || sectionRequest.getActive());
            replaceCriteria(section, sectionRequest.getCriteria());
            sectionIndex++;
        }
    }

    private void replaceCriteria(AppraisalSection section, List<AppraisalCriterionRequest> criteriaRequests) {
        Map<Integer, AppraisalFormCriteria> existingCriteriaById = new LinkedHashMap<>();
        section.getCriteria().forEach(criteria -> {
            if (criteria.getId() != null) {
                existingCriteriaById.put(criteria.getId(), criteria);
            }
        });

        Set<Integer> requestedExistingCriteriaIds = new LinkedHashSet<>();
        if (criteriaRequests != null) {
            criteriaRequests.stream()
                    .map(AppraisalCriterionRequest::getId)
                    .filter(existingCriteriaById::containsKey)
                    .forEach(requestedExistingCriteriaIds::add);
        }

        section.getCriteria().forEach(criteria -> {
            if (criteria.getId() != null && !requestedExistingCriteriaIds.contains(criteria.getId())) {
                criteria.setActive(false);
            }
        });

        int criteriaIndex = 0;
        for (AppraisalCriterionRequest criterionRequest : criteriaRequests == null ? List.<AppraisalCriterionRequest>of() : criteriaRequests) {
            if (criterionRequest.getCriteriaText() == null || criterionRequest.getCriteriaText().isBlank()) {
                throw new BadRequestException("Criteria text is required.");
            }

            AppraisalFormCriteria criteria = criterionRequest.getId() != null ? existingCriteriaById.get(criterionRequest.getId()) : null;
            if (criteria == null) {
                criteria = new AppraisalFormCriteria();
                criteria.setSection(section);
                section.getCriteria().add(criteria);
            }

            criteria.setCriteriaText(criterionRequest.getCriteriaText().trim());
            criteria.setDescription(criterionRequest.getDescription() == null ? "" : criterionRequest.getDescription().trim());
            criteria.setSortOrder(criterionRequest.getSortOrder() != null ? criterionRequest.getSortOrder() : criteriaIndex);
            criteria.setMaxRating(criterionRequest.getMaxRating() != null ? criterionRequest.getMaxRating() : 5);
            criteria.setRatingRequired(criterionRequest.getRatingRequired() == null || criterionRequest.getRatingRequired());
            criteria.setActive(criterionRequest.getActive() == null || criterionRequest.getActive());
            criteriaIndex++;
        }
    }

    private List<AppraisalScoreBandRequest> defaultScoreBands() {
        List<AppraisalScoreBandRequest> defaults = new ArrayList<>();
        defaults.add(new AppraisalScoreBandRequest(null, 86, 100, "Outstanding", "Performance exceptional and far exceeds expectations.", 1, true));
        defaults.add(new AppraisalScoreBandRequest(null, 71, 85, "Exceeds Requirements", "Performance is consistent and clearly meets essential requirements.", 2, true));
        defaults.add(new AppraisalScoreBandRequest(null, 60, 70, "Meet Requirement", "Performance is satisfactory and meets requirements of the job.", 3, true));
        defaults.add(new AppraisalScoreBandRequest(null, 40, 59, "Need Improvement", "Performance is inconsistent. Supervision and training are needed.", 4, true));
        defaults.add(new AppraisalScoreBandRequest(null, 0, 39, "Unsatisfactory", "Performance does not meet the minimum requirement of the job.", 5, true));
        return defaults;
    }

    private void applyScoreBands(AppraisalFormTemplate template, List<AppraisalScoreBandRequest> scoreBandRequests) {
        List<AppraisalScoreBandRequest> bands = normalizeScoreBandRequests((scoreBandRequests == null || scoreBandRequests.isEmpty())
                ? defaultScoreBands()
                : scoreBandRequests);
        int index = 0;
        for (AppraisalScoreBandRequest bandRequest : bands) {
            if (bandRequest.getMinScore() == null || bandRequest.getMaxScore() == null) {
                throw new BadRequestException("Score range min and max are required.");
            }
            if (bandRequest.getMinScore() < 0 || bandRequest.getMaxScore() > 100 || bandRequest.getMinScore() > bandRequest.getMaxScore()) {
                throw new BadRequestException("Score ranges must be valid values between 0 and 100.");
            }
            if (bandRequest.getLabel() == null || bandRequest.getLabel().isBlank()) {
                throw new BadRequestException("Score rating label is required.");
            }
            AppraisalTemplateScoreBand band = new AppraisalTemplateScoreBand();
            band.setTemplate(template);
            band.setMinScore(bandRequest.getMinScore());
            band.setMaxScore(bandRequest.getMaxScore());
            band.setLabel(bandRequest.getLabel().trim());
            band.setDescription(bandRequest.getDescription());
            band.setSortOrder(bandRequest.getSortOrder() != null ? bandRequest.getSortOrder() : index + 1);
            band.setActive(bandRequest.getActive() == null || bandRequest.getActive());
            template.getScoreBands().add(band);
            index++;
        }
    }


    private void replaceScoreBands(AppraisalFormTemplate template, List<AppraisalScoreBandRequest> scoreBandRequests) {
        List<AppraisalScoreBandRequest> bands = normalizeScoreBandRequests((scoreBandRequests == null || scoreBandRequests.isEmpty())
                ? defaultScoreBands()
                : scoreBandRequests);

        Map<Integer, AppraisalTemplateScoreBand> existingBandsById = new LinkedHashMap<>();
        template.getScoreBands().forEach(band -> {
            if (band.getId() != null) {
                existingBandsById.put(band.getId(), band);
            }
        });

        Set<Integer> requestedExistingBandIds = new LinkedHashSet<>();
        bands.stream()
                .map(AppraisalScoreBandRequest::getId)
                .filter(existingBandsById::containsKey)
                .forEach(requestedExistingBandIds::add);

        template.getScoreBands().forEach(band -> {
            if (band.getId() != null && !requestedExistingBandIds.contains(band.getId())) {
                band.setActive(false);
            }
        });

        int index = 0;
        for (AppraisalScoreBandRequest bandRequest : bands) {
            if (bandRequest.getMinScore() == null || bandRequest.getMaxScore() == null) {
                throw new BadRequestException("Score range min and max are required.");
            }
            if (bandRequest.getMinScore() < 0 || bandRequest.getMaxScore() > 100 || bandRequest.getMinScore() > bandRequest.getMaxScore()) {
                throw new BadRequestException("Score ranges must be valid values between 0 and 100.");
            }
            if (bandRequest.getLabel() == null || bandRequest.getLabel().isBlank()) {
                throw new BadRequestException("Score rating label is required.");
            }

            AppraisalTemplateScoreBand band = bandRequest.getId() != null ? existingBandsById.get(bandRequest.getId()) : null;
            if (band == null) {
                band = new AppraisalTemplateScoreBand();
                band.setTemplate(template);
                template.getScoreBands().add(band);
            }

            band.setMinScore(bandRequest.getMinScore());
            band.setMaxScore(bandRequest.getMaxScore());
            band.setLabel(bandRequest.getLabel().trim());
            band.setDescription(bandRequest.getDescription());
            band.setSortOrder(bandRequest.getSortOrder() != null ? bandRequest.getSortOrder() : index + 1);
            band.setActive(bandRequest.getActive() == null || bandRequest.getActive());
            index++;
        }
    }

    private AppraisalTemplateResponse mapTemplate(AppraisalFormTemplate template, boolean includeStructure) {
        AppraisalTemplateResponse response = new AppraisalTemplateResponse();
        response.setId(template.getId());
        response.setTemplateName(template.getTemplateName());
        response.setDescription(template.getDescription());
        response.setAppraiseeSignatureId(template.getAppraiseeSignatureId());
        response.setAppraiserSignatureId(template.getAppraiserSignatureId());
        response.setHrSignatureId(template.getHrSignatureId());
        response.setSignatureDateFormat(normalizeSignatureDateFormat(template.getSignatureDateFormat()));
        response.setFormType(template.getFormType());
        response.setTargetAllDepartments(template.getTargetAllDepartments());
        response.setStatus(template.getStatus());
        response.setVersionNo(template.getVersionNo());
        response.setCreatedByUserId(template.getCreatedByUser() != null ? template.getCreatedByUser().getId() : null);
        response.setCreatedByEmployeeId(displayEmployeeId(template.getCreatedByUser()));
        response.setCycleSpecificCopy(Boolean.TRUE.equals(template.getCycleSpecificCopy()));
        response.setCreatedAt(template.getCreatedAt());
        response.setUpdatedAt(template.getUpdatedAt());

        if (Boolean.FALSE.equals(template.getTargetAllDepartments())) {
            template.getTargetDepartments().forEach(target -> {
                if (target.getDepartment() != null) {
                    response.getDepartmentIds().add(target.getDepartment().getId());
                    response.getDepartmentNames().add(target.getDepartment().getDepartmentName());
                }
            });
        }

        if (includeStructure) {
            List<AppraisalSection> sections = template.getSections();
            if (sections == null || sections.isEmpty()) {
                sections = sectionRepository.findByTemplateIdWithCriteria(template.getId());
            }
            response.setSections(sections.stream()
                    .filter(section -> section.getActive() == null || Boolean.TRUE.equals(section.getActive()))
                    .sorted(Comparator.comparing(AppraisalSection::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                    .map(this::mapSection)
                    .toList());
        }

        List<AppraisalTemplateScoreBand> bands = template.getScoreBands();
        if (bands == null || bands.isEmpty()) {
            response.setScoreBands(defaultScoreBands().stream()
                    .map(band -> new AppraisalScoreBandResponse(
                            band.getId(),
                            band.getMinScore(),
                            band.getMaxScore(),
                            band.getLabel(),
                            band.getDescription(),
                            band.getSortOrder(),
                            band.getActive()
                    ))
                    .toList());
        } else {
            response.setScoreBands(deduplicateTemplateScoreBands(bands).stream()
                    .filter(band -> band.getActive() == null || Boolean.TRUE.equals(band.getActive()))
                    .sorted(Comparator.comparing(AppraisalTemplateScoreBand::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                    .map(band -> new AppraisalScoreBandResponse(
                            band.getId(),
                            band.getMinScore(),
                            band.getMaxScore(),
                            band.getLabel(),
                            band.getDescription(),
                            band.getSortOrder(),
                            band.getActive()
                    ))
                    .toList());
        }

        return response;
    }


    private String displayEmployeeId(User user) {
        if (user == null) {
            return null;
        }
        if (user.getEmployeeCode() != null && !user.getEmployeeCode().isBlank()) {
            return user.getEmployeeCode();
        }
        if (user.getEmployeeId() != null) {
            return String.valueOf(user.getEmployeeId());
        }
        return user.getId() != null ? String.valueOf(user.getId()) : null;
    }

    private List<AppraisalScoreBandRequest> normalizeScoreBandRequests(List<AppraisalScoreBandRequest> bands) {
        Map<String, AppraisalScoreBandRequest> uniqueBands = new LinkedHashMap<>();
        for (AppraisalScoreBandRequest band : bands) {
            String key = band.getMinScore() + "-" + band.getMaxScore() + "-" + String.valueOf(band.getLabel()).trim().toLowerCase();
            uniqueBands.putIfAbsent(key, band);
        }
        return new ArrayList<>(uniqueBands.values());
    }

    private List<AppraisalTemplateScoreBand> deduplicateTemplateScoreBands(List<AppraisalTemplateScoreBand> bands) {
        Map<String, AppraisalTemplateScoreBand> uniqueBands = new LinkedHashMap<>();
        for (AppraisalTemplateScoreBand band : bands) {
            String key = band.getMinScore() + "-" + band.getMaxScore() + "-" + String.valueOf(band.getLabel()).trim().toLowerCase();
            uniqueBands.putIfAbsent(key, band);
        }
        return new ArrayList<>(uniqueBands.values());
    }

    private void validateSignatureDateFormat(String signatureDateFormat) {
        String normalized = normalizeSignatureDateFormat(signatureDateFormat);
        if (!ALLOWED_SIGNATURE_DATE_FORMATS.contains(normalized)) {
            throw new BadRequestException("Signature date format is invalid. Allowed: DD/MM/YYYY, MM/DD/YYYY, YYYY-MM-DD");
        }
    }

    private String normalizeSignatureDateFormat(String signatureDateFormat) {
        if (signatureDateFormat == null || signatureDateFormat.isBlank()) {
            return "DD/MM/YYYY";
        }
        return signatureDateFormat.trim().toUpperCase();
    }

    private AppraisalSectionResponse mapSection(AppraisalSection section) {
        AppraisalSectionResponse response = new AppraisalSectionResponse();
        response.setId(section.getId());
        response.setSectionName(section.getSectionName());
        response.setDescription(section.getDescription());
        response.setSortOrder(section.getSortOrder());
        response.setActive(section.getActive());
        response.setCriteria(section.getCriteria().stream()
                .filter(criteria -> criteria.getActive() == null || Boolean.TRUE.equals(criteria.getActive()))
                .sorted(Comparator.comparing(AppraisalFormCriteria::getSortOrder, Comparator.nullsLast(Integer::compareTo)))
                .map(criteria -> new AppraisalCriterionResponse(
                        criteria.getId(),
                        criteria.getCriteriaText(),
                        criteria.getDescription(),
                        criteria.getSortOrder(),
                        criteria.getMaxRating(),
                        criteria.getRatingRequired(),
                        criteria.getActive(),
                        null,
                        null
                ))
                .toList());
        return response;
    }
}
