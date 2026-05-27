package com.epms.service.impl;

import com.epms.dto.AssessmentFormDtos.AssessmentFormActivationPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentFormPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentFormResponse;
import com.epms.dto.AssessmentFormDtos.AssessmentQuestionPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentQuestionResponse;
import com.epms.dto.AssessmentFormDtos.AssessmentScoreBandPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentScoreBandResponse;
import com.epms.dto.AssessmentFormDtos.AssessmentSectionPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentSectionResponse;
import com.epms.entity.AssessmentFormDefinition;
import com.epms.entity.AssessmentFormQuestionDefinition;
import com.epms.entity.AssessmentFormScoreBandDefinition;
import com.epms.entity.AssessmentFormSectionDefinition;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AssessmentFormDefinitionRepository;
import com.epms.security.SecurityUtils;
import com.epms.service.AuditLogService;
import com.epms.service.AssessmentFormDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.epms.service.PositionPermissionService;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class AssessmentFormDefinitionServiceImpl implements AssessmentFormDefinitionService {

    private static final String RESPONSE_TYPE_YES_NO_RATING = "YES_NO_RATING";
    private static final String HIDDEN_SECTION_TITLE = "Assessment Subjects";
    private static final String TARGET_ROLE_EMPLOYEE = "Employee";

    private final PositionPermissionService positionPermissionService;
    private final AssessmentFormDefinitionRepository repository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public List<AssessmentFormResponse> getAll() {
        expireEndedActiveForms();

        return repository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public AssessmentFormResponse getById(Integer id) {
        expireEndedActiveForms();

        return toResponse(getEntity(id));
    }

    @Override
    public AssessmentFormResponse create(AssessmentFormPayload payload) {
        validateCreatePayload(payload);
        assertCanManageAssessmentForms();

        String formName = payload.getFormName().trim();

        if (repository.existsByFormNameIgnoreCase(formName)) {
            throw new BadRequestException("Assessment form name already exists.");
        }

        AssessmentFormDefinition form = new AssessmentFormDefinition();
        applyCreatePayload(form, payload);

        AssessmentFormDefinition saved = repository.save(form);
        auditLogService.log(currentUserId(), "CREATE", "ASSESSMENT_FORM", saved.getId(), null, null, "title: " + saved.getFormName(), null);
        return toResponse(saved);
    }

    @Override
    public AssessmentFormResponse update(Integer id, AssessmentFormPayload payload) {
        assertCanManageAssessmentForms();
        throw new BadRequestException("Assessment forms are locked after creation. Create a new form instead of editing an existing one.");
    }

    @Override
    public AssessmentFormResponse updateActivation(Integer id, AssessmentFormActivationPayload payload) {
        assertCanManageAssessmentForms();
        expireEndedActiveForms();

        if (payload == null || payload.getActive() == null) {
            throw new BadRequestException("Activation status is required.");
        }

        AssessmentFormDefinition form = getEntity(id);

        if (Boolean.TRUE.equals(payload.getActive())) {
            activateForm(form, payload);
        } else {
            setInactive(form);
        }

        AssessmentFormDefinition saved = repository.save(form);
        auditLogService.log(
                currentUserId(),
                Boolean.TRUE.equals(payload.getActive()) ? "ACTIVATE" : "DEACTIVATE",
                "ASSESSMENT_FORM",
                saved.getId(),
                "active",
                null,
                String.valueOf(Boolean.TRUE.equals(saved.getActive())) + " | title: " + saved.getFormName(),
                null
        );
        return toResponse(saved);
    }

    @Override
    public void deactivate(Integer id) {
        assertCanManageAssessmentForms();
        AssessmentFormDefinition form = getEntity(id);
        setInactive(form);
        AssessmentFormDefinition saved = repository.save(form);
        auditLogService.log(currentUserId(), "DEACTIVATE", "ASSESSMENT_FORM", saved.getId(), "active", "true", "false | title: " + saved.getFormName(), null);
    }

    private Integer currentUserId() {
        try {
            return SecurityUtils.currentUserId();
        } catch (Exception ignored) {
            return null;
        }
    }

    private void expireEndedActiveForms() {
        LocalDateTime now = LocalDateTime.now();

        List<AssessmentFormDefinition> forms = repository.findAllByOrderByCreatedAtDesc();
        boolean changed = false;

        for (AssessmentFormDefinition form : forms) {
            if (Boolean.TRUE.equals(form.getActive())
                    && form.getEndDate() != null
                    && !form.getEndDate().isAfter(now)) {
                form.setActive(false);
                changed = true;
            }
        }

        if (changed) {
            repository.saveAll(forms);
        }
    }

    private void assertCanManageAssessmentForms() {
        if (!positionPermissionService.currentUserHasPermission("assessmentFormCreate")) {
            throw new BadRequestException("Your position does not have permission to create or activate self-assessment forms.");
        }
    }

    private AssessmentFormDefinition getEntity(Integer id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment form not found with id: " + id));
    }

    private void validateCreatePayload(AssessmentFormPayload payload) {
        if (payload == null) {
            throw new BadRequestException("Assessment form payload is required.");
        }

        if (payload.getFormName() == null || payload.getFormName().isBlank()) {
            throw new BadRequestException("Form name is required.");
        }

        List<AssessmentQuestionPayload> subjects = flattenSubjects(payload);

        if (subjects.isEmpty()) {
            throw new BadRequestException("Add at least one assessment subject.");
        }

        for (AssessmentQuestionPayload subject : subjects) {
            if (subject == null || subject.getQuestionText() == null || subject.getQuestionText().isBlank()) {
                throw new BadRequestException("Every assessment subject needs text.");
            }
        }

        List<AssessmentScoreBandPayload> bands = scoreBandPayloadsOrDefaults(payload.getScoreBands());

        for (AssessmentScoreBandPayload band : bands) {
            validateScoreBand(band);
        }
    }

    private void activateForm(AssessmentFormDefinition form, AssessmentFormActivationPayload payload) {
        validateActivationPayload(form.getId(), payload);

        form.setStartDate(payload.getStartDate());
        form.setEndDate(payload.getEndDate());
        form.setActive(true);

        if (form.getTargetRoles() == null) {
            form.setTargetRoles(new ArrayList<>());
        } else {
            form.getTargetRoles().clear();
        }

        form.getTargetRoles().add(TARGET_ROLE_EMPLOYEE);
    }
    private void validateActivationPayload(Integer currentFormId, AssessmentFormActivationPayload payload) {
        if (payload.getStartDate() == null) {
            throw new BadRequestException("Start date and time are required.");
        }

        if (payload.getEndDate() == null) {
            throw new BadRequestException("End date and time are required.");
        }

        LocalDateTime now = LocalDateTime.now();
        LocalDateTime oneYearFromNow = now.plusYears(1);

        if (payload.getStartDate().isBefore(now)) {
            throw new BadRequestException("Start date and time cannot be in the past.");
        }

        if (!payload.getEndDate().isAfter(payload.getStartDate())) {
            throw new BadRequestException("End date and time must be after the start date and time.");
        }

        if (payload.getStartDate().isAfter(oneYearFromNow) || payload.getEndDate().isAfter(oneYearFromNow)) {
            throw new BadRequestException("The assessment period must be within one year from now.");
        }

        List<AssessmentFormDefinition> overlappingForms = repository.findActiveFormsOverlapping(
                currentFormId,
                payload.getStartDate(),
                payload.getEndDate()
        );

        if (!overlappingForms.isEmpty()) {
            AssessmentFormDefinition existing = overlappingForms.get(0);
            throw new BadRequestException(
                    "Another self-assessment form is already active during the selected period: "
                            + existing.getFormName()
                            + ". Please choose a period that does not overlap."
            );
        }
    }
    private void setInactive(AssessmentFormDefinition form) {
        if (form == null) {
            throw new BadRequestException("Assessment form is required.");
        }

        if (Boolean.TRUE.equals(form.getActive())
                && form.getStartDate() != null
                && !form.getStartDate().isAfter(LocalDateTime.now())) {
            throw new BadRequestException("This form has already started and cannot be set inactive.");
        }

        form.setActive(false);
    }

    private void validateScoreBand(AssessmentScoreBandPayload band) {
        if (band == null) {
            throw new BadRequestException("Score range payload is invalid.");
        }

        if (band.getMinScore() == null || band.getMaxScore() == null) {
            throw new BadRequestException("Score range min and max are required.");
        }

        if (band.getMinScore() < 0 || band.getMaxScore() > 100 || band.getMinScore() > band.getMaxScore()) {
            throw new BadRequestException("Score range must be between 0 and 100 and min cannot exceed max.");
        }

        if (band.getLabel() == null || band.getLabel().isBlank()) {
            throw new BadRequestException("Score range label is required.");
        }
    }

    private void applyCreatePayload(AssessmentFormDefinition form, AssessmentFormPayload payload) {
        form.setFormName(payload.getFormName().trim());
        form.setCompanyName(clean(payload.getCompanyName()) == null ? "ACE Data Systems Ltd." : clean(payload.getCompanyName()));
        form.setDescription(clean(payload.getDescription()));
        form.setStartDate(null);
        form.setEndDate(null);
        form.setActive(false);

        if (form.getTargetRoles() == null) {
            form.setTargetRoles(new ArrayList<>());
        } else {
            form.getTargetRoles().clear();
        }

        form.getTargetRoles().add(TARGET_ROLE_EMPLOYEE);

        if (form.getTargetDepartmentIds() == null) {
            form.setTargetDepartmentIds(new ArrayList<>());
        } else {
            form.getTargetDepartmentIds().clear();
        }

        if (payload.getTargetDepartmentIds() != null) {
            form.getTargetDepartmentIds().addAll(
                    payload.getTargetDepartmentIds()
                            .stream()
                            .filter(Objects::nonNull)
                            .distinct()
                            .toList()
            );
        }

        if (form.getSections() == null) {
            form.setSections(new ArrayList<>());
        } else {
            form.getSections().clear();
        }

        AssessmentFormSectionDefinition section = new AssessmentFormSectionDefinition();
        section.setForm(form);
        section.setTitle(HIDDEN_SECTION_TITLE);
        section.setOrderNo(1);

        if (section.getQuestions() == null) {
            section.setQuestions(new ArrayList<>());
        } else {
            section.getQuestions().clear();
        }

        for (AssessmentQuestionPayload subjectPayload : flattenSubjects(payload)) {
            AssessmentFormQuestionDefinition question = new AssessmentFormQuestionDefinition();

            question.setSection(section);
            question.setQuestionText(subjectPayload.getQuestionText().trim());
            question.setResponseType(RESPONSE_TYPE_YES_NO_RATING);
            question.setRequired(true);
            question.setWeight(1.0);

            section.getQuestions().add(question);
        }

        form.getSections().add(section);

        if (form.getScoreBands() == null) {
            form.setScoreBands(new ArrayList<>());
        } else {
            form.getScoreBands().clear();
        }

        int bandIndex = 1;

        for (AssessmentScoreBandPayload bandPayload : scoreBandPayloadsOrDefaults(payload.getScoreBands())) {
            AssessmentFormScoreBandDefinition band = new AssessmentFormScoreBandDefinition();

            band.setForm(form);
            band.setMinScore(bandPayload.getMinScore());
            band.setMaxScore(bandPayload.getMaxScore());
            band.setLabel(bandPayload.getLabel().trim());
            band.setDescription(clean(bandPayload.getDescription()));
            band.setSortOrder(bandPayload.getSortOrder() == null ? bandIndex : bandPayload.getSortOrder());

            form.getScoreBands().add(band);
            bandIndex++;
        }
    }

    private List<AssessmentQuestionPayload> flattenSubjects(AssessmentFormPayload payload) {
        if (payload == null || payload.getSections() == null) {
            return List.of();
        }

        return payload.getSections()
                .stream()
                .filter(Objects::nonNull)
                .flatMap(section -> section.getQuestions() == null ? List.<AssessmentQuestionPayload>of().stream() : section.getQuestions().stream())
                .filter(Objects::nonNull)
                .filter(question -> question.getQuestionText() != null && !question.getQuestionText().isBlank())
                .toList();
    }

    private List<AssessmentScoreBandPayload> scoreBandPayloadsOrDefaults(List<AssessmentScoreBandPayload> payloads) {
        if (payloads != null && !payloads.isEmpty()) {
            return payloads;
        }

        List<AssessmentScoreBandPayload> defaults = new ArrayList<>();

        defaults.add(defaultBand(
                86,
                100,
                "Outstanding",
                "Performance exceptional and far exceeds expectations. Consistently demonstrates excellent standards in all job requirements.",
                1
        ));

        defaults.add(defaultBand(
                71,
                85,
                "Good",
                "Performance is consistent. Clearly meets essential requirements of job.",
                2
        ));

        defaults.add(defaultBand(
                60,
                70,
                "Meet Requirement",
                "Performance is satisfactory. Meets requirements of the job.",
                3
        ));

        defaults.add(defaultBand(
                40,
                59,
                "Need Improvement",
                "Performance is inconsistent. Meets requirements of the job occasionally. Supervision and training is required for most problem areas.",
                4
        ));

        defaults.add(defaultBand(
                0,
                39,
                "Unsatisfactory",
                "Performance does not meet the minimum requirement of the job.",
                5
        ));

        return defaults;
    }

    private AssessmentScoreBandPayload defaultBand(
            Integer min,
            Integer max,
            String label,
            String description,
            Integer sortOrder
    ) {
        AssessmentScoreBandPayload band = new AssessmentScoreBandPayload();

        band.setMinScore(min);
        band.setMaxScore(max);
        band.setLabel(label);
        band.setDescription(description);
        band.setSortOrder(sortOrder);

        return band;
    }

    private AssessmentFormResponse toResponse(AssessmentFormDefinition form) {
        AssessmentFormResponse response = new AssessmentFormResponse();

        response.setId(form.getId());
        response.setFormName(form.getFormName());
        response.setCompanyName(form.getCompanyName());
        response.setDescription(form.getDescription());
        response.setStartDate(form.getStartDate());
        response.setEndDate(form.getEndDate());
        response.setIsActive(Boolean.TRUE.equals(form.getActive()));
        response.setTargetRoles(form.getTargetRoles() == null || form.getTargetRoles().isEmpty() ? List.of(TARGET_ROLE_EMPLOYEE) : form.getTargetRoles());
        response.setTargetDepartmentIds(form.getTargetDepartmentIds() == null ? List.of() : form.getTargetDepartmentIds());
        response.setCreatedAt(form.getCreatedAt());
        response.setUpdatedAt(form.getUpdatedAt());

        response.setSections(
                form.getSections() == null
                        ? List.of()
                        : form.getSections()
                        .stream()
                        .sorted(Comparator.comparing(
                                AssessmentFormSectionDefinition::getOrderNo,
                                Comparator.nullsLast(Integer::compareTo)
                        ))
                        .map(this::toSectionResponse)
                        .toList()
        );

        response.setScoreBands(
                form.getScoreBands() == null || form.getScoreBands().isEmpty()
                        ? scoreBandPayloadsOrDefaults(List.of()).stream().map(this::toScoreBandResponse).toList()
                        : form.getScoreBands()
                        .stream()
                        .sorted(Comparator.comparing(
                                AssessmentFormScoreBandDefinition::getSortOrder,
                                Comparator.nullsLast(Integer::compareTo)
                        ))
                        .map(this::toScoreBandResponse)
                        .toList()
        );

        return response;
    }

    private AssessmentSectionResponse toSectionResponse(AssessmentFormSectionDefinition section) {
        AssessmentSectionResponse response = new AssessmentSectionResponse();

        response.setId(section.getId());
        response.setTitle(section.getTitle());
        response.setOrderNo(section.getOrderNo());

        response.setQuestions(
                section.getQuestions() == null
                        ? List.of()
                        : section.getQuestions()
                        .stream()
                        .map(this::toQuestionResponse)
                        .toList()
        );

        return response;
    }

    private AssessmentQuestionResponse toQuestionResponse(AssessmentFormQuestionDefinition question) {
        AssessmentQuestionResponse response = new AssessmentQuestionResponse();

        response.setId(question.getId());
        response.setQuestionText(question.getQuestionText());
        response.setResponseType(RESPONSE_TYPE_YES_NO_RATING);
        response.setIsRequired(true);
        response.setWeight(1.0);

        return response;
    }

    private AssessmentScoreBandResponse toScoreBandResponse(AssessmentFormScoreBandDefinition band) {
        AssessmentScoreBandResponse response = new AssessmentScoreBandResponse();

        response.setId(band.getId());
        response.setMinScore(band.getMinScore());
        response.setMaxScore(band.getMaxScore());
        response.setLabel(band.getLabel());
        response.setDescription(band.getDescription());
        response.setSortOrder(band.getSortOrder());

        return response;
    }

    private AssessmentScoreBandResponse toScoreBandResponse(AssessmentScoreBandPayload band) {
        AssessmentScoreBandResponse response = new AssessmentScoreBandResponse();

        response.setId(band.getId());
        response.setMinScore(band.getMinScore());
        response.setMaxScore(band.getMaxScore());
        response.setLabel(band.getLabel());
        response.setDescription(band.getDescription());
        response.setSortOrder(band.getSortOrder());

        return response;
    }

    private String clean(String value) {
        if (value == null || value.trim().isEmpty()) {
            return null;
        }

        return value.trim();
    }
}
