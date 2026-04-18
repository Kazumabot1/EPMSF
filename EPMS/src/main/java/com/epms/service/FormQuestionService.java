package com.epms.service;

import com.epms.dto.FormQuestionRequestDto;
import com.epms.dto.FormQuestionResponseDto;

import java.util.List;

public interface FormQuestionService {

    FormQuestionResponseDto createFormQuestion(FormQuestionRequestDto requestDto);

    List<FormQuestionResponseDto> getAllFormQuestions();

    FormQuestionResponseDto getFormQuestionById(Long id);

    FormQuestionResponseDto updateFormQuestion(Long id, FormQuestionRequestDto requestDto);

    void deleteFormQuestion(Long id);
}

