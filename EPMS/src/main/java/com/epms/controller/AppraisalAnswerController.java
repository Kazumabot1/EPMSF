package com.epms.controller;

import com.epms.dto.AppraisalAnswerRequestDto;
import com.epms.dto.AppraisalAnswerResponseDto;
import com.epms.service.AppraisalAnswerService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appraisal-answers")
@RequiredArgsConstructor
public class AppraisalAnswerController {

    private final AppraisalAnswerService appraisalAnswerService;

    @PostMapping
    public ResponseEntity<AppraisalAnswerResponseDto> createAppraisalAnswer(
            @Valid @RequestBody AppraisalAnswerRequestDto requestDto) {
        AppraisalAnswerResponseDto responseDto = appraisalAnswerService.createAppraisalAnswer(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppraisalAnswerResponseDto>> getAllAppraisalAnswers() {
        return ResponseEntity.ok(appraisalAnswerService.getAllAppraisalAnswers());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppraisalAnswerResponseDto> getAppraisalAnswerById(@PathVariable Integer id) {
        return ResponseEntity.ok(appraisalAnswerService.getAppraisalAnswerById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppraisalAnswerResponseDto> updateAppraisalAnswer(
            @PathVariable Integer id,
            @Valid @RequestBody AppraisalAnswerRequestDto requestDto) {
        return ResponseEntity.ok(appraisalAnswerService.updateAppraisalAnswer(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppraisalAnswer(@PathVariable Integer id) {
        appraisalAnswerService.deleteAppraisalAnswer(id);
        return ResponseEntity.noContent().build();
    }
}

