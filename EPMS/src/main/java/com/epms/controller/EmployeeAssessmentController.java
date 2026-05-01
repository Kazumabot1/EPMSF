package com.epms.controller;

import com.epms.dto.EmployeeAssessmentDtos.AssessmentRequest;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentResponse;
import com.epms.dto.EmployeeAssessmentDtos.ScoreTableRowResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.service.EmployeeAssessmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/employee-assessments")
@RequiredArgsConstructor
public class EmployeeAssessmentController {

    private final EmployeeAssessmentService assessmentService;

    @GetMapping("/template")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> getTemplate() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment template fetched", assessmentService.getTemplateForCurrentUser())
        );
    }

    @GetMapping("/my-latest-draft")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> getLatestDraft() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Latest assessment draft fetched", assessmentService.getLatestDraftForCurrentUser())
        );
    }

    @GetMapping("/my-scores")
    public ResponseEntity<GenericApiResponse<List<ScoreTableRowResponse>>> getMyScores() {
        return ResponseEntity.ok(
                GenericApiResponse.success("My assessment scores fetched", assessmentService.getMyScores())
        );
    }

    @GetMapping("/score-table")
    public ResponseEntity<GenericApiResponse<List<ScoreTableRowResponse>>> getScoreTable() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Employee assessment score table fetched", assessmentService.getScoreTable())
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment fetched", assessmentService.getById(id))
        );
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> saveDraft(@RequestBody AssessmentRequest request) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment draft saved", assessmentService.saveDraft(request))
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> updateDraft(
            @PathVariable Long id,
            @RequestBody AssessmentRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment draft updated", assessmentService.updateDraft(id, request))
        );
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> submit(
            @PathVariable Long id,
            @RequestBody AssessmentRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment submitted", assessmentService.submit(id, request))
        );
    }
}
