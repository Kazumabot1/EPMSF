package com.epms.service.impl;

import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackSection;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackFormRepository;
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

    @Override
    @Transactional
    public FeedbackForm createForm(FeedbackForm form) {
        log.info("Creating new Feedback Form: {}", form.getFormName());
        
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

        form.getSections().forEach(s -> {
            s.setForm(form);
            s.getQuestions().forEach(q -> q.setSection(s));
        });

        FeedbackForm savedForm = feedbackFormRepository.save(form);
        log.info("Successfully created Feedback Form with ID: {}", savedForm.getId());
        return savedForm;
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
}
