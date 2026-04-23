package com.epms.service;

import com.epms.dto.AppraisalSectionRequestDto;
import com.epms.dto.AppraisalSectionResponseDto;

import java.util.List;

public interface AppraisalSectionService {

    AppraisalSectionResponseDto createAppraisalSection(AppraisalSectionRequestDto requestDto);

    List<AppraisalSectionResponseDto> getAllAppraisalSections();

    AppraisalSectionResponseDto getAppraisalSectionById(Long id);

    AppraisalSectionResponseDto updateAppraisalSection(Long id, AppraisalSectionRequestDto requestDto);

    void deleteAppraisalSection(Long id);
}
