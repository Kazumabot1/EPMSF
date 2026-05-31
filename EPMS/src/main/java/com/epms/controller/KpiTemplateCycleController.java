package com.epms.controller;

import com.epms.dto.KpiCycleActivationReadinessDto;
import com.epms.dto.KpiTemplateCycleRequestDTO;
import com.epms.dto.KpiTemplateCycleResponseDTO;
import com.epms.dto.KpiTemplateCycleStatusRequestDTO;
import com.epms.service.EmployeeKpiWorkflowService;
import com.epms.service.KpiTemplateCycleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr/kpi-template-cycles")
@RequiredArgsConstructor
public class KpiTemplateCycleController {

    private final KpiTemplateCycleService cycleService;
    private final EmployeeKpiWorkflowService employeeKpiWorkflowService;

    @PostMapping
    public ResponseEntity<KpiTemplateCycleResponseDTO> create(@Valid @RequestBody KpiTemplateCycleRequestDTO dto) {
        return new ResponseEntity<>(cycleService.create(dto), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<KpiTemplateCycleResponseDTO> update(
            @PathVariable Integer id,
            @Valid @RequestBody KpiTemplateCycleRequestDTO dto
    ) {
        return ResponseEntity.ok(cycleService.update(id, dto));
    }

    @GetMapping
    public ResponseEntity<List<KpiTemplateCycleResponseDTO>> list() {
        return ResponseEntity.ok(cycleService.list());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KpiTemplateCycleResponseDTO> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(cycleService.getById(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<KpiTemplateCycleResponseDTO> updateStatus(
            @PathVariable Integer id,
            @Valid @RequestBody KpiTemplateCycleStatusRequestDTO request
    ) {
        return ResponseEntity.ok(cycleService.updateStatus(id, request));
    }

    @GetMapping("/{id}/activation-readiness")
    public ResponseEntity<KpiCycleActivationReadinessDto> activationReadiness(@PathVariable Integer id) {
        return ResponseEntity.ok(employeeKpiWorkflowService.buildCycleActivationReadiness(id));
    }
}
