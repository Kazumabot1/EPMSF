package com.epms.service;

import com.epms.dto.AppraisalQuestionRequestDto;
import com.epms.dto.AppraisalQuestionResponseDto;

import java.util.List;

public interface AppraisalQuestionService {

    AppraisalQuestionResponseDto createAppraisalQuestion(AppraisalQuestionRequestDto requestDto);

    List<AppraisalQuestionResponseDto> getAllAppraisalQuestions();

    AppraisalQuestionResponseDto getAppraisalQuestionById(Long id);

    AppraisalQuestionResponseDto updateAppraisalQuestion(Long id, AppraisalQuestionRequestDto requestDto);

    void deleteAppraisalQuestion(Long id);
}
