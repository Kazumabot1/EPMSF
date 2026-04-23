package com.epms.service;

import com.epms.dto.AppraisalFormRequestDto;
import com.epms.dto.AppraisalFormResponseDto;

import java.util.List;

public interface AppraisalFormService {

    AppraisalFormResponseDto createAppraisalForm(AppraisalFormRequestDto requestDto);

    List<AppraisalFormResponseDto> getAllAppraisalForms();

    AppraisalFormResponseDto getAppraisalFormById(Long id);

    AppraisalFormResponseDto updateAppraisalForm(Long id, AppraisalFormRequestDto requestDto);

    void deleteAppraisalForm(Long id);
}
