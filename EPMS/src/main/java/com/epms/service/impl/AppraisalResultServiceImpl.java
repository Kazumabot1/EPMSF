package com.epms.service.impl;

import com.epms.dto.AppraisalResultRequestDto;
import com.epms.dto.AppraisalResultResponseDto;
import com.epms.entity.AppraisalResult;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalResultRepository;
import com.epms.service.AppraisalResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppraisalResultServiceImpl implements AppraisalResultService {

    private final AppraisalResultRepository appraisalResultRepository;

    @Override
    public AppraisalResultResponseDto createAppraisalResult(AppraisalResultRequestDto requestDto) {
        AppraisalResult result = new AppraisalResult();
        result.setEmployeeId(requestDto.getEmployeeId());
        result.setCycleId(requestDto.getCycleId());
        result.setSelfScore(requestDto.getSelfScore());
        result.setManagerScore(requestDto.getManagerScore());
        result.setPerformanceCategory(requestDto.getPerformanceCategory());
        result.setStatus(requestDto.getStatus() != null ? requestDto.getStatus() : "DRAFT");
        result.setSelfComment(requestDto.getSelfComment());
        result.setManagerComment(requestDto.getManagerComment());

        AppraisalResult savedResult = appraisalResultRepository.save(result);
        return mapToResponseDto(savedResult);
    }

    @Override
    public List<AppraisalResultResponseDto> getAllAppraisalResults() {
        return appraisalResultRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public AppraisalResultResponseDto getAppraisalResultById(Integer id) {
        AppraisalResult result = getAppraisalResultEntityById(id);
        return mapToResponseDto(result);
    }

    @Override
    public AppraisalResultResponseDto updateAppraisalResult(Integer id, AppraisalResultRequestDto requestDto) {
        AppraisalResult existingResult = getAppraisalResultEntityById(id);

        existingResult.setEmployeeId(requestDto.getEmployeeId());
        existingResult.setCycleId(requestDto.getCycleId());
        existingResult.setSelfScore(requestDto.getSelfScore());
        existingResult.setManagerScore(requestDto.getManagerScore());
        existingResult.setPerformanceCategory(requestDto.getPerformanceCategory());
        if (requestDto.getStatus() != null) {
            existingResult.setStatus(requestDto.getStatus());
        }
        existingResult.setSelfComment(requestDto.getSelfComment());
        existingResult.setManagerComment(requestDto.getManagerComment());

        AppraisalResult updatedResult = appraisalResultRepository.save(existingResult);
        return mapToResponseDto(updatedResult);
    }

    @Override
    public void deleteAppraisalResult(Integer id) {
        AppraisalResult existingResult = getAppraisalResultEntityById(id);
        appraisalResultRepository.delete(existingResult);
    }

    private AppraisalResult getAppraisalResultEntityById(Integer id) {
        return appraisalResultRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Result not found with id: " + id));
    }

    private AppraisalResultResponseDto mapToResponseDto(AppraisalResult result) {
        AppraisalResultResponseDto dto = new AppraisalResultResponseDto();
        dto.setId(result.getId());
        dto.setEmployeeId(result.getEmployeeId());
        dto.setCycleId(result.getCycleId());
        dto.setSelfScore(result.getSelfScore());
        dto.setManagerScore(result.getManagerScore());
        dto.setFinalScore(result.getFinalScore());
        dto.setPerformanceCategory(result.getPerformanceCategory());
        dto.setStatus(result.getStatus());
        dto.setSelfComment(result.getSelfComment());
        dto.setManagerComment(result.getManagerComment());
        dto.setSubmittedAt(result.getSubmittedAt());
        dto.setLockedAt(result.getLockedAt());
        return dto;
    }
}

