package com.epms.controller;

import com.epms.dto.AppraisalCycleRequestDto;
import com.epms.dto.AppraisalCycleResponseDto;
import com.epms.service.AppraisalCycleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appraisal-cycles")
@RequiredArgsConstructor
public class AppraisalCycleController {

    private final AppraisalCycleService appraisalCycleService;

    @PostMapping
    public ResponseEntity<AppraisalCycleResponseDto> createAppraisalCycle(
            @Valid @RequestBody AppraisalCycleRequestDto requestDto) {
        AppraisalCycleResponseDto responseDto = appraisalCycleService.createAppraisalCycle(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppraisalCycleResponseDto>> getAllAppraisalCycles() {
        return ResponseEntity.ok(appraisalCycleService.getAllAppraisalCycles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppraisalCycleResponseDto> getAppraisalCycleById(@PathVariable Integer id) {
        return ResponseEntity.ok(appraisalCycleService.getAppraisalCycleById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppraisalCycleResponseDto> updateAppraisalCycle(
            @PathVariable Integer id,
            @Valid @RequestBody AppraisalCycleRequestDto requestDto) {
        return ResponseEntity.ok(appraisalCycleService.updateAppraisalCycle(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppraisalCycle(@PathVariable Integer id) {
        appraisalCycleService.deleteAppraisalCycle(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/lock")
    public ResponseEntity<AppraisalCycleResponseDto> lockAppraisalCycle(@PathVariable Integer id) {
        AppraisalCycleResponseDto cycle = appraisalCycleService.getAppraisalCycleById(id);
        AppraisalCycleRequestDto requestDto = new AppraisalCycleRequestDto();
        requestDto.setName(cycle.getName());
        requestDto.setType(cycle.getType());
        requestDto.setStartDate(cycle.getStartDate());
        requestDto.setEndDate(cycle.getEndDate());
        requestDto.setStatus("LOCKED");
        requestDto.setDynamicType(cycle.getDynamicType());
        requestDto.setDynamicOffsetMonths(cycle.getDynamicOffsetMonths());
        return ResponseEntity.ok(appraisalCycleService.updateAppraisalCycle(id, requestDto));
    }
}
