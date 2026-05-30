package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.appraisal.AppraisalScoreBandRequest;
import com.epms.dto.appraisal.AppraisalScoreBandResponse;
import com.epms.entity.AppraisalScoreBand;
import com.epms.service.AppraisalScoreBandService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr/appraisal/score-bands")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize(
        "hasAnyRole('HR', 'HRADMIN') "
                + "or principal.dashboard == 'HR_DASHBOARD' "
                + "or principal.dashboard == 'HRADMIN_DASHBOARD'"
)
public class AppraisalScoreBandController {

    private final AppraisalScoreBandService appraisalScoreBandService;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AppraisalScoreBandResponse>>> getActiveScoreBands() {
        List<AppraisalScoreBandResponse> response = appraisalScoreBandService.getActiveScoreBands()
                .stream()
                .map(this::toResponse)
                .toList();
        return ResponseEntity.ok(GenericApiResponse.success("Appraisal score bands fetched", response));
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<AppraisalScoreBandResponse>> saveScoreBand(
            @Valid @RequestBody AppraisalScoreBandRequest request
    ) {
        AppraisalScoreBand saved = appraisalScoreBandService.saveScoreBand(toEntity(request));
        return ResponseEntity.ok(GenericApiResponse.success("Appraisal score band saved", toResponse(saved)));
    }

    @DeleteMapping("/{scoreBandId}")
    public ResponseEntity<GenericApiResponse<Void>> deleteScoreBand(@PathVariable Integer scoreBandId) {
        appraisalScoreBandService.deleteScoreBand(scoreBandId);
        return ResponseEntity.ok(GenericApiResponse.success("Appraisal score band deleted", null));
    }

    private AppraisalScoreBand toEntity(AppraisalScoreBandRequest request) {
        AppraisalScoreBand scoreBand = new AppraisalScoreBand();
        scoreBand.setId(request.getId());
        scoreBand.setMinScore(request.getMinScore());
        scoreBand.setMaxScore(request.getMaxScore());
        scoreBand.setLabel(request.getLabel());
        scoreBand.setDescription(request.getDescription());
        scoreBand.setSortOrder(request.getSortOrder() == null ? 0 : request.getSortOrder());
        scoreBand.setActive(request.getActive() == null || request.getActive());
        return scoreBand;
    }

    private AppraisalScoreBandResponse toResponse(AppraisalScoreBand scoreBand) {
        return new AppraisalScoreBandResponse(
                scoreBand.getId(),
                scoreBand.getMinScore(),
                scoreBand.getMaxScore(),
                scoreBand.getLabel(),
                scoreBand.getDescription(),
                scoreBand.getSortOrder(),
                scoreBand.getActive()
        );
    }
}
