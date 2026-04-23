package com.epms.service.impl;

import com.epms.dto.AppraisalQuestionRequestDto;
import com.epms.dto.AppraisalQuestionResponseDto;
import com.epms.entity.AppraisalQuestion;
import com.epms.entity.AppraisalSection;
import com.epms.entity.RatingScale;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalQuestionRepository;
import com.epms.repository.AppraisalSectionRepository;
import com.epms.repository.RatingScaleRepository;
import com.epms.service.AppraisalQuestionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AppraisalQuestionServiceImpl implements AppraisalQuestionService {

    private final AppraisalQuestionRepository appraisalQuestionRepository;
    private final AppraisalSectionRepository appraisalSectionRepository;
    private final RatingScaleRepository ratingScaleRepository;

    @Override
    public AppraisalQuestionResponseDto createAppraisalQuestion(AppraisalQuestionRequestDto requestDto) {
        AppraisalSection section = appraisalSectionRepository.findById(requestDto.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Section not found with id: " + requestDto.getSectionId()));

        RatingScale ratingScale = null;
        if (requestDto.getRatingScaleId() != null) {
            ratingScale = ratingScaleRepository.findById(requestDto.getRatingScaleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Rating Scale not found with id: " + requestDto.getRatingScaleId()));
        }

        AppraisalQuestion question = new AppraisalQuestion();
        question.setSection(section);
        question.setQuestionText(requestDto.getQuestionText());
        question.setResponseType(requestDto.getResponseType());
        question.setIsRequired(requestDto.getIsRequired());
        question.setWeight(requestDto.getWeight());
        question.setRatingScale(ratingScale);

        AppraisalQuestion savedQuestion = appraisalQuestionRepository.save(question);
        return mapToResponseDto(savedQuestion);
    }

    @Override
    public List<AppraisalQuestionResponseDto> getAllAppraisalQuestions() {
        return appraisalQuestionRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .collect(Collectors.toList());
    }

    @Override
    public AppraisalQuestionResponseDto getAppraisalQuestionById(Long id) {
        AppraisalQuestion question = getAppraisalQuestionEntityById(id);
        return mapToResponseDto(question);
    }

    @Override
    public AppraisalQuestionResponseDto updateAppraisalQuestion(Long id, AppraisalQuestionRequestDto requestDto) {
        AppraisalQuestion existingQuestion = getAppraisalQuestionEntityById(id);
        AppraisalSection section = appraisalSectionRepository.findById(requestDto.getSectionId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Section not found with id: " + requestDto.getSectionId()));

        RatingScale ratingScale = null;
        if (requestDto.getRatingScaleId() != null) {
            ratingScale = ratingScaleRepository.findById(requestDto.getRatingScaleId())
                    .orElseThrow(() -> new ResourceNotFoundException("Rating Scale not found with id: " + requestDto.getRatingScaleId()));
        }

        existingQuestion.setSection(section);
        existingQuestion.setQuestionText(requestDto.getQuestionText());
        existingQuestion.setResponseType(requestDto.getResponseType());
        existingQuestion.setIsRequired(requestDto.getIsRequired());
        existingQuestion.setWeight(requestDto.getWeight());
        existingQuestion.setRatingScale(ratingScale);

        AppraisalQuestion updatedQuestion = appraisalQuestionRepository.save(existingQuestion);
        return mapToResponseDto(updatedQuestion);
    }

    @Override
    public void deleteAppraisalQuestion(Long id) {
        AppraisalQuestion question = getAppraisalQuestionEntityById(id);
        appraisalQuestionRepository.delete(question);
    }

    private AppraisalQuestion getAppraisalQuestionEntityById(Long id) {
        return appraisalQuestionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Question not found with id: " + id));
    }

    private AppraisalQuestionResponseDto mapToResponseDto(AppraisalQuestion question) {
        AppraisalQuestionResponseDto dto = new AppraisalQuestionResponseDto();
        dto.setId(question.getId());
        dto.setSectionId(question.getSection().getId());
        dto.setQuestionText(question.getQuestionText());
        dto.setResponseType(question.getResponseType());
        dto.setIsRequired(question.getIsRequired());
        dto.setWeight(question.getWeight());
        dto.setRatingScaleId(question.getRatingScale() != null ? question.getRatingScale().getId() : null);
        dto.setCreatedAt(question.getCreatedAt());
        return dto;
    }
}
