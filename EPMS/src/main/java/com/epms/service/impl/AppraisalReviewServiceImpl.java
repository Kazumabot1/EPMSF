package com.epms.service.impl;

import com.epms.dto.AppraisalReviewRequestDto;
import com.epms.dto.AppraisalReviewResponseDto;
import com.epms.entity.AppraisalReview;
import com.epms.entity.Appraisal;
import com.epms.entity.Employee;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.AppraisalReviewRepository;
import com.epms.repository.AppraisalRepository;
import com.epms.repository.EmployeeRepository;
import com.epms.service.AppraisalReviewService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class AppraisalReviewServiceImpl implements AppraisalReviewService {

    private final AppraisalReviewRepository appraisalReviewRepository;
    private final AppraisalRepository appraisalRepository;
    private final EmployeeRepository employeeRepository;

    @Override
    public AppraisalReviewResponseDto createAppraisalReview(AppraisalReviewRequestDto requestDto) {
        Appraisal appraisal = appraisalRepository.findById(requestDto.getAppraisalId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal not found with id: " + requestDto.getAppraisalId()));

        Employee reviewer = employeeRepository.findById(requestDto.getReviewerEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + requestDto.getReviewerEmployeeId()));

        AppraisalReview review = new AppraisalReview();
        review.setAppraisal(appraisal);
        review.setReviewer(reviewer);
        review.setReviewType(requestDto.getReviewType());
        review.setReviewStatus(requestDto.getReviewStatus() != null ? requestDto.getReviewStatus() : "pending");
        review.setTotalScore(requestDto.getTotalScore());
        review.setComments(requestDto.getComments());

        AppraisalReview savedReview = appraisalReviewRepository.save(review);
        return mapToResponseDto(savedReview);
    }

    @Override
    public List<AppraisalReviewResponseDto> getAllAppraisalReviews() {
        return appraisalReviewRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public AppraisalReviewResponseDto getAppraisalReviewById(Integer id) {
        AppraisalReview review = getAppraisalReviewEntityById(id);
        return mapToResponseDto(review);
    }

    @Override
    public AppraisalReviewResponseDto updateAppraisalReview(Integer id, AppraisalReviewRequestDto requestDto) {
        AppraisalReview existingReview = getAppraisalReviewEntityById(id);

        Appraisal appraisal = appraisalRepository.findById(requestDto.getAppraisalId())
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal not found with id: " + requestDto.getAppraisalId()));

        Employee reviewer = employeeRepository.findById(requestDto.getReviewerEmployeeId())
                .orElseThrow(() -> new ResourceNotFoundException("Employee not found with id: " + requestDto.getReviewerEmployeeId()));

        existingReview.setAppraisal(appraisal);
        existingReview.setReviewer(reviewer);
        existingReview.setReviewType(requestDto.getReviewType());
        if (requestDto.getReviewStatus() != null) {
            existingReview.setReviewStatus(requestDto.getReviewStatus());
        }
        existingReview.setTotalScore(requestDto.getTotalScore());
        existingReview.setComments(requestDto.getComments());

        AppraisalReview updatedReview = appraisalReviewRepository.save(existingReview);
        return mapToResponseDto(updatedReview);
    }

    @Override
    public void deleteAppraisalReview(Integer id) {
        AppraisalReview existingReview = getAppraisalReviewEntityById(id);
        appraisalReviewRepository.delete(existingReview);
    }

    private AppraisalReview getAppraisalReviewEntityById(Integer id) {
        return appraisalReviewRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Appraisal Review not found with id: " + id));
    }

    private AppraisalReviewResponseDto mapToResponseDto(AppraisalReview review) {
        AppraisalReviewResponseDto dto = new AppraisalReviewResponseDto();
        dto.setId(review.getId());
        dto.setAppraisalId(review.getAppraisal().getId());
        dto.setReviewerEmployeeId(review.getReviewer().getId());
        dto.setReviewType(review.getReviewType());
        dto.setReviewStatus(review.getReviewStatus());
        dto.setTotalScore(review.getTotalScore());
        dto.setComments(review.getComments());
        return dto;
    }
}
