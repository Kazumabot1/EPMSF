package com.epms.service;

import com.epms.dto.AppraisalResultRequestDto;
import com.epms.dto.AppraisalResultResponseDto;

import java.util.List;

public interface AppraisalResultService {

    AppraisalResultResponseDto createAppraisalResult(AppraisalResultRequestDto requestDto);

    List<AppraisalResultResponseDto> getAllAppraisalResults();

    AppraisalResultResponseDto getAppraisalResultById(Integer id);

    AppraisalResultResponseDto updateAppraisalResult(Integer id, AppraisalResultRequestDto requestDto);

    void deleteAppraisalResult(Integer id);
}

