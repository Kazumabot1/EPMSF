package com.epms.service;

import com.epms.dto.UserRoleRequestDto;
import com.epms.dto.UserRoleResponseDto;

import java.util.List;

public interface UserRoleService {

    UserRoleResponseDto createUserRole(UserRoleRequestDto requestDto);

    List<UserRoleResponseDto> getAllUserRoles();

    UserRoleResponseDto getUserRoleById(Integer id);

    UserRoleResponseDto updateUserRole(Integer id, UserRoleRequestDto requestDto);

    void deleteUserRole(Integer id);
}
