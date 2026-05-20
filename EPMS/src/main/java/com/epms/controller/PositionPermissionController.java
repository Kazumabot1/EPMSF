package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.PositionPermissionAuditDto;
import com.epms.dto.PositionPermissionDto;
import com.epms.dto.TeamPermissionImpactPreviewDto;
import com.epms.service.PositionPermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/position-permissions")
@RequiredArgsConstructor
public class PositionPermissionController {

    private final PositionPermissionService positionPermissionService;

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

    @PutMapping("/position/{positionId}")
    public ResponseEntity<GenericApiResponse<PositionPermissionDto>> save(
            @PathVariable Integer positionId,
            @RequestBody PositionPermissionDto dto
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Position permissions saved",
                        positionPermissionService.save(positionId, dto)
                )
        );
    }

    @GetMapping("/position/{positionId}/audit")
    public ResponseEntity<GenericApiResponse<List<PositionPermissionAuditDto>>> getAudit(
            @PathVariable Integer positionId
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success(
                        "Position permission audit fetched",
                        positionPermissionService.getAudit(positionId)
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
                        "Team permission impact preview fetched",
                        positionPermissionService.previewImpact(positionId, dto)
                )
        );
    }
}