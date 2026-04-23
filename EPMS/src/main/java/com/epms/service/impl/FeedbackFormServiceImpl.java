package com.epms.service.impl;

import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackSection;
import com.epms.entity.enums.FeedbackFormStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackFormRepository;
import com.epms.service.AuditLogService;
import com.epms.service.FeedbackFormService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.HashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackFormServiceImpl implements FeedbackFormService {

    private final FeedbackFormRepository feedbackFormRepository;
    private final AuditLogService auditLogService;

    @Override
    @Transactional
    public FeedbackForm createForm(FeedbackForm form) {
        log.info("Creating new Feedback Form: {}", form.getFormName());
        validateForm(form);

        form.getSections().forEach(s -> {
            s.setForm(form);
            s.getQuestions().forEach(q -> q.setSection(s));
        });

        FeedbackForm savedForm = feedbackFormRepository.save(form);
        if (savedForm.getRootFormId() == null) {
            savedForm.setRootFormId(savedForm.getId());
            savedForm = feedbackFormRepository.save(savedForm);
        }
        auditLogService.log(
                form.getCreatedByUserId() != null ? form.getCreatedByUserId().intValue() : null,
                "CREATE_FORM",
                "FEEDBACK_FORM",
                savedForm.getId().intValue(),
                null,
                "name=" + savedForm.getFormName() + ",version=" + savedForm.getVersionNumber(),
                "Feedback form created"
        );
        log.info("Successfully created Feedback Form with ID: {}", savedForm.getId());
        return savedForm;
    }

    @Override
    @Transactional
    public FeedbackForm updateFormStructure(Long formId, FeedbackForm updatedForm) {
        FeedbackForm existing = feedbackFormRepository.findByIdWithSectionsAndQuestions(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback Form not found with ID: " + formId));
        if (existing.getStatus() != FeedbackFormStatus.DRAFT) {
            throw new BusinessValidationException("Only DRAFT forms can be edited.");
        }

        existing.setFormName(updatedForm.getFormName());
        existing.setAnonymousAllowed(updatedForm.getAnonymousAllowed());
        existing.getSections().clear();
        updatedForm.getSections().forEach(section -> {
            section.setForm(existing);
            section.getQuestions().forEach(question -> question.setSection(section));
            existing.getSections().add(section);
        });
        validateForm(existing);
        FeedbackForm saved = feedbackFormRepository.save(existing);
        auditLogService.log(
                updatedForm.getCreatedByUserId() != null ? updatedForm.getCreatedByUserId().intValue() : null,
                "UPDATE_CRITERIA",
                "FEEDBACK_FORM",
                saved.getId().intValue(),
                null,
                "criteria updated",
                "Feedback criteria rows updated"
        );
        return saved;
    }

    @Override
    @Transactional
    public FeedbackForm createNewVersion(Long formId, FeedbackForm newForm) {
        FeedbackForm baseForm = feedbackFormRepository.findByIdWithSectionsAndQuestions(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback Form not found with ID: " + formId));
        Long rootId = baseForm.getRootFormId() != null ? baseForm.getRootFormId() : baseForm.getId();
        int latestVersion = feedbackFormRepository.findTopByRootFormIdOrderByVersionNumberDesc(rootId)
                .map(FeedbackForm::getVersionNumber)
                .orElse(baseForm.getVersionNumber() != null ? baseForm.getVersionNumber() : 1);

        baseForm.setStatus(FeedbackFormStatus.ARCHIVED);
        feedbackFormRepository.save(baseForm);

        newForm.setRootFormId(rootId);
        newForm.setVersionNumber(latestVersion + 1);
        validateForm(newForm);
        newForm.getSections().forEach(s -> {
            s.setForm(newForm);
            s.getQuestions().forEach(q -> q.setSection(s));
        });
        FeedbackForm savedVersion = feedbackFormRepository.save(newForm);
        auditLogService.log(
                newForm.getCreatedByUserId() != null ? newForm.getCreatedByUserId().intValue() : null,
                "CREATE_VERSION",
                "FEEDBACK_FORM",
                savedVersion.getId().intValue(),
                "baseFormId=" + baseForm.getId() + ",version=" + baseForm.getVersionNumber(),
                "newVersion=" + savedVersion.getVersionNumber(),
                "New feedback form version created"
        );
        return savedVersion;
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackForm getFormById(Long formId) {
        return feedbackFormRepository.findByIdWithSectionsAndQuestions(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback Form not found with ID: " + formId));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackForm> getAllActiveForms() {
        return feedbackFormRepository.findByStatus(com.epms.entity.enums.FeedbackFormStatus.ACTIVE);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackForm> getFormVersions(Long formId) {
        FeedbackForm form = feedbackFormRepository.findById(formId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback Form not found with ID: " + formId));
        Long rootId = form.getRootFormId() != null ? form.getRootFormId() : form.getId();
        List<FeedbackForm> versions = feedbackFormRepository.findByRootFormIdOrderByVersionNumberAsc(rootId);
        if (versions.isEmpty()) {
            return List.of(form);
        }
        return versions;
    }

    private void validateForm(FeedbackForm form) {
        if (form.getSections() == null || form.getSections().isEmpty()) {
            throw new BusinessValidationException("Form must contain at least one section.");
        }

        for (FeedbackSection section : form.getSections()) {
            if (section.getQuestions() == null || section.getQuestions().isEmpty()) {
                throw new BusinessValidationException("Section '" + section.getTitle() + "' must contain at least one question.");
            }

            Set<Integer> orderSet = new HashSet<>();
            for (FeedbackQuestion question : section.getQuestions()) {
                if (!orderSet.add(question.getQuestionOrder())) {
                    throw new BusinessValidationException("Duplicate question order " + question.getQuestionOrder() + " found in section '" + section.getTitle() + "'.");
                }
            }
        }

        Set<Long> ratingScales = form.getSections().stream()
                .flatMap(section -> section.getQuestions().stream())
                .map(FeedbackQuestion::getRatingScaleId)
                .collect(java.util.stream.Collectors.toSet());
        if (ratingScales.size() > 1) {
            throw new BusinessValidationException("All questions in the same form must use one unified rating scale.");
        }
    }
}
