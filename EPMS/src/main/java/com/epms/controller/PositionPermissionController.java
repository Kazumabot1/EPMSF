package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.PositionPermissionAuditDto;
import com.epms.dto.PositionPermissionDto;
import com.epms.dto.TeamPermissionImpactPreviewDto;
import com.epms.service.PositionPermissionService;
import com.epms.service.TeamPermissionImpactService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/position-permissions")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class PositionPermissionController {

    private final PositionPermissionService positionPermissionService;
    private final TeamPermissionImpactService teamPermissionImpactService;

    @GetMapping("/me")
    public ResponseEntity<GenericApiResponse<PositionPermissionDto>> getMyPermissions() {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Current position permissions fetched",
                        positionPermissionService.getMyPermissions()
                )
        );
    }

    @GetMapping("/position/{positionId}")
    public ResponseEntity<GenericApiResponse<PositionPermissionDto>> getByPositionId(
            @PathVariable Integer positionId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Position permissions fetched",
                        positionPermissionService.getByPositionId(positionId)
                )
        );
    }

    @PostMapping("/position/{positionId}/impact-preview")
    public ResponseEntity<GenericApiResponse<TeamPermissionImpactPreviewDto>> previewImpact(
            @PathVariable Integer positionId,
            @RequestBody PositionPermissionDto dto
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Position permission impact preview fetched",
                        teamPermissionImpactService.previewImpact(positionId, dto)
                )
        );
    }

    @PutMapping("/position/{positionId}")
    public ResponseEntity<GenericApiResponse<PositionPermissionDto>> savePermissions(
            @PathVariable Integer positionId,
            @RequestBody PositionPermissionDto dto
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Position permissions saved",
                        positionPermissionService.savePermissions(positionId, dto)
                )
        );
    }

    @GetMapping("/position/{positionId}/audit")
    public ResponseEntity<GenericApiResponse<List<PositionPermissionAuditDto>>> getAuditHistory(
            @PathVariable Integer positionId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Position permission audit fetched",
                        positionPermissionService.getAuditHistory(positionId)
                )
        );
    }
}