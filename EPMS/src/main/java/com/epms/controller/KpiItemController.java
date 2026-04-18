package com.epms.controller;

import com.epms.dto.KpiItemRequestDto;
import com.epms.dto.KpiItemResponseDto;
import com.epms.service.KpiItemService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
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
@RequestMapping("/api/kpi-items")
@RequiredArgsConstructor
public class KpiItemController {

    private final KpiItemService kpiItemService;

    @PostMapping
    public ResponseEntity<KpiItemResponseDto> createKpiItem(@Valid @RequestBody KpiItemRequestDto requestDto) {
        KpiItemResponseDto responseDto = kpiItemService.createKpiItem(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<KpiItemResponseDto>> getAllKpiItems() {
        return ResponseEntity.ok(kpiItemService.getAllKpiItems());
    }

    @GetMapping("/{id}")
    public ResponseEntity<KpiItemResponseDto> getKpiItemById(@PathVariable Integer id) {
        return ResponseEntity.ok(kpiItemService.getKpiItemById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<KpiItemResponseDto> updateKpiItem(
            @PathVariable Integer id,
            @Valid @RequestBody KpiItemRequestDto requestDto) {
        return ResponseEntity.ok(kpiItemService.updateKpiItem(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteKpiItem(@PathVariable Integer id) {
        kpiItemService.deleteKpiItem(id);
        return ResponseEntity.noContent().build();
    }
}
