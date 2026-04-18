package com.epms.service.impl;

import com.epms.dto.AppraisalCycleRequestDto;
import com.epms.dto.AppraisalCycleResponseDto;
import com.epms.entity.AppraisalCycle;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalCycleRepository;
import com.epms.service.AppraisalCycleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Date;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AppraisalCycleServiceImpl implements AppraisalCycleService {

    private final AppraisalCycleRepository appraisalCycleRepository;

    @Override
    public AppraisalCycleResponseDto createAppraisalCycle(AppraisalCycleRequestDto requestDto) {
        AppraisalCycle cycle = new AppraisalCycle();
        cycle.setName(requestDto.getName().trim());
        cycle.setType(requestDto.getType());
        cycle.setStartDate(requestDto.getStartDate());
        cycle.setEndDate(requestDto.getEndDate());
        cycle.setStatus(requestDto.getStatus() != null ? requestDto.getStatus() : "DRAFT");
        cycle.setCreatedAt(new Date());

        AppraisalCycle savedCycle = appraisalCycleRepository.save(cycle);
        return mapToResponseDto(savedCycle);
    }

    @Override
    public List<AppraisalCycleResponseDto> getAllAppraisalCycles() {
        return appraisalCycleRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public AppraisalCycleResponseDto getAppraisalCycleById(Integer id) {
        AppraisalCycle cycle = getAppraisalCycleEntityById(id);
        return mapToResponseDto(cycle);
    }

    @Override
    public AppraisalCycleResponseDto updateAppraisalCycle(Integer id, AppraisalCycleRequestDto requestDto) {
        AppraisalCycle existingCycle = getAppraisalCycleEntityById(id);

        existingCycle.setName(requestDto.getName().trim());
        existingCycle.setType(requestDto.getType());
        existingCycle.setStartDate(requestDto.getStartDate());
        existingCycle.setEndDate(requestDto.getEndDate());
        if (requestDto.getStatus() != null) {
            existingCycle.setStatus(requestDto.getStatus());
        }

        AppraisalCycle updatedCycle = appraisalCycleRepository.save(existingCycle);
        return mapToResponseDto(updatedCycle);
    }

    @Override
    public void deleteAppraisalCycle(Integer id) {
        AppraisalCycle existingCycle = getAppraisalCycleEntityById(id);
        appraisalCycleRepository.delete(existingCycle);
    }

    private AppraisalCycle getAppraisalCycleEntityById(Integer id) {
        return appraisalCycleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Cycle not found with id: " + id));
    }

    private AppraisalCycleResponseDto mapToResponseDto(AppraisalCycle cycle) {
        AppraisalCycleResponseDto dto = new AppraisalCycleResponseDto();
        dto.setId(cycle.getId());
        dto.setName(cycle.getName());
        dto.setType(cycle.getType());
        dto.setStartDate(cycle.getStartDate());
        dto.setEndDate(cycle.getEndDate());
        dto.setIsActive(cycle.getIsActive());
        dto.setStatus(cycle.getStatus());
        dto.setCreatedAt(cycle.getCreatedAt());
        return dto;
    }
}

