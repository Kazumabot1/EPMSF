package com.epms.service.impl;

import com.epms.dto.FormQuestionRequestDto;
import com.epms.dto.FormQuestionResponseDto;
import com.epms.entity.FormQuestion;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FormQuestionRepository;
import com.epms.service.FormQuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FormQuestionServiceImpl implements FormQuestionService {

    private final FormQuestionRepository formQuestionRepository;

    @Override
    public FormQuestionResponseDto createFormQuestion(FormQuestionRequestDto requestDto) {
        FormQuestion question = new FormQuestion();
        question.setQuestionText(requestDto.getQuestionText().trim());
        question.setResponseType(requestDto.getResponseType());
        question.setIsRequired(requestDto.getIsRequired() != null ? requestDto.getIsRequired() : false);

        FormQuestion savedQuestion = formQuestionRepository.save(question);
        return mapToResponseDto(savedQuestion);
    }

    @Override
    public List<FormQuestionResponseDto> getAllFormQuestions() {
        return formQuestionRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public FormQuestionResponseDto getFormQuestionById(Long id) {
        FormQuestion question = getFormQuestionEntityById(id);
        return mapToResponseDto(question);
    }

    @Override
    public FormQuestionResponseDto updateFormQuestion(Long id, FormQuestionRequestDto requestDto) {
        FormQuestion existingQuestion = getFormQuestionEntityById(id);
        
        existingQuestion.setQuestionText(requestDto.getQuestionText().trim());
        existingQuestion.setResponseType(requestDto.getResponseType());
        if (requestDto.getIsRequired() != null) {
            existingQuestion.setIsRequired(requestDto.getIsRequired());
        }

        FormQuestion updatedQuestion = formQuestionRepository.save(existingQuestion);
        return mapToResponseDto(updatedQuestion);
    }

    @Override
    public void deleteFormQuestion(Long id) {
        FormQuestion existingQuestion = getFormQuestionEntityById(id);
        formQuestionRepository.delete(existingQuestion);
    }

    private FormQuestion getFormQuestionEntityById(Long id) {
        return formQuestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Form Question not found with id: " + id));
    }

    private FormQuestionResponseDto mapToResponseDto(FormQuestion question) {
        FormQuestionResponseDto dto = new FormQuestionResponseDto();
        dto.setQuestionId(question.getQuestionId());
        dto.setQuestionText(question.getQuestionText());
        dto.setResponseType(question.getResponseType());
        dto.setIsRequired(question.getIsRequired());
        return dto;
    }
}

