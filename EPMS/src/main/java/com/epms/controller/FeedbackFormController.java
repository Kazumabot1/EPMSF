package com.epms.controller;

import com.epms.dto.FeedbackFormCreateRequest;
import com.epms.dto.FeedbackQuestionRequest;
import com.epms.dto.FeedbackSectionRequest;
import com.epms.dto.GenericApiResponse;
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

        FeedbackForm form = new FeedbackForm();
        form.setFormName(request.getFormName());
        form.setAnonymousAllowed(request.getAnonymousAllowed());
        form.setStatus(FeedbackFormStatus.DRAFT);
        // User context to be injected via Principal/SecurityContext later
        form.setCreatedByUserId(1L);

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

        FeedbackForm createdForm = feedbackFormService.createForm(form);

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Feedback form created successfully", createdForm.getId()));
    }
}
