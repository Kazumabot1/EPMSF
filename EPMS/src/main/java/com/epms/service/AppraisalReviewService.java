package com.epms.service;

import com.epms.dto.AppraisalReviewRequestDto;
import com.epms.dto.AppraisalReviewResponseDto;

import java.util.List;

public interface AppraisalReviewService {

    AppraisalReviewResponseDto createAppraisalReview(AppraisalReviewRequestDto requestDto);

    List<AppraisalReviewResponseDto> getAllAppraisalReviews();

    AppraisalReviewResponseDto getAppraisalReviewById(Integer id);

    AppraisalReviewResponseDto updateAppraisalReview(Integer id, AppraisalReviewRequestDto requestDto);

    void deleteAppraisalReview(Integer id);
}

