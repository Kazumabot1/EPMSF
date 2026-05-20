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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Map;
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
        AppraisalFormTemplate template = getTemplateEntity(templateId);
        ensureTemplateEditable(template);
        String auditBefore = templateAuditSummary(template);
        template.setTemplateName(request.getTemplateName().trim());
        template.setDescription(request.getDescription());
        template.setAppraiseeSignatureId(request.getAppraiseeSignatureId());
        template.setAppraiserSignatureId(request.getAppraiserSignatureId());
        template.setHrSignatureId(request.getHrSignatureId());
        template.setSignatureDateFormat(normalizeSignatureDateFormat(request.getSignatureDateFormat()));
        template.setFormType(request.getFormType() != null ? request.getFormType() : template.getFormType());
        template.setTargetAllDepartments(request.getTargetAllDepartments() == null || Boolean.TRUE.equals(request.getTargetAllDepartments()));

        replaceDepartments(template, request);
        replaceSections(template, request.getSections());
        replaceScoreBands(template, request.getScoreBands());

        AppraisalFormTemplate saved = templateRepository.save(template);
        auditTemplateUpdate(saved, updatedByUserId, auditBefore);
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


    private void auditTemplateUpdate(AppraisalFormTemplate template, Integer updatedByUserId, String auditBefore) {
        auditLogService.log(
                updatedByUserId,
                "UPDATE",
                "APPRAISAL_TEMPLATE",
                template.getId(),
                "Template Form",
                compactAuditSummary(auditBefore),
                compactAuditSummary(templateAuditSummary(template)),
                "HR edited appraisal template form"
        );
    }

    private String compactAuditSummary(String value) {
        if (value == null) {
            return "-";
        }
        String normalized = value.replaceAll("\\s+", " ").trim();
        return normalized.length() <= 240 ? normalized : normalized.substring(0, 237) + "...";
    }

    private String templateAuditSummary(AppraisalFormTemplate template) {
        if (template == null) {
            return "-";
        }
        int sectionCount = template.getSections() == null ? 0 : template.getSections().size();
        int criteriaCount = template.getSections() == null
                ? 0
                : template.getSections().stream()
                .mapToInt(section -> section.getCriteria() == null ? 0 : section.getCriteria().size())
                .sum();
        int scoreBandCount = template.getScoreBands() == null ? 0 : template.getScoreBands().size();
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
                + " | Score Ranges: " + scoreBandCount
                + " | Status: " + template.getStatus();
    }

    private void ensureUniqueTemplateNameForCreate(String templateName) {
        String normalizedName = templateName == null ? "" : templateName.trim();
        if (templateRepository.existsByTemplateNameIgnoreCase(normalizedName)) {
            throw new BadRequestException("Template name already exists. Please use a different template name.");
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

        template.getSections().removeIf(section -> section.getId() != null && !requestedExistingSectionIds.contains(section.getId()));

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

        section.getCriteria().removeIf(criteria -> criteria.getId() != null && !requestedExistingCriteriaIds.contains(criteria.getId()));

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

        template.getScoreBands().removeIf(band -> band.getId() != null && !requestedExistingBandIds.contains(band.getId()));

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
