package com.epms.service.impl;

import com.epms.dto.RecommendationRequestDto;
import com.epms.dto.RecommendationResponseDto;
import com.epms.entity.Recommendation;
import com.epms.entity.Appraisal;
import com.epms.entity.Employee;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.RecommendationRepository;
import com.epms.repository.AppraisalRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.service.RecommendationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RecommendationServiceImpl implements RecommendationService {

    private final RecommendationRepository recommendationRepository;
    private final AppraisalRepository appraisalRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public RecommendationResponseDto createRecommendation(RecommendationRequestDto requestDto) {
        Appraisal appraisal = appraisalRepository.findById(requestDto.getAppraisalId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal not found with id: " + requestDto.getAppraisalId()));
        
        Employee recommendedBy = employeeRepository.findById(requestDto.getRecommendedByEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + requestDto.getRecommendedByEmployeeId()));

        Recommendation recommendation = new Recommendation();
        recommendation.setAppraisal(appraisal);
        recommendation.setRecommendedBy(recommendedBy);
        recommendation.setRecommendationType(requestDto.getRecommendationType());
        recommendation.setRecommendedValue(requestDto.getRecommendedValue());
        recommendation.setApprovalStatus(requestDto.getApprovalStatus());

        Recommendation savedRecommendation = recommendationRepository.save(recommendation);
        return mapToResponseDto(savedRecommendation);
    }

    @Override
    public List<RecommendationResponseDto> getAllRecommendations() {
        return recommendationRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public RecommendationResponseDto getRecommendationById(Integer id) {
        Recommendation recommendation = getRecommendationEntityById(id);
        return mapToResponseDto(recommendation);
    }

    @Override
    public RecommendationResponseDto updateRecommendation(Integer id, RecommendationRequestDto requestDto) {
        Recommendation existingRecommendation = getRecommendationEntityById(id);
        
        Appraisal appraisal = appraisalRepository.findById(requestDto.getAppraisalId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal not found with id: " + requestDto.getAppraisalId()));
        
        Employee recommendedBy = employeeRepository.findById(requestDto.getRecommendedByEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + requestDto.getRecommendedByEmployeeId()));

        existingRecommendation.setAppraisal(appraisal);
        existingRecommendation.setRecommendedBy(recommendedBy);
        existingRecommendation.setRecommendationType(requestDto.getRecommendationType());
        existingRecommendation.setRecommendedValue(requestDto.getRecommendedValue());
        existingRecommendation.setApprovalStatus(requestDto.getApprovalStatus());

        Recommendation updatedRecommendation = recommendationRepository.save(existingRecommendation);
        return mapToResponseDto(updatedRecommendation);
    }

    @Override
    public void deleteRecommendation(Integer id) {
        Recommendation existingRecommendation = getRecommendationEntityById(id);
        recommendationRepository.delete(existingRecommendation);
    }

    private Recommendation getRecommendationEntityById(Integer id) {
        return recommendationRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Recommendation not found with id: " + id));
    }

    private RecommendationResponseDto mapToResponseDto(Recommendation recommendation) {
        RecommendationResponseDto dto = new RecommendationResponseDto();
        dto.setId(recommendation.getId());
        dto.setAppraisalId(recommendation.getAppraisal().getId());
        dto.setRecommendedByEmployeeId(recommendation.getRecommendedBy().getId());
        dto.setRecommendationType(recommendation.getRecommendationType());
        dto.setRecommendedValue(recommendation.getRecommendedValue());
        dto.setApprovalStatus(recommendation.getApprovalStatus());
        if (recommendation.getApprovedBy() != null) {
            dto.setApprovedByEmployeeId(recommendation.getApprovedBy().getId());
        }
        return dto;
    }
}

