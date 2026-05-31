package com.epms.controller;

import com.epms.dto.DepartmentKpiCycleResponseDto;
import com.epms.dto.DepartmentKpiResultDto;
import com.epms.dto.KpiEarlyCloseReviewRequestDTO;
import com.epms.service.DepartmentKpiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/executive/department-kpi-approvals")
@RequiredArgsConstructor
@PreAuthorize(
        "hasAnyRole('ADMIN','HRADMIN','HR_ADMIN') "
                + "or hasAnyAuthority('ROLE_ADMIN','ROLE_HRADMIN','ROLE_HR_ADMIN','ADMIN','HRADMIN','HR_ADMIN') "
                + "or authentication.principal.dashboard == 'ADMIN_DASHBOARD' "
                + "or authentication.principal.dashboard == 'HRADMIN_DASHBOARD' "
                + "or authentication.principal.dashboard == 'HR_ADMIN_DASHBOARD'"
)
public class DepartmentKpiApprovalController {

    private final DepartmentKpiService service;

    @GetMapping("/cycles")
    public ResponseEntity<List<DepartmentKpiCycleResponseDto>> listPendingEarlyCloseRequests() {
        return ResponseEntity.ok(service.listPendingEarlyCloseRequests());
    }

    @PostMapping("/cycles/{id}/approve")
    public ResponseEntity<DepartmentKpiCycleResponseDto> approveEarlyClose(
            @PathVariable Integer id,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        String reviewReason = request == null ? null : request.getReviewReason();
        return ResponseEntity.ok(service.approveEarlyClose(id, reviewReason));
    }

    @PostMapping("/cycles/{id}/reject")
    public ResponseEntity<DepartmentKpiCycleResponseDto> rejectEarlyClose(
            @PathVariable Integer id,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        String reviewReason = request == null ? null : request.getReviewReason();
        return ResponseEntity.ok(service.rejectEarlyClose(id, reviewReason));
    }

    @GetMapping("/finalizations")
    public ResponseEntity<List<DepartmentKpiResultDto>> listPendingFinalizationRequests() {
        return ResponseEntity.ok(service.listPendingFinalizationRequests());
    }

    @PostMapping("/finalizations/{resultId}/approve")
    public ResponseEntity<DepartmentKpiResultDto> approveFinalization(
            @PathVariable Integer resultId,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        String reviewReason = request == null ? null : request.getReviewReason();
        return ResponseEntity.ok(service.approveFinalization(resultId, reviewReason));
    }

    @PostMapping("/finalizations/{resultId}/reject")
    public ResponseEntity<DepartmentKpiResultDto> rejectFinalization(
            @PathVariable Integer resultId,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        String reviewReason = request == null ? null : request.getReviewReason();
        return ResponseEntity.ok(service.rejectFinalization(resultId, reviewReason));
    }
}
