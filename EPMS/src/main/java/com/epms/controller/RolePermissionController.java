package com.epms.controller;

import com.epms.dto.RolePermissionRequestDto;
import com.epms.dto.RolePermissionResponseDto;
import com.epms.service.RolePermissionService;
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
@RequestMapping("/api/role-permissions")
@RequiredArgsConstructor
public class RolePermissionController {

    private final RolePermissionService rolePermissionService;

    @PostMapping
    public ResponseEntity<RolePermissionResponseDto> createRolePermission(
            @Valid @RequestBody RolePermissionRequestDto requestDto) {
        RolePermissionResponseDto responseDto = rolePermissionService.createRolePermission(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<RolePermissionResponseDto>> getAllRolePermissions() {
        return ResponseEntity.ok(rolePermissionService.getAllRolePermissions());
    }

    @GetMapping("/{id}")
    public ResponseEntity<RolePermissionResponseDto> getRolePermissionById(@PathVariable Integer id) {
        return ResponseEntity.ok(rolePermissionService.getRolePermissionById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<RolePermissionResponseDto> updateRolePermission(
            @PathVariable Integer id,
            @Valid @RequestBody RolePermissionRequestDto requestDto) {
        return ResponseEntity.ok(rolePermissionService.updateRolePermission(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteRolePermission(@PathVariable Integer id) {
        rolePermissionService.deleteRolePermission(id);
        return ResponseEntity.noContent().build();
    }
}
