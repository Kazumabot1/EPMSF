package com.epms.controller;

import com.epms.dto.DepartmentKpiCycleRequestDto;
import com.epms.dto.DepartmentKpiCycleResponseDto;
import com.epms.dto.KpiTemplateCycleStatusRequestDTO;
import com.epms.service.DepartmentKpiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/hr/department-kpi-cycles")
@RequiredArgsConstructor
public class DepartmentKpiCycleController {

    private final DepartmentKpiService service;

    @PostMapping
    public ResponseEntity<DepartmentKpiCycleResponseDto> create(@Valid @RequestBody DepartmentKpiCycleRequestDto request) {
        return new ResponseEntity<>(service.createCycle(request), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DepartmentKpiCycleResponseDto> update(
            @PathVariable Integer id,
            @Valid @RequestBody DepartmentKpiCycleRequestDto request
    ) {
        return ResponseEntity.ok(service.updateCycle(id, request));
    }

    @GetMapping
    public ResponseEntity<List<DepartmentKpiCycleResponseDto>> list() {
        return ResponseEntity.ok(service.listCycles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentKpiCycleResponseDto> get(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getCycle(id));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<DepartmentKpiCycleResponseDto> updateStatus(
            @PathVariable Integer id,
            @Valid @RequestBody KpiTemplateCycleStatusRequestDTO request
    ) {
        return ResponseEntity.ok(service.updateCycleStatus(id, request));
    }
}
