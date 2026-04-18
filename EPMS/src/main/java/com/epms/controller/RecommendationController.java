package com.epms.controller;

import com.epms.dto.RecommendationRequestDto;
import com.epms.dto.RecommendationResponseDto;
import com.epms.service.RecommendationService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/recommendations")
@RequiredArgsConstructor
public class RecommendationController {

    private final RecommendationService recommendationService;

    @PostMapping
    public ResponseEntity<RecommendationResponseDto> createRecommendation(
            @Valid @RequestBody RecommendationRequestDto requestDto) {
        RecommendationResponseDto responseDto = recommendationService.createRecommendation(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<RecommendationResponseDto>> getAllRecommendations() {
        return ResponseEntity.ok(recommendationService.getAllRecommendations());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RecommendationResponseDto> getRecommendationById(@PathVariable Integer id) {
        return ResponseEntity.ok(recommendationService.getRecommendationById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RecommendationResponseDto> updateRecommendation(
            @PathVariable Integer id,
            @Valid @RequestBody RecommendationRequestDto requestDto) {
        return ResponseEntity.ok(recommendationService.updateRecommendation(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRecommendation(@PathVariable Integer id) {
        recommendationService.deleteRecommendation(id);
        return ResponseEntity.noContent().build();
    }
}

