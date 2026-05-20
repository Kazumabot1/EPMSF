package com.epms.service;

import com.epms.dto.PositionPermissionAuditDto;
import com.epms.dto.PositionPermissionDto;
import com.epms.dto.TeamPermissionImpactPreviewDto;

import java.util.List;

public interface PositionPermissionService {
    PositionPermissionDto getMyPermissions();

    PositionPermissionDto getByPositionId(Integer positionId);

    PositionPermissionDto save(Integer positionId, PositionPermissionDto dto);

    List<PositionPermissionAuditDto> getAudit(Integer positionId);

    TeamPermissionImpactPreviewDto previewImpact(Integer positionId, PositionPermissionDto dto);

    boolean currentUserHasPermission(String permissionField);

    void assertCurrentUserHasPermission(String permissionField);
}