package com.epms.service.impl;

import com.epms.dto.RoleRequestDto;
import com.epms.dto.RoleResponseDto;
import com.epms.entity.Role;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.RoleRepository;
import com.epms.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {

    private final RoleRepository roleRepository;

    @Override
    public RoleResponseDto createRole(RoleRequestDto requestDto) {
        Role role = new Role();
        role.setName(requestDto.getName().trim());
        role.setDescription(requestDto.getDescription() != null ? requestDto.getDescription().trim() : null);

        Role savedRole = roleRepository.save(role);
        return mapToResponseDto(savedRole);
    }

    @Override
    public List<RoleResponseDto> getAllRoles() {
        return roleRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public RoleResponseDto getRoleById(Integer id) {
        Role role = getRoleEntityById(id);
        return mapToResponseDto(role);
    }

    @Override
    public RoleResponseDto updateRole(Integer id, RoleRequestDto requestDto) {
        Role existingRole = getRoleEntityById(id);
        existingRole.setName(requestDto.getName().trim());
        existingRole.setDescription(requestDto.getDescription() != null ? requestDto.getDescription().trim() : null);

        Role updatedRole = roleRepository.save(existingRole);
        return mapToResponseDto(updatedRole);
    }

    @Override
    public void deleteRole(Integer id) {
        Role existingRole = getRoleEntityById(id);
        roleRepository.delete(existingRole);
    }

    private Role getRoleEntityById(Integer id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Role not found with id: " + id));
    }

    private RoleResponseDto mapToResponseDto(Role role) {
        return new RoleResponseDto(
                role.getId(),
                role.getName(),
                role.getDescription()
        );
    }
}
