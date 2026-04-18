package com.epms.service.impl;

import com.epms.dto.UserRoleRequestDto;
import com.epms.dto.UserRoleResponseDto;
import com.epms.entity.UserRole;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.UserRoleRepository;
import com.epms.service.UserRoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class UserRoleServiceImpl implements UserRoleService {

    private final UserRoleRepository userRoleRepository;

    @Override
    public UserRoleResponseDto createUserRole(UserRoleRequestDto requestDto) {
        UserRole userRole = new UserRole();
        userRole.setUserId(requestDto.getUserId());
        userRole.setRoleId(requestDto.getRoleId());

        UserRole savedUserRole = userRoleRepository.save(userRole);
        return mapToResponseDto(savedUserRole);
    }

    @Override
    public List<UserRoleResponseDto> getAllUserRoles() {
        return userRoleRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public UserRoleResponseDto getUserRoleById(Integer id) {
        UserRole userRole = getUserRoleEntityById(id);
        return mapToResponseDto(userRole);
    }

    @Override
    public UserRoleResponseDto updateUserRole(Integer id, UserRoleRequestDto requestDto) {
        UserRole existingUserRole = getUserRoleEntityById(id);
        existingUserRole.setUserId(requestDto.getUserId());
        existingUserRole.setRoleId(requestDto.getRoleId());

        UserRole updatedUserRole = userRoleRepository.save(existingUserRole);
        return mapToResponseDto(updatedUserRole);
    }

    @Override
    public void deleteUserRole(Integer id) {
        UserRole existingUserRole = getUserRoleEntityById(id);
        userRoleRepository.delete(existingUserRole);
    }

    private UserRole getUserRoleEntityById(Integer id) {
        return userRoleRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("UserRole not found with id: " + id));
    }

    private UserRoleResponseDto mapToResponseDto(UserRole userRole) {
        return new UserRoleResponseDto(
                userRole.getId(),
                userRole.getUserId(),
                userRole.getRoleId()
        );
    }
}
