package com.epms.controller;

import com.epms.dto.PipUpdateRequestDto;
import com.epms.dto.PipUpdateResponseDto;
import com.epms.service.PipUpdateService;
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
@RequestMapping("/api/pip-updates")
@RequiredArgsConstructor
public class PipUpdateController {

    private final PipUpdateService pipUpdateService;

    @PostMapping
    public ResponseEntity<PipUpdateResponseDto> createPipUpdate(
            @Valid @RequestBody PipUpdateRequestDto requestDto) {
        PipUpdateResponseDto responseDto = pipUpdateService.createPipUpdate(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<PipUpdateResponseDto>> getAllPipUpdates() {
        return ResponseEntity.ok(pipUpdateService.getAllPipUpdates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PipUpdateResponseDto> getPipUpdateById(@PathVariable Integer id) {
        return ResponseEntity.ok(pipUpdateService.getPipUpdateById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PipUpdateResponseDto> updatePipUpdate(
            @PathVariable Integer id,
            @Valid @RequestBody PipUpdateRequestDto requestDto) {
        return ResponseEntity.ok(pipUpdateService.updatePipUpdate(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePipUpdate(@PathVariable Integer id) {
        pipUpdateService.deletePipUpdate(id);
        return ResponseEntity.noContent().build();
    }
}
