package com.epms.controller;

import com.epms.dto.AppraisalRequestDto;
import com.epms.dto.AppraisalResponseDto;
import com.epms.service.AppraisalService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appraisals")
@RequiredArgsConstructor
public class AppraisalController {

    private final AppraisalService appraisalService;

    @PostMapping
    public ResponseEntity<AppraisalResponseDto> createAppraisal(
            @Valid @RequestBody AppraisalRequestDto requestDto) {
        AppraisalResponseDto responseDto = appraisalService.createAppraisal(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppraisalResponseDto>> getAllAppraisals() {
        return ResponseEntity.ok(appraisalService.getAllAppraisals());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppraisalResponseDto> getAppraisalById(@PathVariable Integer id) {
        return ResponseEntity.ok(appraisalService.getAppraisalById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppraisalResponseDto> updateAppraisal(
            @PathVariable Integer id,
            @Valid @RequestBody AppraisalRequestDto requestDto) {
        return ResponseEntity.ok(appraisalService.updateAppraisal(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppraisal(@PathVariable Integer id) {
        appraisalService.deleteAppraisal(id);
        return ResponseEntity.noContent().build();
    }
}

