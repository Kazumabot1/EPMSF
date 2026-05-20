package com.epms.service.impl;

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
import com.epms.service.AssessmentFormDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.Objects;

@Service
@RequiredArgsConstructor
@Transactional
public class AssessmentFormDefinitionServiceImpl implements AssessmentFormDefinitionService {

    private static final String RESPONSE_TYPE_YES_NO_RATING = "YES_NO_RATING";

    private final AssessmentFormDefinitionRepository repository;

    @Override
    @Transactional(readOnly = true)
    public List<AssessmentFormResponse> getAll() {
        return repository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public AssessmentFormResponse getById(Integer id) {
        return toResponse(getEntity(id));
    }

    @Override
    public AssessmentFormResponse create(AssessmentFormPayload payload) {
        validate(payload);

        String formName = payload.getFormName().trim();

        if (repository.existsByFormNameIgnoreCase(formName)) {
            throw new BadRequestException("Assessment form name already exists.");
        }

        AssessmentFormDefinition form = new AssessmentFormDefinition();
        applyPayload(form, payload);

        return toResponse(repository.save(form));
    }

    @Override
    public AssessmentFormResponse update(Integer id, AssessmentFormPayload payload) {
        throw new BadRequestException("Assessment forms are locked after creation. Create a new form instead of editing an existing one.");
    }

    @Override
    public void deactivate(Integer id) {
        AssessmentFormDefinition form = getEntity(id);
        form.setActive(false);
        repository.save(form);
    }

    private AssessmentFormDefinition getEntity(Integer id) {
        return repository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Assessment form not found with id: " + id));
    }

    private void validate(AssessmentFormPayload payload) {
        if (payload == null) {
            throw new BadRequestException("Assessment form payload is required.");
        }

        if (payload.getFormName() == null || payload.getFormName().isBlank()) {
            throw new BadRequestException("Form name is required.");
        }

        if (payload.getStartDate() == null) {
            throw new BadRequestException("Start date is required.");
        }

        if (payload.getEndDate() == null) {
            throw new BadRequestException("End date is required.");
        }

        if (payload.getStartDate().isAfter(payload.getEndDate())) {
            throw new BadRequestException("Start date cannot be later than end date.");
        }

        if (payload.getTargetRoles() == null || payload.getTargetRoles().isEmpty()) {
            throw new BadRequestException("Select at least one target role.");
        }

        if (payload.getSections() == null || payload.getSections().isEmpty()) {
            throw new BadRequestException("Add at least one section.");
        }

        for (AssessmentSectionPayload section : payload.getSections()) {
            if (section == null) {
                throw new BadRequestException("Section payload is invalid.");
            }

            if (section.getTitle() == null || section.getTitle().isBlank()) {
                throw new BadRequestException("Every section needs a title.");
            }

            if (section.getQuestions() == null || section.getQuestions().isEmpty()) {
                throw new BadRequestException("Every section needs at least one assessment subject.");
            }

            for (AssessmentQuestionPayload question : section.getQuestions()) {
                if (question == null) {
                    throw new BadRequestException("Assessment subject payload is invalid.");
                }

                if (question.getQuestionText() == null || question.getQuestionText().isBlank()) {
                    throw new BadRequestException("Every assessment subject needs text.");
                }
            }
        }

        List<AssessmentScoreBandPayload> bands = scoreBandPayloadsOrDefaults(payload.getScoreBands());

        for (AssessmentScoreBandPayload band : bands) {
            validateScoreBand(band);
        }
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

    private void applyPayload(AssessmentFormDefinition form, AssessmentFormPayload payload) {
        form.setFormName(payload.getFormName().trim());
        form.setCompanyName(clean(payload.getCompanyName()) == null ? "ACE Data Systems Ltd." : clean(payload.getCompanyName()));
        form.setDescription(clean(payload.getDescription()));
        form.setStartDate(payload.getStartDate());
        form.setEndDate(payload.getEndDate());
        form.setActive(true);

        if (form.getTargetRoles() == null) {
            form.setTargetRoles(new ArrayList<>());
        } else {
            form.getTargetRoles().clear();
        }

        form.getTargetRoles().addAll(
                payload.getTargetRoles()
                        .stream()
                        .filter(role -> role != null && !role.isBlank())
                        .map(String::trim)
                        .distinct()
                        .toList()
        );

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

        int sectionIndex = 1;

        for (AssessmentSectionPayload sectionPayload : payload.getSections()) {
            AssessmentFormSectionDefinition section = new AssessmentFormSectionDefinition();

            section.setForm(form);
            section.setTitle(sectionPayload.getTitle().trim());
            section.setOrderNo(sectionPayload.getOrderNo() != null ? sectionPayload.getOrderNo() : sectionIndex);

            if (section.getQuestions() == null) {
                section.setQuestions(new ArrayList<>());
            } else {
                section.getQuestions().clear();
            }

            for (AssessmentQuestionPayload questionPayload : sectionPayload.getQuestions()) {
                AssessmentFormQuestionDefinition question = new AssessmentFormQuestionDefinition();

                question.setSection(section);
                question.setQuestionText(questionPayload.getQuestionText().trim());
                question.setResponseType(RESPONSE_TYPE_YES_NO_RATING);
                question.setRequired(questionPayload.getIsRequired() == null || questionPayload.getIsRequired());
                question.setWeight(1.0);

                section.getQuestions().add(question);
            }

            form.getSections().add(section);
            sectionIndex++;
        }

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

    private String resolveResponseType(String responseType) {
        return RESPONSE_TYPE_YES_NO_RATING;
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
        response.setIsActive(form.getActive());
        response.setTargetRoles(form.getTargetRoles() == null ? List.of() : form.getTargetRoles());
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
        response.setIsRequired(question.getRequired());
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