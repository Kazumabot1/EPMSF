package com.epms.service.impl;

import com.epms.dto.RolePermissionRequestDto;
import com.epms.dto.RolePermissionResponseDto;
import com.epms.entity.RolePermission;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.RolePermissionRepository;
import com.epms.service.RolePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RolePermissionServiceImpl implements RolePermissionService {

    private final RolePermissionRepository rolePermissionRepository;

    @Override
    public RolePermissionResponseDto createRolePermission(RolePermissionRequestDto requestDto) {
        RolePermission rolePermission = new RolePermission();
        rolePermission.setRoleId(requestDto.getRoleId());
        rolePermission.setPermissionId(requestDto.getPermissionId());

        RolePermission savedRolePermission = rolePermissionRepository.save(rolePermission);
        return mapToResponseDto(savedRolePermission);
    }

    @Override
    public List<RolePermissionResponseDto> getAllRolePermissions() {
        return rolePermissionRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public RolePermissionResponseDto getRolePermissionById(Integer id) {
        RolePermission rolePermission = getRolePermissionEntityById(id);
        return mapToResponseDto(rolePermission);
    }

    @Override
    public RolePermissionResponseDto updateRolePermission(Integer id, RolePermissionRequestDto requestDto) {
        RolePermission existingRolePermission = getRolePermissionEntityById(id);
        existingRolePermission.setRoleId(requestDto.getRoleId());
        existingRolePermission.setPermissionId(requestDto.getPermissionId());

        RolePermission updatedRolePermission = rolePermissionRepository.save(existingRolePermission);
        return mapToResponseDto(updatedRolePermission);
    }

    @Override
    public void deleteRolePermission(Integer id) {
        RolePermission existingRolePermission = getRolePermissionEntityById(id);
        rolePermissionRepository.delete(existingRolePermission);
    }

    private RolePermission getRolePermissionEntityById(Integer id) {
        return rolePermissionRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("RolePermission not found with id: " + id));
    }

    private RolePermissionResponseDto mapToResponseDto(RolePermission rolePermission) {
        return new RolePermissionResponseDto(
                rolePermission.getId(),
                rolePermission.getRoleId(),
                rolePermission.getPermissionId()
        );
    }
}
