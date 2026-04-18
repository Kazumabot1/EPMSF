package com.epms.service;

import com.epms.dto.AppraisalCycleRequestDto;
import com.epms.dto.AppraisalCycleResponseDto;

import java.util.List;

public interface AppraisalCycleService {

    AppraisalCycleResponseDto createAppraisalCycle(AppraisalCycleRequestDto requestDto);

    List<AppraisalCycleResponseDto> getAllAppraisalCycles();

    AppraisalCycleResponseDto getAppraisalCycleById(Integer id);

    AppraisalCycleResponseDto updateAppraisalCycle(Integer id, AppraisalCycleRequestDto requestDto);

    void deleteAppraisalCycle(Integer id);
}

