package com.epms.service;

import com.epms.dto.AppraisalRequestDto;
import com.epms.dto.AppraisalResponseDto;

import java.util.List;

public interface AppraisalService {

    AppraisalResponseDto createAppraisal(AppraisalRequestDto requestDto);

    List<AppraisalResponseDto> getAllAppraisals();

    AppraisalResponseDto getAppraisalById(Integer id);

    AppraisalResponseDto updateAppraisal(Integer id, AppraisalRequestDto requestDto);

    void deleteAppraisal(Integer id);
}

