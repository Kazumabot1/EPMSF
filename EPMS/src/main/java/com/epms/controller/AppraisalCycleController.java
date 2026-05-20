package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.appraisal.AppraisalCycleRequest;
import com.epms.dto.appraisal.AppraisalCycleResponse;
import com.epms.dto.appraisal.AppraisalTemplateCycleRequest;
import com.epms.entity.enums.AppraisalCycleStatus;
import com.epms.security.SecurityUtils;
import com.epms.service.AppraisalCycleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr/appraisal/cycles")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AppraisalCycleController {

    private final AppraisalCycleService appraisalCycleService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<AppraisalCycleResponse>> createCycle(
            @Valid @RequestBody AppraisalCycleRequest request
    ) {
        AppraisalCycleResponse response = appraisalCycleService.createCycle(
                request,
                SecurityUtils.currentUserId()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Appraisal cycle created", response));
    }

    @PostMapping("/from-template")
    public ResponseEntity<GenericApiResponse<AppraisalCycleResponse>> createTemplateAndCycle(
            @Valid @RequestBody AppraisalTemplateCycleRequest request
    ) {
        AppraisalCycleResponse response = appraisalCycleService.createTemplateAndCycle(
                request,
                SecurityUtils.currentUserId()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Appraisal form template and cycle created", response));
    }

    @PutMapping("/{cycleId}")
    public ResponseEntity<GenericApiResponse<AppraisalCycleResponse>> updateDraftCycle(
            @PathVariable Integer cycleId,
            @Valid @RequestBody AppraisalCycleRequest request
    ) {
        AppraisalCycleResponse response = appraisalCycleService.updateDraftCycle(cycleId, request, SecurityUtils.currentUserId());

        return ResponseEntity.ok(
                GenericApiResponse.success("Draft appraisal cycle updated", response)
        );
    }

    @GetMapping("/{cycleId}")
    public ResponseEntity<GenericApiResponse<AppraisalCycleResponse>> getCycle(
            @PathVariable Integer cycleId
    ) {
        AppraisalCycleResponse response = appraisalCycleService.getCycle(cycleId);

        return ResponseEntity.ok(
                GenericApiResponse.success("Appraisal cycle fetched", response)
        );
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AppraisalCycleResponse>>> getCycles(
            @RequestParam(required = false) AppraisalCycleStatus status
    ) {
        List<AppraisalCycleResponse> response = appraisalCycleService.getCycles(status);

        return ResponseEntity.ok(
                GenericApiResponse.success("Appraisal cycles fetched", response)
        );
    }

    @PatchMapping("/{cycleId}/activate")
    public ResponseEntity<GenericApiResponse<AppraisalCycleResponse>> activateCycle(
            @PathVariable Integer cycleId
    ) {
        AppraisalCycleResponse response = appraisalCycleService.activateCycle(cycleId);

        return ResponseEntity.ok(
                GenericApiResponse.success("Appraisal cycle activated", response)
        );
    }

    @PatchMapping("/{cycleId}/lock")
    public ResponseEntity<GenericApiResponse<AppraisalCycleResponse>> lockCycle(
            @PathVariable Integer cycleId
    ) {
        AppraisalCycleResponse response = appraisalCycleService.lockCycle(cycleId);

        return ResponseEntity.ok(
                GenericApiResponse.success("Appraisal cycle locked", response)
        );
    }

    @PatchMapping("/{cycleId}/complete")
    public ResponseEntity<GenericApiResponse<AppraisalCycleResponse>> completeCycle(
            @PathVariable Integer cycleId
    ) {
        AppraisalCycleResponse response = appraisalCycleService.completeCycle(cycleId);

        return ResponseEntity.ok(
                GenericApiResponse.success("Appraisal cycle completed", response)
        );
    }

    @PostMapping("/{cycleId}/reuse")
    public ResponseEntity<GenericApiResponse<AppraisalCycleResponse>> reuseCycle(
            @PathVariable Integer cycleId,
            @Valid @RequestBody AppraisalCycleRequest request
    ) {
        AppraisalCycleResponse response = appraisalCycleService.reuseCycle(
                cycleId,
                request,
                SecurityUtils.currentUserId()
        );

        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Appraisal cycle re-used", response));
    }
}