package com.epms.controller;

import com.epms.dto.AssessmentFormDtos.AssessmentFormActivationPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentFormPayload;
import com.epms.dto.AssessmentFormDtos.AssessmentFormResponse;
import com.epms.dto.GenericApiResponse;
import com.epms.service.AssessmentFormDefinitionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/appraisal-forms")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class AssessmentFormDefinitionController {

    private final AssessmentFormDefinitionService service;

    @GetMapping
    public ResponseEntity<GenericApiResponse<List<AssessmentFormResponse>>> getAll() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment forms fetched", service.getAll())
        );
    }

    @GetMapping("/{id}")
    public ResponseEntity<GenericApiResponse<AssessmentFormResponse>> getById(
            @PathVariable Integer id
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment form fetched", service.getById(id))
        );
    }

    @PostMapping
    public ResponseEntity<GenericApiResponse<AssessmentFormResponse>> create(
            @RequestBody AssessmentFormPayload payload
    ) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(GenericApiResponse.success("Assessment form created", service.create(payload)));
    }

    @PutMapping("/{id}")
    public ResponseEntity<GenericApiResponse<AssessmentFormResponse>> update(
            @PathVariable Integer id,
            @RequestBody AssessmentFormPayload payload
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment form updated", service.update(id, payload))
        );
    }

    @PatchMapping("/{id}/activation")
    public ResponseEntity<GenericApiResponse<AssessmentFormResponse>> updateActivation(
            @PathVariable Integer id,
            @RequestBody AssessmentFormActivationPayload payload
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment form activation updated", service.updateActivation(id, payload))
        );
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<GenericApiResponse<String>> deactivate(
            @PathVariable Integer id
    ) {
        service.deactivate(id);

        return ResponseEntity.ok(
                GenericApiResponse.success("Assessment form deactivated", "OK")
        );
    }
}