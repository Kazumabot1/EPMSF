package com.epms.service;

import com.epms.dto.PositionPermissionDto;
import com.epms.dto.TeamPermissionImpactPreviewDto;
import com.epms.entity.User;

public interface TeamPermissionImpactService {
    TeamPermissionImpactPreviewDto previewImpact(Integer positionId, PositionPermissionDto nextPermissions);

    TeamPermissionImpactPreviewDto previewImpact(
            Integer positionId,
            PositionPermissionDto currentPermissions,
            PositionPermissionDto nextPermissions
    );

    TeamPermissionImpactPreviewDto applyImpact(
            Integer positionId,
            PositionPermissionDto currentPermissions,
            PositionPermissionDto nextPermissions,
            User editor
    );
}