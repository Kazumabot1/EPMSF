package com.epms.service.impl;

import com.epms.dto.AppraisalRequestDto;
import com.epms.dto.AppraisalResponseDto;
import com.epms.entity.Appraisal;
import com.epms.entity.Employee;
import com.epms.entity.AppraisalCycle;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.AppraisalCycleRepository;
import com.epms.service.AppraisalService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppraisalServiceImpl implements AppraisalService {

    private final AppraisalRepository appraisalRepository;
    private final EmployeeRepository employeeRepository;
    private final AppraisalCycleRepository appraisalCycleRepository;

    @Override
    public AppraisalResponseDto createAppraisal(AppraisalRequestDto requestDto) {
        Employee employee = employeeRepository.findById(requestDto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + requestDto.getEmployeeId()));

        AppraisalCycle cycle = appraisalCycleRepository.findById(requestDto.getCycleId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Cycle not found with id: " + requestDto.getCycleId()));

        Appraisal appraisal = new Appraisal();
        appraisal.setEmployee(employee);
        appraisal.setCycle(cycle);
        appraisal.setAppraisalStatus(requestDto.getAppraisalStatus());

        Appraisal savedAppraisal = appraisalRepository.save(appraisal);
        return mapToResponseDto(savedAppraisal);
    }

    @Override
    public List<AppraisalResponseDto> getAllAppraisals() {
        return appraisalRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public AppraisalResponseDto getAppraisalById(Integer id) {
        Appraisal appraisal = getAppraisalEntityById(id);
        return mapToResponseDto(appraisal);
    }

    @Override
    public AppraisalResponseDto updateAppraisal(Integer id, AppraisalRequestDto requestDto) {
        Appraisal existingAppraisal = getAppraisalEntityById(id);

        Employee employee = employeeRepository.findById(requestDto.getEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + requestDto.getEmployeeId()));

        AppraisalCycle cycle = appraisalCycleRepository.findById(requestDto.getCycleId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Cycle not found with id: " + requestDto.getCycleId()));

        existingAppraisal.setEmployee(employee);
        existingAppraisal.setCycle(cycle);
        existingAppraisal.setAppraisalStatus(requestDto.getAppraisalStatus());

        Appraisal updatedAppraisal = appraisalRepository.save(existingAppraisal);
        return mapToResponseDto(updatedAppraisal);
    }

    @Override
    public void deleteAppraisal(Integer id) {
        Appraisal existingAppraisal = getAppraisalEntityById(id);
        appraisalRepository.delete(existingAppraisal);
    }

    private Appraisal getAppraisalEntityById(Integer id) {
        return appraisalRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal not found with id: " + id));
    }

    private AppraisalResponseDto mapToResponseDto(Appraisal appraisal) {
        AppraisalResponseDto dto = new AppraisalResponseDto();
        dto.setId(appraisal.getId());
        dto.setEmployeeId(appraisal.getEmployee().getId());
        dto.setCycleId(appraisal.getCycle().getId());
        dto.setAppraisalStatus(appraisal.getAppraisalStatus());
        dto.setOverallScore(appraisal.getOverallScore());
        dto.setPerformanceCategory(appraisal.getPerformanceCategory());
        return dto;
    }
}

