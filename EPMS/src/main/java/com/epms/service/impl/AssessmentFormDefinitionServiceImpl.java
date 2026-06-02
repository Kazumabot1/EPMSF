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
import com.epms.entity.User;
import com.epms.exception.BadRequestException;
import com.epms.notification.NotificationEventKey;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AssessmentFormDefinitionRepository;
import com.epms.repository.UserRepository;
import com.epms.service.AssessmentFormDefinitionService;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collection;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Set;

@Service
@RequiredArgsConstructor
@Transactional
public class AssessmentFormDefinitionServiceImpl implements AssessmentFormDefinitionService {

    private static final String RESPONSE_TYPE_YES_NO_RATING = "YES_NO_RATING";
    private static final String HIDDEN_SECTION_TITLE = "Assessment Subjects";
    private static final String TARGET_ROLE_EMPLOYEE = "Employee";

    private final AssessmentFormDefinitionRepository repository;
    private final UserRepository userRepository;
    private final NotificationService notificationService;

    @Override
    @Transactional
    public List<AssessmentFormResponse> getAll() {
        processAssessmentFormNotificationsAndExpiry();

        return repository.findAllByOrderByCreatedAtDesc()
                .stream()
                .map(this::toResponse)
                .toList();
    }

    @Override
    @Transactional
    public AssessmentFormResponse getById(Integer id) {
        processAssessmentFormNotificationsAndExpiry();

        return toResponse(getEntity(id));
    }

    @Override
    public AssessmentFormResponse create(AssessmentFormPayload payload) {
        validateCreatePayload(payload);

        String formName = payload.getFormName().trim();

        if (repository.existsByFormNameIgnoreCase(formName)) {
            throw new BadRequestException("Assessment form name already exists.");
        }

        AssessmentFormDefinition form = new AssessmentFormDefinition();
        applyCreatePayload(form, payload);

        return toResponse(repository.save(form));
    }

    @Override
    public AssessmentFormResponse update(Integer id, AssessmentFormPayload payload) {
        throw new BadRequestException("Assessment forms are locked after creation. Create a new form instead of editing an existing one.");
    }

    @Override
    public AssessmentFormResponse updateActivation(Integer id, AssessmentFormActivationPayload payload) {
        processAssessmentFormNotificationsAndExpiry();

        if (payload == null || payload.getActive() == null) {
            throw new BadRequestException("Activation status is required.");
        }

        AssessmentFormDefinition form = getEntity(id);

        if (Boolean.TRUE.equals(payload.getActive())) {
            activateForm(form, payload);
        } else {
            setInactive(form);
        }

        return toResponse(repository.save(form));
    }

    @Override
    public void deactivate(Integer id) {
        AssessmentFormDefinition form = getEntity(id);
        setInactive(form);
        repository.save(form);
    }

    @Scheduled(fixedDelay = 60000, initialDelay = 60000)
    @Transactional
    public void scheduledAssessmentFormNotificationCheck() {
        processAssessmentFormNotificationsAndExpiry();
    }

    private void processAssessmentFormNotificationsAndExpiry() {
        LocalDateTime now = LocalDateTime.now();

        List<AssessmentFormDefinition> forms = repository.findAllByOrderByCreatedAtDesc();
        boolean changed = false;

        for (AssessmentFormDefinition form : forms) {
            if (Boolean.TRUE.equals(form.getActive())
                    && form.getStartDate() != null
                    && !form.getStartDate().isAfter(now)
                    && form.getStartNotificationSentAt() == null) {
                notifyActiveEmployeesFormOpened(form);
                form.setStartNotificationSentAt(now);
                changed = true;
            }

            if (Boolean.TRUE.equals(form.getActive())
                    && form.getEndDate() != null
                    && !form.getEndDate().isAfter(now)) {
                if (form.getCloseNotificationSentAt() == null) {
                    notifyActiveEmployeesFormClosed(form);
                    form.setCloseNotificationSentAt(now);
                }
                form.setActive(false);
                changed = true;
            }
        }

        if (changed) {
            repository.saveAll(forms);
        }
    }

