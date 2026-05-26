package com.epms.controller;

import com.epms.dto.DepartmentKpiResultDto;
import com.epms.service.DepartmentKpiService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/department-head/department-kpis")
@RequiredArgsConstructor
public class DepartmentHeadKpiController {
    private final DepartmentKpiService service;

    @GetMapping("/results")
    public ResponseEntity<List<DepartmentKpiResultDto>> results() {
        return ResponseEntity.ok(service.listDepartmentHeadResults());
    }
}
