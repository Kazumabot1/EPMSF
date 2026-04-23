package com.epms.service.impl;

import com.epms.dto.AppraisalFormRequestDto;
import com.epms.dto.AppraisalFormResponseDto;
import com.epms.entity.AppraisalForm;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalFormRepository;
import com.epms.service.AppraisalFormService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppraisalFormServiceImpl implements AppraisalFormService {

    private final AppraisalFormRepository appraisalFormRepository;

    @Override
    public AppraisalFormResponseDto createAppraisalForm(AppraisalFormRequestDto requestDto) {
        AppraisalForm form = new AppraisalForm();
        form.setFormName(requestDto.getFormName());
        form.setDescription(requestDto.getDescription());
        form.setIsActive(true);

        AppraisalForm savedForm = appraisalFormRepository.save(form);
        return mapToResponseDto(savedForm);
    }

    @Override
    public List<AppraisalFormResponseDto> getAllAppraisalForms() {
        return appraisalFormRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public AppraisalFormResponseDto getAppraisalFormById(Long id) {
        AppraisalForm form = getAppraisalFormEntityById(id);
        return mapToResponseDto(form);
    }

    @Override
    public AppraisalFormResponseDto updateAppraisalForm(Long id, AppraisalFormRequestDto requestDto) {
        AppraisalForm existingForm = getAppraisalFormEntityById(id);
        existingForm.setFormName(requestDto.getFormName());
        existingForm.setDescription(requestDto.getDescription());

        AppraisalForm updatedForm = appraisalFormRepository.save(existingForm);
        return mapToResponseDto(updatedForm);
    }

    @Override
    public void deleteAppraisalForm(Long id) {
        AppraisalForm form = getAppraisalFormEntityById(id);
        appraisalFormRepository.delete(form);
    }

    private AppraisalForm getAppraisalFormEntityById(Long id) {
        return appraisalFormRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Form not found with id: " + id));
    }

    private AppraisalFormResponseDto mapToResponseDto(AppraisalForm form) {
        AppraisalFormResponseDto dto = new AppraisalFormResponseDto();
        dto.setId(form.getId());
        dto.setFormName(form.getFormName());
        dto.setDescription(form.getDescription());
        dto.setIsActive(form.getIsActive());
        dto.setCreatedAt(form.getCreatedAt());
        // sections will be mapped if needed
        return dto;
    }
}
