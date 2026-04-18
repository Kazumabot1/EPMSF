package com.epms.service;

import com.epms.dto.PermissionRequestDto;
import com.epms.dto.PermissionResponseDto;

import java.util.List;

public interface PermissionService {

    PermissionResponseDto createPermission(PermissionRequestDto requestDto);

    List<PermissionResponseDto> getAllPermissions();

    PermissionResponseDto getPermissionById(Integer id);

    PermissionResponseDto updatePermission(Integer id, PermissionRequestDto requestDto);

    void deletePermission(Integer id);
}
