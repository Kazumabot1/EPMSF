package com.epms.controller;

import com.epms.dto.FeedbackFormCreateRequest;
import com.epms.dto.FeedbackQuestionRequest;
import com.epms.dto.FeedbackSectionRequest;
import com.epms.dto.GenericApiResponse;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackSection;
import com.epms.entity.enums.FeedbackFormStatus;
import com.epms.service.FeedbackFormService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@RestController
@RequestMapping("/api/v1/feedback/forms")
@RequiredArgsConstructor
public class FeedbackFormController {

    private final FeedbackFormService feedbackFormService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<Long>> createFeedbackForm(@Valid @RequestBody FeedbackFormCreateRequest request) {
        log.info("Received request to create feedback form: {}", request.getFormName());
        ensureHrOrAdmin();

        FeedbackForm form = mapRequestToForm(request);
        form.setStatus(FeedbackFormStatus.DRAFT);
        form.setCreatedByUserId(SecurityUtils.currentUserId().longValue());

        FeedbackForm createdForm = feedbackFormService.createForm(form);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Feedback form created successfully", createdForm.getId()));
    }

    @PutMapping("/{formId}")
    public ResponseEntity<GenericApiResponse<Long>> updateFeedbackForm(
            @PathVariable Long formId,
            @Valid @RequestBody FeedbackFormCreateRequest request) {
        ensureHrOrAdmin();
        FeedbackForm form = mapRequestToForm(request);
        form.setCreatedByUserId(SecurityUtils.currentUserId().longValue());
        FeedbackForm updated = feedbackFormService.updateFormStructure(formId, form);
        return ResponseEntity.ok(GenericApiResponse.success("Feedback form updated successfully", updated.getId()));
    }

    @PostMapping("/{formId}/versions")
    public ResponseEntity<GenericApiResponse<Long>> createFeedbackFormVersion(
            @PathVariable Long formId,
            @Valid @RequestBody FeedbackFormCreateRequest request) {
        ensureHrOrAdmin();
        FeedbackForm form = mapRequestToForm(request);
        form.setStatus(FeedbackFormStatus.DRAFT);
        form.setCreatedByUserId(SecurityUtils.currentUserId().longValue());
        FeedbackForm version = feedbackFormService.createNewVersion(formId, form);
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Feedback form version created successfully", version.getId()));
    }

    @GetMapping("/{formId}/versions")
    public ResponseEntity<GenericApiResponse<List<Long>>> getFeedbackFormVersions(@PathVariable Long formId) {
        ensureHrOrAdmin();
        List<Long> versions = feedbackFormService.getFormVersions(formId).stream()
                .map(FeedbackForm::getId)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Feedback form versions retrieved successfully", versions));
    }

    private FeedbackForm mapRequestToForm(FeedbackFormCreateRequest request) {
        FeedbackForm form = new FeedbackForm();
        form.setFormName(request.getFormName());
        form.setAnonymousAllowed(request.getAnonymousAllowed());

        List<FeedbackSection> sections = new ArrayList<>();
        for (FeedbackSectionRequest sectionReq : request.getSections()) {
            FeedbackSection section = new FeedbackSection();
            section.setTitle(sectionReq.getTitle());
            section.setOrderNo(sectionReq.getOrderNo());

            List<FeedbackQuestion> questions = new ArrayList<>();
            for (FeedbackQuestionRequest qReq : sectionReq.getQuestions()) {
                FeedbackQuestion question = new FeedbackQuestion();
                question.setQuestionText(qReq.getQuestionText());
                question.setQuestionOrder(qReq.getQuestionOrder());
                question.setRatingScaleId(qReq.getRatingScaleId());
                question.setWeight(qReq.getWeight());
                question.setIsRequired(qReq.getIsRequired());
                questions.add(question);
            }
            section.setQuestions(questions);
            sections.add(section);
        }
        form.setSections(sections);
        return form;
    }

    private void ensureHrOrAdmin() {
        List<String> roles = SecurityUtils.currentUser().getRoles();
        boolean authorized = roles != null && roles.stream()
                .map(String::toUpperCase)
                .anyMatch(role -> role.equals("HR") || role.equals("ADMIN") || role.equals("ROLE_HR") || role.equals("ROLE_ADMIN"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR/Admin can manage feedback forms.");
        }
    }
}
