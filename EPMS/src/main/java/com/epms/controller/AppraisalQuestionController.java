package com.epms.controller;

import com.epms.dto.AppraisalQuestionRequestDto;
import com.epms.dto.AppraisalQuestionResponseDto;
import com.epms.service.AppraisalQuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appraisal-questions")
@RequiredArgsConstructor
public class AppraisalQuestionController {

    private final AppraisalQuestionService appraisalQuestionService;

    @PostMapping
    public ResponseEntity<AppraisalQuestionResponseDto> createAppraisalQuestion(
            @Valid @RequestBody AppraisalQuestionRequestDto requestDto) {
        AppraisalQuestionResponseDto responseDto = appraisalQuestionService.createAppraisalQuestion(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppraisalQuestionResponseDto>> getAllAppraisalQuestions() {
        return ResponseEntity.ok(appraisalQuestionService.getAllAppraisalQuestions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppraisalQuestionResponseDto> getAppraisalQuestionById(@PathVariable Long id) {
        return ResponseEntity.ok(appraisalQuestionService.getAppraisalQuestionById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppraisalQuestionResponseDto> updateAppraisalQuestion(
            @PathVariable Long id,
            @Valid @RequestBody AppraisalQuestionRequestDto requestDto) {
        return ResponseEntity.ok(appraisalQuestionService.updateAppraisalQuestion(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppraisalQuestion(@PathVariable Long id) {
        appraisalQuestionService.deleteAppraisalQuestion(id);
        return ResponseEntity.noContent().build();
    }
}
