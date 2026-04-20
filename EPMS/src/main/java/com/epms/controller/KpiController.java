package com.epms.controller;

import com.epms.dto.KpiRequestDto;
import com.epms.dto.KpiResponseDto;
import com.epms.service.KpiService;
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
@RequestMapping("/api/kpis")
@RequiredArgsConstructor
public class KpiController {

    private final KpiService kpiService;

    @PostMapping
    public ResponseEntity<KpiResponseDto> create(@Valid @RequestBody KpiRequestDto requestDto) {
        return new ResponseEntity<>(kpiService.create(requestDto), HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<KpiResponseDto>> getAll() {
        return ResponseEntity.ok(kpiService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KpiResponseDto> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(kpiService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KpiResponseDto> update(
            @PathVariable Integer id,
            @Valid @RequestBody KpiRequestDto requestDto) {
        return ResponseEntity.ok(kpiService.update(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        kpiService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
