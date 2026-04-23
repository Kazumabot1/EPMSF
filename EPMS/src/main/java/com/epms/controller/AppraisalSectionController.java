package com.epms.controller;

import com.epms.dto.AppraisalSectionRequestDto;
import com.epms.dto.AppraisalSectionResponseDto;
import com.epms.service.AppraisalSectionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appraisal-sections")
@RequiredArgsConstructor
public class AppraisalSectionController {

    private final AppraisalSectionService appraisalSectionService;

    @PostMapping
    public ResponseEntity<AppraisalSectionResponseDto> createAppraisalSection(
            @Valid @RequestBody AppraisalSectionRequestDto requestDto) {
        AppraisalSectionResponseDto responseDto = appraisalSectionService.createAppraisalSection(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppraisalSectionResponseDto>> getAllAppraisalSections() {
        return ResponseEntity.ok(appraisalSectionService.getAllAppraisalSections());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppraisalSectionResponseDto> getAppraisalSectionById(@PathVariable Long id) {
        return ResponseEntity.ok(appraisalSectionService.getAppraisalSectionById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppraisalSectionResponseDto> updateAppraisalSection(
            @PathVariable Long id,
            @Valid @RequestBody AppraisalSectionRequestDto requestDto) {
        return ResponseEntity.ok(appraisalSectionService.updateAppraisalSection(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppraisalSection(@PathVariable Long id) {
        appraisalSectionService.deleteAppraisalSection(id);
        return ResponseEntity.noContent().build();
    }
}
