package com.epms.service;

import com.epms.dto.RecommendationRequestDto;
import com.epms.dto.RecommendationResponseDto;

import java.util.List;

public interface RecommendationService {

    RecommendationResponseDto createRecommendation(RecommendationRequestDto requestDto);

    List<RecommendationResponseDto> getAllRecommendations();

    RecommendationResponseDto getRecommendationById(Integer id);

    RecommendationResponseDto updateRecommendation(Integer id, RecommendationRequestDto requestDto);

    void deleteRecommendation(Integer id);
}

