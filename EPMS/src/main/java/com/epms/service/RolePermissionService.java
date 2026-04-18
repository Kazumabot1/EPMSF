package com.epms.service;

import com.epms.dto.RolePermissionRequestDto;
import com.epms.dto.RolePermissionResponseDto;

import java.util.List;

public interface RolePermissionService {

    RolePermissionResponseDto createRolePermission(RolePermissionRequestDto requestDto);

    List<RolePermissionResponseDto> getAllRolePermissions();

    RolePermissionResponseDto getRolePermissionById(Integer id);

    RolePermissionResponseDto updateRolePermission(Integer id, RolePermissionRequestDto requestDto);

    void deleteRolePermission(Integer id);
}
