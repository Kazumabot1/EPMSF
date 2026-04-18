package com.epms.controller;

import com.epms.dto.PipRequestDto;
import com.epms.dto.PipResponseDto;
import com.epms.service.PipService;
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
@RequestMapping("/api/pips")
@RequiredArgsConstructor
public class PipController {

    private final PipService pipService;

    @PostMapping
    public ResponseEntity<PipResponseDto> createPip(
            @Valid @RequestBody PipRequestDto requestDto) {
        PipResponseDto responseDto = pipService.createPip(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<PipResponseDto>> getAllPips() {
        return ResponseEntity.ok(pipService.getAllPips());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PipResponseDto> getPipById(@PathVariable Integer id) {
        return ResponseEntity.ok(pipService.getPipById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PipResponseDto> updatePip(
            @PathVariable Integer id,
            @Valid @RequestBody PipRequestDto requestDto) {
        return ResponseEntity.ok(pipService.updatePip(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePip(@PathVariable Integer id) {
        pipService.deletePip(id);
        return ResponseEntity.noContent().build();
    }
}
