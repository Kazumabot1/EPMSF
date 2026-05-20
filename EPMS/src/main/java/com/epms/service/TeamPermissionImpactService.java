package com.epms.service;

import com.epms.dto.PositionPermissionDto;
import com.epms.dto.TeamPermissionImpactPreviewDto;

public interface TeamPermissionImpactService {
    TeamPermissionImpactPreviewDto previewImpact(Integer positionId, PositionPermissionDto dto);
}