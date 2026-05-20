package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.PositionDetailResponseDto;
import com.epms.dto.PositionRequestDto;
import com.epms.dto.PositionResponseDto;
import com.epms.service.PositionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/positions")
@RequiredArgsConstructor
public class PositionController {

    private final PositionService positionService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<PositionResponseDto>> create(
            @RequestBody PositionRequestDto request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Position created successfully", positionService.create(request))
        );
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<PositionResponseDto>>> getAll() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Positions fetched successfully", positionService.getAll())
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<PositionResponseDto>> getById(
            @PathVariable Integer id
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Position fetched successfully", positionService.getById(id))
        );
    }

    @GetMapping("/{id}/details")
    public ResponseEntity<GenericApiResponse<PositionDetailResponseDto>> getDetails(
            @PathVariable Integer id
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Position details fetched successfully", positionService.getDetails(id))
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<PositionResponseDto>> update(
            @PathVariable Integer id,
            @RequestBody PositionRequestDto request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Position updated successfully", positionService.update(id, request))
        );
    }
}