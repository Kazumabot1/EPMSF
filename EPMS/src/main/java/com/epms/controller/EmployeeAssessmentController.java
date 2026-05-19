
package com.epms.controller;

import com.epms.dto.EmployeeAssessmentDtos.AssessmentRequest;
import com.epms.dto.EmployeeAssessmentDtos.AssessmentResponse;
import com.epms.dto.EmployeeAssessmentDtos.ReviewActionRequest;
import com.epms.dto.EmployeeAssessmentDtos.ScoreTableRowResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.service.EmployeeAssessmentService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/employee-assessments")
@RequiredArgsConstructor
public class EmployeeAssessmentController {

    private final EmployeeAssessmentService assessmentService;

    @GetMapping("/template")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> getTemplate() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Assessment template fetched",
                        assessmentService.getTemplateForCurrentUser()
                )
        );
    }

    @GetMapping("/my-latest-draft")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> getLatestDraft() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Latest assessment fetched",
                        assessmentService.getLatestDraftForCurrentUser()
                )
        );
    }

    @GetMapping("/my-scores")
    public ResponseEntity<GenericApiResponse<List<ScoreTableRowResponse>>> getMyScores() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "My assessment scores fetched",
                        assessmentService.getMyScores()
                )
        );
    }

    @GetMapping("/my-history")
    public ResponseEntity<GenericApiResponse<List<ScoreTableRowResponse>>> getMyHistory() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "My assessment history fetched",
                        assessmentService.getMyHistory()
                )
        );
    }

    @GetMapping("/score-table")
    public ResponseEntity<GenericApiResponse<List<ScoreTableRowResponse>>> getScoreTable() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Employee assessment score table fetched",
                        assessmentService.getScoreTable()
                )
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> getById(@PathVariable Long id) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Assessment fetched",
                        assessmentService.getById(id)
                )
        );
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> saveDraft(
            @RequestBody AssessmentRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Assessment draft saved",
                        assessmentService.saveDraft(request)
                )
        );
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> updateDraft(
            @PathVariable Long id,
            @RequestBody AssessmentRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Assessment draft updated",
                        assessmentService.updateDraft(id, request)
                )
        );
    }

    @PostMapping("/{id}/submit")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> submit(
            @PathVariable Long id,
            @RequestBody AssessmentRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Assessment submitted and sent to department head",
                        assessmentService.submit(id, request)
                )
        );
    }

    @PostMapping("/{id}/manager-remark")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> managerRemark(
            @PathVariable Long id,
            @RequestBody(required = false) ReviewActionRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Manager remarks saved",
                        assessmentService.managerRemark(id, request)
                )
        );
    }

    @PostMapping("/{id}/manager-sign")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> managerSign(
            @PathVariable Long id,
            @RequestBody(required = false) ReviewActionRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Manager remarks saved",
                        assessmentService.managerSign(id, request)
                )
        );
    }

    @PostMapping("/{id}/department-head-sign")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> departmentHeadSign(
            @PathVariable Long id,
            @RequestBody(required = false) ReviewActionRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Department head signed assessment",
                        assessmentService.departmentHeadSign(id, request)
                )
        );
    }

    @PostMapping("/{id}/hr-approve")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> hrApprove(
            @PathVariable Long id,
            @RequestBody(required = false) ReviewActionRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "HR approved assessment",
                        assessmentService.hrApprove(id, request)
                )
        );
    }

    @PostMapping("/{id}/hr-decline")
    public ResponseEntity<GenericApiResponse<AssessmentResponse>> hrDecline(
            @PathVariable Long id,
            @RequestBody(required = false) ReviewActionRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "HR declined assessment",
                        assessmentService.hrDecline(id, request)
                )
        );
    }
}