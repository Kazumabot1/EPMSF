package com.epms.controller;

import com.epms.dto.UserRoleRequestDto;
import com.epms.dto.UserRoleResponseDto;
import com.epms.service.UserRoleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/user-roles")
@RequiredArgsConstructor
public class UserRoleController {

    private final UserRoleService userRoleService;

    @PostMapping
    public ResponseEntity<UserRoleResponseDto> createUserRole(
            @Valid @RequestBody UserRoleRequestDto requestDto) {
        UserRoleResponseDto responseDto = userRoleService.createUserRole(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<UserRoleResponseDto>> getAllUserRoles() {
        return ResponseEntity.ok(userRoleService.getAllUserRoles());
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserRoleResponseDto> getUserRoleById(@PathVariable Integer id) {
        return ResponseEntity.ok(userRoleService.getUserRoleById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserRoleResponseDto> updateUserRole(
            @PathVariable Integer id,
            @Valid @RequestBody UserRoleRequestDto requestDto) {
        return ResponseEntity.ok(userRoleService.updateUserRole(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUserRole(@PathVariable Integer id) {
        userRoleService.deleteUserRole(id);
        return ResponseEntity.noContent().build();
    }
}
