package com.epms.controller;

import com.epms.dto.DepartmentKpiTemplateRequestDto;
import com.epms.dto.DepartmentKpiTemplateResponseDto;
import com.epms.service.DepartmentKpiService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr/department-kpi-templates")
@RequiredArgsConstructor
public class DepartmentKpiTemplateController {
    private final DepartmentKpiService service;

    @PostMapping("/create")
    public ResponseEntity<DepartmentKpiTemplateResponseDto> create(@Valid @RequestBody DepartmentKpiTemplateRequestDto request) {
        return new ResponseEntity<>(service.createTemplate(request), HttpStatus.CREATED);
    }

    @PutMapping("/update/{id}")
    public ResponseEntity<DepartmentKpiTemplateResponseDto> update(@PathVariable Integer id, @Valid @RequestBody DepartmentKpiTemplateRequestDto request) {
        return ResponseEntity.ok(service.updateTemplate(id, request));
    }

    @GetMapping("/list")
    public ResponseEntity<List<DepartmentKpiTemplateResponseDto>> list() {
        return ResponseEntity.ok(service.listTemplates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DepartmentKpiTemplateResponseDto> get(@PathVariable Integer id) {
        return ResponseEntity.ok(service.getTemplate(id));
    }

    @DeleteMapping("/delete/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        service.deleteTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
