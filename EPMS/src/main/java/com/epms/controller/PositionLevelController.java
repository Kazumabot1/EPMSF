package com.epms.controller;

import com.epms.dto.PositionLevelRequestDto;
import com.epms.dto.PositionLevelResponseDto;
import com.epms.service.PositionLevelService;
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
@RequestMapping("/api/position-levels")
@RequiredArgsConstructor
public class PositionLevelController {

    private final PositionLevelService positionLevelService;

    @PostMapping
    public ResponseEntity<PositionLevelResponseDto> create(@Valid @RequestBody PositionLevelRequestDto requestDto) {
        PositionLevelResponseDto responseDto = positionLevelService.create(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<PositionLevelResponseDto>> getAll() {
        return ResponseEntity.ok(positionLevelService.getAll());
    }

    @GetMapping("/{id}")
    public ResponseEntity<PositionLevelResponseDto> getById(@PathVariable Integer id) {
        return ResponseEntity.ok(positionLevelService.getById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<PositionLevelResponseDto> update(
            @PathVariable Integer id,
            @Valid @RequestBody PositionLevelRequestDto requestDto) {
        return ResponseEntity.ok(positionLevelService.update(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@PathVariable Integer id) {
        positionLevelService.delete(id);
        return ResponseEntity.noContent().build();
    }
}
