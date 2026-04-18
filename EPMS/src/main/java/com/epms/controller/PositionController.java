package com.epms.controller;

import com.epms.dto.PositionRequestDto;
import com.epms.dto.PositionResponseDto;
import com.epms.service.PositionService;
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
@RequestMapping("/api/positions")
@RequiredArgsConstructor
public class PositionController {

    private final PositionService positionService;

    @PostMapping
    public ResponseEntity<PositionResponseDto> create(@Valid @RequestBody PositionRequestDto requestDto) {
        PositionResponseDto responseDto = positionService.create(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<PositionResponseDto>> getAll() {
        return ResponseEntity.ok(positionService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PositionResponseDto> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(positionService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PositionResponseDto> update(
            @PathVariable Integer id,
            @Valid @RequestBody PositionRequestDto requestDto) {
        return ResponseEntity.ok(positionService.update(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        positionService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
