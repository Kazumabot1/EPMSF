package com.epms.controller;

import com.epms.dto.FormQuestionRequestDto;
import com.epms.dto.FormQuestionResponseDto;
import com.epms.service.FormQuestionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/form-questions")
@RequiredArgsConstructor
public class FormQuestionController {

    private final FormQuestionService formQuestionService;

    @PostMapping
    public ResponseEntity<FormQuestionResponseDto> createFormQuestion(
            @Valid @RequestBody FormQuestionRequestDto requestDto) {
        FormQuestionResponseDto responseDto = formQuestionService.createFormQuestion(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<FormQuestionResponseDto>> getAllFormQuestions() {
        return ResponseEntity.ok(formQuestionService.getAllFormQuestions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<FormQuestionResponseDto> getFormQuestionById(@PathVariable Long id) {
        return ResponseEntity.ok(formQuestionService.getFormQuestionById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<FormQuestionResponseDto> updateFormQuestion(
            @PathVariable Long id,
            @Valid @RequestBody FormQuestionRequestDto requestDto) {
        return ResponseEntity.ok(formQuestionService.updateFormQuestion(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFormQuestion(@PathVariable Long id) {
        formQuestionService.deleteFormQuestion(id);
        return ResponseEntity.noContent().build();
    }
}

