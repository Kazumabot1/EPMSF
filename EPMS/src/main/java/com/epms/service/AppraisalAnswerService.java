package com.epms.service;

import com.epms.dto.AppraisalAnswerRequestDto;
import com.epms.dto.AppraisalAnswerResponseDto;

import java.util.List;

public interface AppraisalAnswerService {

    AppraisalAnswerResponseDto createAppraisalAnswer(AppraisalAnswerRequestDto requestDto);

    List<AppraisalAnswerResponseDto> getAllAppraisalAnswers();

    AppraisalAnswerResponseDto getAppraisalAnswerById(Integer id);

    AppraisalAnswerResponseDto updateAppraisalAnswer(Integer id, AppraisalAnswerRequestDto requestDto);

    void deleteAppraisalAnswer(Integer id);
}

