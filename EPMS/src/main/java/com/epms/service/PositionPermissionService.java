package com.epms.service;

import com.epms.dto.PositionPermissionAuditDto;
import com.epms.dto.PositionPermissionDto;

import java.util.List;

public interface PositionPermissionService {

    /** Get permissions for a specific position (HR / Admin view). */
    PositionPermissionDto getByPositionId(Integer positionId);

    /**
     * Get permissions for the currently logged-in user's position.
     * Used by the frontend to show/hide sidebar items.
     * Returns all-false DTO if the user has no position or no permissions row.
     */
    PositionPermissionDto getMyPermissions();

    /**
     * Save (create or update) permissions for a position.
     * Writes audit rows for every flag that changed.
     *
     * @param positionId  the position to update
     * @param dto         the new permission state
     * @return            the saved permission state
     */
    PositionPermissionDto savePermissions(Integer positionId, PositionPermissionDto dto);

    /** Audit history for a position's permissions, newest first. */
    List<PositionPermissionAuditDto> getAuditHistory(Integer positionId);

    /**
     * Check if the currently logged-in user's position has a specific permission.
     * Throws AccessDeniedException if not.
     */
    void assertCurrentUserHasPermission(String permissionField);

    /**
     * Returns true if the current user's position has the given permission.
     * Does NOT throw — use this for conditional logic.
     */
    boolean currentUserHasPermission(String permissionField);
}
