package com.epms.controller;

import com.epms.dto.AppraisalReviewRequestDto;
import com.epms.dto.AppraisalReviewResponseDto;
import com.epms.service.AppraisalReviewService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appraisal-reviews")
@RequiredArgsConstructor
public class AppraisalReviewController {

    private final AppraisalReviewService appraisalReviewService;

    @PostMapping
    public ResponseEntity<AppraisalReviewResponseDto> createAppraisalReview(
            @Valid @RequestBody AppraisalReviewRequestDto requestDto) {
        AppraisalReviewResponseDto responseDto = appraisalReviewService.createAppraisalReview(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<AppraisalReviewResponseDto>> getAllAppraisalReviews() {
        return ResponseEntity.ok(appraisalReviewService.getAllAppraisalReviews());
    }

    @GetMapping("/{id}")
    public ResponseEntity<AppraisalReviewResponseDto> getAppraisalReviewById(@PathVariable Integer id) {
        return ResponseEntity.ok(appraisalReviewService.getAppraisalReviewById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<AppraisalReviewResponseDto> updateAppraisalReview(
            @PathVariable Integer id,
            @Valid @RequestBody AppraisalReviewRequestDto requestDto) {
        return ResponseEntity.ok(appraisalReviewService.updateAppraisalReview(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteAppraisalReview(@PathVariable Integer id) {
        appraisalReviewService.deleteAppraisalReview(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<AppraisalReviewResponseDto> submitAppraisalReview(@PathVariable Integer id) {
        AppraisalReviewResponseDto review = appraisalReviewService.getAppraisalReviewById(id);
        AppraisalReviewRequestDto requestDto = new AppraisalReviewRequestDto();
        requestDto.setAppraisalId(review.getAppraisalId());
        requestDto.setReviewerEmployeeId(review.getReviewerEmployeeId());
        requestDto.setReviewType(review.getReviewType());
        requestDto.setReviewStatus("SUBMITTED");
        requestDto.setTotalScore(review.getTotalScore());
        requestDto.setComments(review.getComments());
        return ResponseEntity.ok(appraisalReviewService.updateAppraisalReview(id, requestDto));
    }
}
