package com.epms.controller;

import com.epms.dto.AppraisalFormRequestDto;
import com.epms.dto.AppraisalFormResponseDto;
import com.epms.service.AppraisalFormService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appraisal-forms")
@RequiredArgsConstructor
public class AppraisalFormController {

    private final AppraisalFormService appraisalFormService;

    @PostMapping
    public ResponseEntity<AppraisalFormResponseDto> createAppraisalForm(
            @Valid @RequestBody AppraisalFormRequestDto requestDto) {
        AppraisalFormResponseDto responseDto = appraisalFormService.createAppraisalForm(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppraisalFormResponseDto>> getAllAppraisalForms() {
        return ResponseEntity.ok(appraisalFormService.getAllAppraisalForms());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppraisalFormResponseDto> getAppraisalFormById(@PathVariable Long id) {
        return ResponseEntity.ok(appraisalFormService.getAppraisalFormById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppraisalFormResponseDto> updateAppraisalForm(
            @PathVariable Long id,
            @Valid @RequestBody AppraisalFormRequestDto requestDto) {
        return ResponseEntity.ok(appraisalFormService.updateAppraisalForm(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppraisalForm(@PathVariable Long id) {
        appraisalFormService.deleteAppraisalForm(id);
        return ResponseEntity.noContent().build();
    }
}
