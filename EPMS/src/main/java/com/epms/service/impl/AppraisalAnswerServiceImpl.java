package com.epms.service.impl;

import com.epms.dto.AppraisalAnswerRequestDto;
import com.epms.dto.AppraisalAnswerResponseDto;
import com.epms.entity.AppraisalAnswer;
import com.epms.entity.AppraisalReview;
import com.epms.entity.AppraisalQuestion;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalAnswerRepository;
import com.epms.repository.AppraisalReviewRepository;
import com.epms.repository.AppraisalQuestionRepository;
import com.epms.service.AppraisalAnswerService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppraisalAnswerServiceImpl implements AppraisalAnswerService {

    private final AppraisalAnswerRepository appraisalAnswerRepository;
    private final AppraisalReviewRepository appraisalReviewRepository;
    private final AppraisalQuestionRepository appraisalQuestionRepository;

    @Override
    public AppraisalAnswerResponseDto createAppraisalAnswer(AppraisalAnswerRequestDto requestDto) {
        AppraisalReview review = appraisalReviewRepository.findById(requestDto.getReviewId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Review not found with id: " + requestDto.getReviewId()));

        AppraisalQuestion question = appraisalQuestionRepository.findById(requestDto.getQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Question not found with id: " + requestDto.getQuestionId()));

        AppraisalAnswer appraisalAnswer = new AppraisalAnswer();
        appraisalAnswer.setReview(review);
        appraisalAnswer.setQuestion(question);
        appraisalAnswer.setAnswerText(requestDto.getAnswerText());
        appraisalAnswer.setRatingValue(requestDto.getRatingValue());
        appraisalAnswer.setYesNoValue(requestDto.getYesNoValue());

        AppraisalAnswer savedAnswer = appraisalAnswerRepository.save(appraisalAnswer);
        return mapToResponseDto(savedAnswer);
    }

    @Override
    public List<AppraisalAnswerResponseDto> getAllAppraisalAnswers() {
        return appraisalAnswerRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public AppraisalAnswerResponseDto getAppraisalAnswerById(Integer id) {
        AppraisalAnswer appraisalAnswer = getAppraisalAnswerEntityById(id);
        return mapToResponseDto(appraisalAnswer);
    }

    @Override
    public AppraisalAnswerResponseDto updateAppraisalAnswer(Integer id, AppraisalAnswerRequestDto requestDto) {
        AppraisalAnswer existingAnswer = getAppraisalAnswerEntityById(id);

        AppraisalReview review = appraisalReviewRepository.findById(requestDto.getReviewId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Review not found with id: " + requestDto.getReviewId()));

        AppraisalQuestion question = appraisalQuestionRepository.findById(requestDto.getQuestionId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Question not found with id: " + requestDto.getQuestionId()));

        existingAnswer.setReview(review);
        existingAnswer.setQuestion(question);
        existingAnswer.setAnswerText(requestDto.getAnswerText());
        existingAnswer.setRatingValue(requestDto.getRatingValue());
        existingAnswer.setYesNoValue(requestDto.getYesNoValue());

        AppraisalAnswer updatedAnswer = appraisalAnswerRepository.save(existingAnswer);
        return mapToResponseDto(updatedAnswer);
    }

    @Override
    public void deleteAppraisalAnswer(Integer id) {
        AppraisalAnswer existingAnswer = getAppraisalAnswerEntityById(id);
        appraisalAnswerRepository.delete(existingAnswer);
    }

    private AppraisalAnswer getAppraisalAnswerEntityById(Integer id) {
        return appraisalAnswerRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Answer not found with id: " + id));
    }

    private AppraisalAnswerResponseDto mapToResponseDto(AppraisalAnswer appraisalAnswer) {
        AppraisalAnswerResponseDto dto = new AppraisalAnswerResponseDto();
        dto.setId(appraisalAnswer.getId());
        dto.setReviewId(appraisalAnswer.getReview().getId());
        dto.setQuestionId(appraisalAnswer.getQuestion().getId());
        dto.setAnswerText(appraisalAnswer.getAnswerText());
        dto.setRatingValue(appraisalAnswer.getRatingValue());
        dto.setYesNoValue(appraisalAnswer.getYesNoValue());
        dto.setWeightedScore(appraisalAnswer.getWeightedScore());
        return dto;
    }
}
