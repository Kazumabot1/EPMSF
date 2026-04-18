package com.epms.service.impl;

import com.epms.dto.PermissionRequestDto;
import com.epms.dto.PermissionResponseDto;
import com.epms.entity.Permission;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.PermissionRepository;
import com.epms.service.PermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;

    @Override
    public PermissionResponseDto createPermission(PermissionRequestDto requestDto) {
        Permission permission = new Permission();
        permission.setName(requestDto.getName().trim());
        permission.setModule(requestDto.getModule() != null ? requestDto.getModule().trim() : null);

        Permission savedPermission = permissionRepository.save(permission);
        return mapToResponseDto(savedPermission);
    }

    @Override
    public List<PermissionResponseDto> getAllPermissions() {
        return permissionRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public PermissionResponseDto getPermissionById(Integer id) {
        Permission permission = getPermissionEntityById(id);
        return mapToResponseDto(permission);
    }

    @Override
    public PermissionResponseDto updatePermission(Integer id, PermissionRequestDto requestDto) {
        Permission existingPermission = getPermissionEntityById(id);
        existingPermission.setName(requestDto.getName().trim());
        existingPermission.setModule(requestDto.getModule() != null ? requestDto.getModule().trim() : null);

        Permission updatedPermission = permissionRepository.save(existingPermission);
        return mapToResponseDto(updatedPermission);
    }

    @Override
    public void deletePermission(Integer id) {
        Permission existingPermission = getPermissionEntityById(id);
        permissionRepository.delete(existingPermission);
    }

    private Permission getPermissionEntityById(Integer id) {
        return permissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Permission not found with id: " + id));
    }

    private PermissionResponseDto mapToResponseDto(Permission permission) {
        return new PermissionResponseDto(
                permission.getId(),
                permission.getName(),
                permission.getModule()
        );
    }
}
