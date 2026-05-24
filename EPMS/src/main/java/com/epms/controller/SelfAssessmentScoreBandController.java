package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.SelfAssessmentScoreBandDtos.ScoreBandAuditResponse;
import com.epms.dto.SelfAssessmentScoreBandDtos.ScoreTableResponse;
import com.epms.dto.SelfAssessmentScoreBandDtos.ScoreTableUpdateRequest;
import com.epms.service.SelfAssessmentScoreBandService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/self-assessment-score-table")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class SelfAssessmentScoreBandController {

    private final SelfAssessmentScoreBandService service;

    @GetMapping
    public ResponseEntity<GenericApiResponse<ScoreTableResponse>> getTable() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Self-assessment score table fetched", service.getTable())
        );
    }

    @GetMapping("/audit")
    public ResponseEntity<GenericApiResponse<List<ScoreBandAuditResponse>>> getAudit() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Self-assessment score table audit fetched", service.getAudit())
        );
    }

    @PutMapping
    public ResponseEntity<GenericApiResponse<ScoreTableResponse>> updateTable(
            @RequestBody ScoreTableUpdateRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Self-assessment score table updated", service.updateTable(request))
        );
    }
}