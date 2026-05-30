package com.epms.controller;

import com.epms.dto.FeedbackFormCreateRequest;
import com.epms.dto.FeedbackFormDetailResponse;
import com.epms.dto.FeedbackFormOptionResponse;
import com.epms.dto.FeedbackQuestionRequest;
import com.epms.dto.FeedbackSectionRequest;
import com.epms.dto.GenericApiResponse;
import com.epms.entity.FeedbackForm;
import com.epms.entity.FeedbackQuestion;
import com.epms.entity.FeedbackSection;
import com.epms.entity.enums.FeedbackFormStatus;
import com.epms.exception.UnauthorizedActionException;
import com.epms.security.SecurityUtils;
import com.epms.service.FeedbackFormService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.ArrayList;
import java.util.List;
import java.util.Locale;
import java.util.stream.Collectors;

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
    public ResponseEntity<GenericApiResponse<List<FeedbackFormOptionResponse>>> getFeedbackFormVersions(@PathVariable Long formId) {
        ensureHrOrAdmin();
        List<FeedbackFormOptionResponse> versions = feedbackFormService.getFormVersions(formId).stream()
                .map(this::toOptionResponse)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Feedback form versions retrieved successfully", versions));
    }

    @PutMapping("/{formId}/status")
    public ResponseEntity<GenericApiResponse<String>> changeFeedbackFormStatus(
            @PathVariable Long formId,
            @RequestParam FeedbackFormStatus status) {
        ensureHrOrAdmin();
        feedbackFormService.changeFormStatus(formId, status);
        return ResponseEntity.ok(GenericApiResponse.success("Feedback form status updated successfully", status.name()));
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<FeedbackFormOptionResponse>>> getAllFeedbackForms() {
        ensureHrOrAdmin();
        List<FeedbackFormOptionResponse> response = feedbackFormService.getAllForms().stream()
                .map(this::toOptionResponse)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Feedback forms retrieved successfully", response));
    }

    @GetMapping("/active")
    public ResponseEntity<GenericApiResponse<List<FeedbackFormOptionResponse>>> getActiveFeedbackForms() {
        ensureHrOrAdmin();
        List<FeedbackFormOptionResponse> response = feedbackFormService.getAllActiveForms().stream()
                .map(this::toOptionResponse)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Active feedback forms retrieved successfully", response));
    }

    @GetMapping("/{formId}")
    public ResponseEntity<GenericApiResponse<FeedbackFormDetailResponse>> getFeedbackFormDetail(@PathVariable Long formId) {
        ensureHrOrAdmin();
        FeedbackForm form = feedbackFormService.getFormById(formId);
        return ResponseEntity.ok(GenericApiResponse.success("Feedback form detail retrieved successfully", toDetailResponse(form)));
    }

    private FeedbackFormOptionResponse toOptionResponse(FeedbackForm form) {
        return FeedbackFormOptionResponse.builder()
                .id(form.getId())
                .formName(form.getFormName())
                .anonymousAllowed(form.getAnonymousAllowed())
                .rootFormId(form.getRootFormId())
                .versionNumber(form.getVersionNumber())
                .status(form.getStatus().name())
                .createdByUserId(form.getCreatedByUserId())
                .createdAt(form.getCreatedAt())
                .build();
    }

    private FeedbackFormDetailResponse toDetailResponse(FeedbackForm form) {
        return FeedbackFormDetailResponse.builder()
                .id(form.getId())
                .formName(form.getFormName())
                .anonymousAllowed(form.getAnonymousAllowed())
                .rootFormId(form.getRootFormId())
                .versionNumber(form.getVersionNumber())
                .status(form.getStatus().name())
                .createdByUserId(form.getCreatedByUserId())
                .createdAt(form.getCreatedAt())
                .sections(form.getSections().stream().map(sec -> {
                    List<FeedbackFormDetailResponse.QuestionDetail> questions = sec.getQuestions().stream().map(q ->
                            FeedbackFormDetailResponse.QuestionDetail.builder()
                                    .id(q.getId())
                                    .questionText(q.getQuestionText())
                                    .questionOrder(q.getQuestionOrder())
                                    .ratingScaleId(q.getRatingScaleId() == null ? null : q.getRatingScaleId().longValue())
                                    .weight(q.getWeight())
                                    .isRequired(q.getIsRequired())
                                    .build()
                    ).collect(Collectors.toList());
                    return FeedbackFormDetailResponse.SectionDetail.builder()
                            .id(sec.getId())
                            .title(sec.getTitle())
                            .orderNo(sec.getOrderNo())
                            .questions(questions)
                            .build();
                }).collect(Collectors.toList()))
                .build();
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
                .filter(role -> role != null && !role.isBlank())
                .map(this::normalizeRole)
                .anyMatch(role -> role.equals("HR")
                        || role.equals("HRADMIN")
                        || role.equals("HR_ADMIN")
                        || role.equals("HR_MANAGER")
                        || role.equals("HUMAN_RESOURCES")
                        || role.equals("HUMAN_RESOURCE"));
        if (!authorized) {
            throw new UnauthorizedActionException("Only HR or HR Admin can manage feedback forms.");
        }
    }

    private String normalizeRole(String role) {
        return role
                .replaceFirst("(?i)^ROLE_", "")
                .trim()
                .replaceAll("[^A-Za-z0-9]+", "_")
                .replaceAll("^_+|_+$", "")
                .toUpperCase(Locale.ROOT);
    }
}
