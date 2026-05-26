package com.epms.controller;

import com.epms.dto.DepartmentKpiCycleResponseDto;
import com.epms.dto.DepartmentKpiResultDto;
import com.epms.dto.KpiEarlyCloseReviewRequestDTO;
import com.epms.service.DepartmentKpiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/executive/department-kpi-approvals")
@RequiredArgsConstructor
public class DepartmentKpiApprovalController {

    private final DepartmentKpiService departmentKpiService;

    @GetMapping
    public ResponseEntity<List<DepartmentKpiCycleResponseDto>> listPending() {
        return ResponseEntity.ok(departmentKpiService.listPendingEarlyCloseRequests());
    }

    @GetMapping("/finalization-requests")
    public ResponseEntity<List<DepartmentKpiResultDto>> listPendingFinalizationRequests() {
        return ResponseEntity.ok(departmentKpiService.listPendingFinalizationRequests());
    }

    @PostMapping("/finalization-requests/{resultId}/approve")
    public ResponseEntity<DepartmentKpiResultDto> approveFinalization(
            @PathVariable Integer resultId,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        return ResponseEntity.ok(departmentKpiService.approveFinalization(
                resultId,
                request == null ? null : request.getReviewReason()
        ));
    }

    @PostMapping("/finalization-requests/{resultId}/reject")
    public ResponseEntity<DepartmentKpiResultDto> rejectFinalization(
            @PathVariable Integer resultId,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        return ResponseEntity.ok(departmentKpiService.rejectFinalization(
                resultId,
                request == null ? null : request.getReviewReason()
        ));
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<DepartmentKpiCycleResponseDto> approve(
            @PathVariable Integer id,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        return ResponseEntity.ok(departmentKpiService.approveEarlyClose(
                id,
                request == null ? null : request.getReviewReason()
        ));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<DepartmentKpiCycleResponseDto> reject(
            @PathVariable Integer id,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        return ResponseEntity.ok(departmentKpiService.rejectEarlyClose(
                id,
                request == null ? null : request.getReviewReason()
        ));
    }
}

