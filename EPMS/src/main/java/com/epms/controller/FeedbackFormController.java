package com.epms.controller;

import com.epms.dto.FeedbackFormCreateRequest;
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

import java.time.LocalDateTime;
import java.util.stream.Collectors;

@Slf4j
@RestController
@RequestMapping("/api/v1/feedback/forms")
@RequiredArgsConstructor
public class FeedbackFormController {

    private final FeedbackFormService feedbackFormService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<Long>> createForm(@Valid @RequestBody FeedbackFormCreateRequest request) {
        log.info("Received request to create Feedback Form: {}", request.getFormName());
        
        // Manual mapping from DTO to Entity
        FeedbackForm form = new FeedbackForm();
        form.setFormName(request.getFormName());
        form.setAnonymousAllowed(request.getAnonymousAllowed());
        form.setStatus(FeedbackFormStatus.DRAFT);
        // Security Context fallback
        form.setCreatedByUserId(1L); 

        form.setSections(request.getSections().stream().map(sectionRequest -> {
            FeedbackSection section = new FeedbackSection();
            section.setTitle(sectionRequest.getTitle());
            section.setOrderNo(sectionRequest.getOrderNo());
            
            section.setQuestions(sectionRequest.getQuestions().stream().map(qRequest -> {
                FeedbackQuestion question = new FeedbackQuestion();
                question.setQuestionText(qRequest.getQuestionText());
                question.setQuestionOrder(qRequest.getQuestionOrder());
                question.setRatingScaleId(qRequest.getRatingScaleId());
                question.setWeight(qRequest.getWeight());
                question.setIsRequired(qRequest.getIsRequired());
                return question;
            }).collect(Collectors.toList()));
            
            return section;
        }).collect(Collectors.toList()));

        FeedbackForm savedForm = feedbackFormService.createForm(form);

        GenericApiResponse<Long> response = GenericApiResponse.<Long>builder()
                .success(true)
                .message("Feedback Form created successfully")
                .data(savedForm.getId())
                .timestamp(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }
}
