package com.epms.controller;

import com.epms.dto.KpiUnitRequestDto;
import com.epms.dto.KpiUnitResponseDto;
import com.epms.service.KpiUnitService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/kpi-units")
@RequiredArgsConstructor
public class KpiUnitController {

    private final KpiUnitService kpiUnitService;

    @PostMapping
    public ResponseEntity<KpiUnitResponseDto> createKpiUnit(@Valid @RequestBody KpiUnitRequestDto requestDto) {
        KpiUnitResponseDto responseDto = kpiUnitService.create(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<KpiUnitResponseDto>> getAllKpiUnit() {
        return ResponseEntity.ok(kpiUnitService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KpiUnitResponseDto> getKpiUnitById(@PathVariable Integer id) {
        return ResponseEntity.ok(kpiUnitService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KpiUnitResponseDto> updateKpiUnit(
            @PathVariable Integer id,
            @Valid @RequestBody KpiUnitRequestDto requestDto) {
        return ResponseEntity.ok(kpiUnitService.update(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteKpiUnit(@PathVariable Integer id) {
        kpiUnitService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
