package com.epms.controller;

import com.epms.dto.DepartmentKpiCycleResponseDto;
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

