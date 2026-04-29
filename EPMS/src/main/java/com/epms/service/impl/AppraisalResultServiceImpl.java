package com.epms.service.impl;

import com.epms.dto.AppraisalResultRequestDto;
import com.epms.dto.AppraisalResultResponseDto;
import com.epms.entity.AppraisalResult;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalResultRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.AppraisalCycleRepository;
import com.epms.service.AppraisalResultService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppraisalResultServiceImpl implements AppraisalResultService {

    private final AppraisalResultRepository appraisalResultRepository;
    private final EmployeeRepository employeeRepository;
    private final AppraisalCycleRepository appraisalCycleRepository;

    @Override
    public AppraisalResultResponseDto createAppraisalResult(AppraisalResultRequestDto requestDto) {
        AppraisalResult result = new AppraisalResult();
        applyChanges(result, requestDto);
        AppraisalResult savedResult = appraisalResultRepository.save(result);
        return mapToResponseDto(savedResult);
    }

    @Override
    public List<AppraisalResultResponseDto> getAllAppraisalResults() {
        return appraisalResultRepository.findAll().stream().map(this::mapToResponseDto).toList();
    }

    @Override
    public AppraisalResultResponseDto getAppraisalResultById(Integer id) {
        return mapToResponseDto(getAppraisalResultEntityById(id));
    }

    @Override
    public AppraisalResultResponseDto updateAppraisalResult(Integer id, AppraisalResultRequestDto requestDto) {
        AppraisalResult existing = getAppraisalResultEntityById(id);

        if ("LOCKED".equalsIgnoreCase(existing.getStatus())) {
            throw new BadRequestException("Locked appraisal results cannot be modified.");
        }

        applyChanges(existing, requestDto);
        AppraisalResult updated = appraisalResultRepository.save(existing);
        return mapToResponseDto(updated);
    }

    @Override
    public void deleteAppraisalResult(Integer id) {
        AppraisalResult existing = getAppraisalResultEntityById(id);
        if ("LOCKED".equalsIgnoreCase(existing.getStatus())) {
            throw new BadRequestException("Locked appraisal results cannot be deleted.");
        }
        appraisalResultRepository.delete(existing);
    }

    private void applyChanges(AppraisalResult result, AppraisalResultRequestDto requestDto) {
        // Fetch and set Employee entity
        var employee = employeeRepository.findById(requestDto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + requestDto.getEmployeeId()));
        result.setEmployee(employee);

        // Fetch and set AppraisalCycle entity
        var cycle = appraisalCycleRepository.findById(requestDto.getCycleId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Cycle not found with id: " + requestDto.getCycleId()));
        result.setCycle(cycle);

        result.setSelfScore(requestDto.getSelfScore());
        result.setManagerScore(requestDto.getManagerScore());
        result.setSelfComment(requestDto.getSelfComment());
        result.setManagerComment(requestDto.getManagerComment());

        String status = requestDto.getStatus() != null ? requestDto.getStatus().trim().toUpperCase() : defaultStatus(result.getStatus());
        result.setStatus(status);

        double finalScore = calculateFinalScore(requestDto.getSelfScore(), requestDto.getManagerScore());
        result.setFinalScore(finalScore);
        result.setPerformanceCategory(resolveCategory(finalScore, requestDto.getPerformanceCategory()));

        if ("SUBMITTED".equals(status) && result.getSubmittedAt() == null) {
            result.setSubmittedAt(new Date());
        }
        if ("LOCKED".equals(status) && result.getLockedAt() == null) {
            result.setLockedAt(new Date());
        }
    }

    private String defaultStatus(String existingStatus) {
        return existingStatus != null ? existingStatus : "DRAFT";
    }

    private double calculateFinalScore(Double selfScore, Double managerScore) {
        if (selfScore == null && managerScore == null) return 0.0;
        if (selfScore == null) return round(managerScore);
        if (managerScore == null) return round(selfScore);
        return round((selfScore * 0.4) + (managerScore * 0.6));
    }

    private String resolveCategory(double finalScore, String requestedCategory) {
        if (requestedCategory != null && !requestedCategory.isBlank()) return requestedCategory;
        if (finalScore >= 4.5) return "Outstanding";
        if (finalScore >= 3.5) return "Good";
        if (finalScore >= 2.5) return "Meets Requirements";
        if (finalScore >= 1.5) return "Needs Improvement";
        return "Unsatisfactory";
    }

    private double round(Double value) {
        return Math.round(value * 100.0) / 100.0;
    }

    private AppraisalResult getAppraisalResultEntityById(Integer id) {
        return appraisalResultRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Result not found with id: " + id));
    }

    private AppraisalResultResponseDto mapToResponseDto(AppraisalResult result) {
        AppraisalResultResponseDto dto = new AppraisalResultResponseDto();
        dto.setId(result.getId());
        dto.setEmployeeId(result.getEmployee().getId());
        dto.setCycleId(result.getCycle().getId());
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