    private void notifyActiveEmployeesFormOpened(AssessmentFormDefinition form) {
        for (User employee : activeEmployeeUsers()) {
            notificationService.sendEventOnce(
                    employee.getId(),
                    NotificationEventKey.SELF_ASSESSMENT_FORM_OPENED,
                    "Self-assessment form is open",
                    (form.getFormName() == null ? "Self-assessment form" : form.getFormName()) + " is now open. Please submit it before the end date.",
                    "GENERAL",
                    form.getId()
            );
        }
    }

    private void notifyActiveEmployeesFormClosed(AssessmentFormDefinition form) {
        for (User employee : activeEmployeeUsers()) {
            notificationService.sendEventOnce(
                    employee.getId(),
                    NotificationEventKey.SELF_ASSESSMENT_FORM_CLOSED,
                    "Self-assessment form is closed",
                    (form.getFormName() == null ? "Self-assessment form" : form.getFormName()) + " is now closed.",
                    "GENERAL",
                    form.getId()
            );
        }
    }

    private List<User> activeEmployeeUsers() {
        return userRepository.findAll()
                .stream()
                .filter(user -> !Boolean.FALSE.equals(user.getActive()))
                .filter(this::isEmployeeOnlyUser)
                .toList();
    }

    private boolean isEmployeeOnlyUser(User user) {
        if (user == null || user.getId() == null) {
            return false;
        }

        Set<String> roles = normalizedUserRoles(user);
        return roles.contains("EMPLOYEE")
                && !roles.contains("MANAGER")
                && !roles.contains("PROJECT_MANAGER")
                && !roles.contains("TEAM_MANAGER")
                && !roles.contains("DEPARTMENT_HEAD")
                && !roles.contains("DEPARTMENTHEAD")
                && !roles.contains("HR")
                && !roles.contains("HRADMIN")
                && !roles.contains("CEO")
                && !roles.contains("EXECUTIVE");
    }

    private Set<String> normalizedUserRoles(User user) {
        Set<String> roles = new LinkedHashSet<>();

        addNormalizedRole(roles, roleFromDashboard(user.getDashboard()));

        if (user.getPosition() != null) {
            addNormalizedRole(roles, user.getPosition().getPositionTitle());
            if (user.getPosition().getRole() != null) {
                addNormalizedRole(roles, user.getPosition().getRole().getName());
            }
        }

        addNormalizedRoles(roles, userRepository.findNormalizedRoleNamesByUserId(user.getId()));

        return roles;
    }

    private void addNormalizedRoles(Set<String> roles, Collection<String> values) {
        if (values == null) {
            return;
        }
        values.forEach(value -> addNormalizedRole(roles, value));
    }

    private void addNormalizedRole(Set<String> roles, String value) {
        String role = normalizeRole(value);
        if (role == null || role.isBlank()) {
            return;
        }

        roles.add(role);

        if (role.equals("PROJECT_MANAGER") || role.equals("TEAM_MANAGER") || role.contains("MANAGER")) {
            roles.add("MANAGER");
        }

        if (role.equals("DEPARTMENT_HEAD") || role.equals("DEPARTMENTHEAD") || role.equals("DEPT_HEAD") || role.equals("HEAD_OF_DEPARTMENT")) {
            roles.add("DEPARTMENT_HEAD");
        }
    }

    private String roleFromDashboard(String dashboard) {
        if (dashboard == null || dashboard.isBlank()) {
            return null;
        }

        return switch (dashboard) {
            case "EMPLOYEE_DASHBOARD" -> "EMPLOYEE";
            case "MANAGER_DASHBOARD" -> "MANAGER";
            case "DEPARTMENT_HEAD_DASHBOARD", "DEPARTMENTHEAD_DASHBOARD", "DEPT_HEAD_DASHBOARD" -> "DEPARTMENT_HEAD";
            case "HR_DASHBOARD" -> "HR";
            case "HRADMIN_DASHBOARD", "ADMIN_DASHBOARD" -> "HRADMIN";
            case "EXECUTIVE_DASHBOARD", "CEO_DASHBOARD" -> "CEO";
            default -> null;
        };
    }

    private String normalizeRole(String value) {
        if (value == null) {
            return null;
        }

        return value
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("([a-z])([A-Z])", "$1_$2")
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
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
        form.setStartNotificationSentAt(null);
        form.setCloseNotificationSentAt(null);

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