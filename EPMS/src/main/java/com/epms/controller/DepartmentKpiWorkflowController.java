package com.epms.controller;

import com.epms.dto.*;
import com.epms.service.DepartmentKpiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/hr/department-kpi-workflow")
@RequiredArgsConstructor
public class DepartmentKpiWorkflowController {
    private final DepartmentKpiService service;

    @GetMapping("/templates")
    public ResponseEntity<List<DepartmentKpiTemplateSummaryDto>> templates() {
        return ResponseEntity.ok(service.listWorkflowTemplates());
    }

    @GetMapping("/assignments")
    public ResponseEntity<List<DepartmentKpiResultDto>> assignments(@RequestParam Integer templateId, @RequestParam(required = false) Integer cyclePeriodId) {
        return ResponseEntity.ok(service.listAssignments(templateId, cyclePeriodId));
    }

    @PutMapping("/results/{resultId}/scores")
    public ResponseEntity<DepartmentKpiResultDto> updateScores(@PathVariable Integer resultId, @Valid @RequestBody UpdateDepartmentKpiScoresRequest request) {
        return ResponseEntity.ok(service.updateScores(resultId, request));
    }

    @PostMapping("/results/{resultId}/finalize")
    public ResponseEntity<DepartmentKpiResultDto> finalizeResult(@PathVariable Integer resultId) {
        return ResponseEntity.ok(service.finalizeResult(resultId));
    }

    @PostMapping("/finalize")
    public ResponseEntity<Map<String, Integer>> finalizeTemplate(@Valid @RequestBody FinalizeDepartmentKpiResultRequest request) {
        return ResponseEntity.ok(Map.of("finalized", service.finalizeTemplate(request.getTemplateId(), request.getCyclePeriodId())));
    }

    @GetMapping("/finalized-results")
    public ResponseEntity<List<DepartmentKpiResultDto>> finalizedResults() {
        return ResponseEntity.ok(service.listFinalizedResults());
    }

    @GetMapping("/in-progress-results")
    public ResponseEntity<List<DepartmentKpiResultDto>> inProgressResults() {
        return ResponseEntity.ok(service.listInProgressResults());
    }
}
