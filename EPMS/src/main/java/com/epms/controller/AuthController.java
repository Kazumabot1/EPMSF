package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.auth.AuthResponse;
import com.epms.dto.auth.ChangePasswordRequest;
import com.epms.dto.auth.CurrentUserResponse;
import com.epms.dto.auth.LoginRequest;
import com.epms.dto.auth.RefreshTokenRequest;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import com.epms.service.auth.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/login")
    public ResponseEntity<GenericApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Login successful", authService.login(request))
        );
    }

    @PostMapping("/refresh")
    public ResponseEntity<GenericApiResponse<AuthResponse>> refresh(@Valid @RequestBody RefreshTokenRequest request) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Token refreshed successfully", authService.refresh(request))
        );
    }

    @PostMapping("/logout")
    public ResponseEntity<GenericApiResponse<Void>> logout(@Valid @RequestBody RefreshTokenRequest request) {
        authService.logout(request.getRefreshToken());
        return ResponseEntity.ok(GenericApiResponse.success("Logout successful", null));
    }

    @PostMapping("/change-password")
    public ResponseEntity<GenericApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordRequest request) {
        authService.changePassword(SecurityUtils.currentUserId(), request);
        return ResponseEntity.ok(GenericApiResponse.success("Password changed successfully", null));
    }

    @GetMapping("/me")
    public ResponseEntity<GenericApiResponse<CurrentUserResponse>> me() {
        UserPrincipal principal = SecurityUtils.currentUser();

        CurrentUserResponse response = CurrentUserResponse.builder()
                .id(principal.getId())
                .email(principal.getUsername())
                .fullName(principal.getFullName())
                .employeeCode(principal.getEmployeeCode())
                .position(principal.getPosition())
                .roles(principal.getRoles())
                .permissions(principal.getPermissions())
                .dashboard(principal.getDashboard())
                .mustChangePassword(principal.isMustChangePassword())
                .build();

        return ResponseEntity.ok(GenericApiResponse.success("Current user fetched successfully", response));
    }
}