package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.appraisal.AppraisalTemplateRequest;
import com.epms.dto.appraisal.AppraisalTemplateResponse;
import com.epms.entity.enums.AppraisalTemplateStatus;
import com.epms.security.SecurityUtils;
import com.epms.service.AppraisalTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/hr/appraisal/templates")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
@PreAuthorize(
        "hasAnyRole('HR', 'HRADMIN') "
                + "or principal.dashboard == 'HR_DASHBOARD' "
                + "or principal.dashboard == 'HRADMIN_DASHBOARD'"
)
public class AppraisalTemplateController {

    private final AppraisalTemplateService appraisalTemplateService;

    @PostMapping
    public ResponseEntity<GenericApiResponse<AppraisalTemplateResponse>> createTemplate(
            @Valid @RequestBody AppraisalTemplateRequest request
    ) {
        AppraisalTemplateResponse response = appraisalTemplateService.createTemplate(request, SecurityUtils.currentUserId());
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Appraisal template created", response));
    }

    @PutMapping("/{templateId}")
    public ResponseEntity<GenericApiResponse<AppraisalTemplateResponse>> updateDraftTemplate(
            @PathVariable Integer templateId,
            @Valid @RequestBody AppraisalTemplateRequest request
    ) {
        AppraisalTemplateResponse response = appraisalTemplateService.updateDraftTemplate(templateId, request, SecurityUtils.currentUserId());
        return ResponseEntity.ok(GenericApiResponse.success("Appraisal template updated", response));
    }

    @GetMapping("/{templateId}")
    public ResponseEntity<GenericApiResponse<AppraisalTemplateResponse>> getTemplate(@PathVariable Integer templateId) {
        AppraisalTemplateResponse response = appraisalTemplateService.getTemplate(templateId);
        return ResponseEntity.ok(GenericApiResponse.success("Appraisal template fetched", response));
    }

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AppraisalTemplateResponse>>> getTemplates(
            @RequestParam(required = false) AppraisalTemplateStatus status
    ) {
        List<AppraisalTemplateResponse> response = appraisalTemplateService.getTemplates(status);
        return ResponseEntity.ok(GenericApiResponse.success("Appraisal templates fetched", response));
    }

    @PatchMapping("/{templateId}/activate")
    public ResponseEntity<GenericApiResponse<AppraisalTemplateResponse>> activateTemplate(@PathVariable Integer templateId) {
        AppraisalTemplateResponse response = appraisalTemplateService.activateTemplate(templateId);
        return ResponseEntity.ok(GenericApiResponse.success("Appraisal template activated", response));
    }

    @PatchMapping("/{templateId}/archive")
    public ResponseEntity<GenericApiResponse<AppraisalTemplateResponse>> archiveTemplate(@PathVariable Integer templateId) {
        AppraisalTemplateResponse response = appraisalTemplateService.archiveTemplate(templateId);
        return ResponseEntity.ok(GenericApiResponse.success("Appraisal template archived", response));
    }


}
