package com.epms.service;

import com.epms.dto.RoleRequestDto;
import com.epms.dto.RoleResponseDto;

import java.util.List;

public interface RoleService {

    RoleResponseDto createRole(RoleRequestDto requestDto);

    List<RoleResponseDto> getAllRoles();

    RoleResponseDto getRoleById(Integer id);

    RoleResponseDto updateRole(Integer id, RoleRequestDto requestDto);

    void deleteRole(Integer id);
}
