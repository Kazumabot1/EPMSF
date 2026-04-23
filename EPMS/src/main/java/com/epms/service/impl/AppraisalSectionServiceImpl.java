package com.epms.service.impl;

import com.epms.dto.AppraisalSectionRequestDto;
import com.epms.dto.AppraisalSectionResponseDto;
import com.epms.entity.AppraisalForm;
import com.epms.entity.AppraisalSection;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalFormRepository;
import com.epms.repository.AppraisalSectionRepository;
import com.epms.service.AppraisalSectionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppraisalSectionServiceImpl implements AppraisalSectionService {

    private final AppraisalSectionRepository appraisalSectionRepository;
    private final AppraisalFormRepository appraisalFormRepository;

    @Override
    public AppraisalSectionResponseDto createAppraisalSection(AppraisalSectionRequestDto requestDto) {
        AppraisalForm form = appraisalFormRepository.findById(requestDto.getFormId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Form not found with id: " + requestDto.getFormId()));

        AppraisalSection section = new AppraisalSection();
        section.setForm(form);
        section.setTitle(requestDto.getTitle());
        section.setOrderNo(requestDto.getOrderNo());

        AppraisalSection savedSection = appraisalSectionRepository.save(section);
        return mapToResponseDto(savedSection);
    }

    @Override
    public List<AppraisalSectionResponseDto> getAllAppraisalSections() {
        return appraisalSectionRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public AppraisalSectionResponseDto getAppraisalSectionById(Long id) {
        AppraisalSection section = getAppraisalSectionEntityById(id);
        return mapToResponseDto(section);
    }

    @Override
    public AppraisalSectionResponseDto updateAppraisalSection(Long id, AppraisalSectionRequestDto requestDto) {
        AppraisalSection existingSection = getAppraisalSectionEntityById(id);
        AppraisalForm form = appraisalFormRepository.findById(requestDto.getFormId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Form not found with id: " + requestDto.getFormId()));

        existingSection.setForm(form);
        existingSection.setTitle(requestDto.getTitle());
        existingSection.setOrderNo(requestDto.getOrderNo());

        AppraisalSection updatedSection = appraisalSectionRepository.save(existingSection);
        return mapToResponseDto(updatedSection);
    }

    @Override
    public void deleteAppraisalSection(Long id) {
        AppraisalSection section = getAppraisalSectionEntityById(id);
        appraisalSectionRepository.delete(section);
    }

    private AppraisalSection getAppraisalSectionEntityById(Long id) {
        return appraisalSectionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Section not found with id: " + id));
    }

    private AppraisalSectionResponseDto mapToResponseDto(AppraisalSection section) {
        AppraisalSectionResponseDto dto = new AppraisalSectionResponseDto();
        dto.setId(section.getId());
        dto.setFormId(section.getForm().getId());
        dto.setTitle(section.getTitle());
        dto.setOrderNo(section.getOrderNo());
        dto.setCreatedAt(section.getCreatedAt());
        // questions will be mapped if needed
        return dto;
    }
}
