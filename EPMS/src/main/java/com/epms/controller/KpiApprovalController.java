package com.epms.controller;

import com.epms.dto.KpiEarlyCloseReviewRequestDTO;
import com.epms.dto.KpiTemplateCycleResponseDTO;
import com.epms.service.KpiTemplateCycleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping({"/api/hradmin/kpi-approvals", "/api/executive/kpi-approvals"})
@RequiredArgsConstructor
public class KpiApprovalController {

    private final KpiTemplateCycleService cycleService;

    @GetMapping
    public ResponseEntity<List<KpiTemplateCycleResponseDTO>> listPending() {
        return ResponseEntity.ok(cycleService.listPendingEarlyCloseRequests());
    }

    @PostMapping("/{id}/approve")
    public ResponseEntity<KpiTemplateCycleResponseDTO> approve(
            @PathVariable Integer id,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        return ResponseEntity.ok(cycleService.approveEarlyClose(
                id,
                request == null ? null : request.getReviewReason()
        ));
    }

    @PostMapping("/{id}/reject")
    public ResponseEntity<KpiTemplateCycleResponseDTO> reject(
            @PathVariable Integer id,
            @Valid @RequestBody(required = false) KpiEarlyCloseReviewRequestDTO request
    ) {
        return ResponseEntity.ok(cycleService.rejectEarlyClose(
                id,
                request == null ? null : request.getReviewReason()
        ));
    }
}
