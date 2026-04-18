package com.epms.controller;

import com.epms.dto.AppraisalResultRequestDto;
import com.epms.dto.AppraisalResultResponseDto;
import com.epms.service.AppraisalResultService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appraisal-results")
@RequiredArgsConstructor
public class AppraisalResultController {

    private final AppraisalResultService appraisalResultService;

    @PostMapping
    public ResponseEntity<AppraisalResultResponseDto> createAppraisalResult(
            @Valid @RequestBody AppraisalResultRequestDto requestDto) {
        AppraisalResultResponseDto responseDto = appraisalResultService.createAppraisalResult(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppraisalResultResponseDto>> getAllAppraisalResults() {
        return ResponseEntity.ok(appraisalResultService.getAllAppraisalResults());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppraisalResultResponseDto> getAppraisalResultById(@PathVariable Integer id) {
        return ResponseEntity.ok(appraisalResultService.getAppraisalResultById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppraisalResultResponseDto> updateAppraisalResult(
            @PathVariable Integer id,
            @Valid @RequestBody AppraisalResultRequestDto requestDto) {
        return ResponseEntity.ok(appraisalResultService.updateAppraisalResult(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppraisalResult(@PathVariable Integer id) {
        appraisalResultService.deleteAppraisalResult(id);
        return ResponseEntity.noContent().build();
    }
}

