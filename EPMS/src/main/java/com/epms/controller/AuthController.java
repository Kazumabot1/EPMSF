package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.auth.AuthResponse;
import com.epms.dto.auth.CurrentUserResponse;
import com.epms.dto.auth.LoginRequest;
import com.epms.entity.RefreshToken;
import com.epms.entity.User;
import com.epms.repository.RefreshTokenRepository;
import com.epms.repository.UserRepository;
import com.epms.security.CustomUserDetailsService;
import com.epms.security.JwtService;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.UUID;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final CustomUserDetailsService customUserDetailsService;
    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;

    @Value("${app.jwt.access-token-expiration-ms:3600000}")
    private long accessTokenExpirationMs;

    @Value("${app.jwt.refresh-token-expiration-ms:604800000}")
    private long refreshTokenExpirationMs;

    @PostMapping("/login")
    @Transactional
    public ResponseEntity<GenericApiResponse<AuthResponse>> login(@Valid @RequestBody LoginRequest request) {
        authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(request.getEmail(), request.getPassword())
        );

        UserPrincipal principal =
                (UserPrincipal) customUserDetailsService.loadUserByUsername(request.getEmail());

        User user = userRepository.findByEmailAndActiveTrue(request.getEmail())
                .orElseThrow(() -> new RuntimeException("User not found"));

        refreshTokenRepository.deleteByUserId(user.getId());

        RefreshToken refreshToken = new RefreshToken();
        refreshToken.setUserId(user.getId());
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(new Date(System.currentTimeMillis() + refreshTokenExpirationMs));
        refreshToken = refreshTokenRepository.save(refreshToken);

        AuthResponse response = AuthResponse.builder()
                .accessToken(jwtService.generateAccessToken(principal))
                .refreshToken(refreshToken.getToken())
                .tokenType("Bearer")
                .expiresIn(accessTokenExpirationMs / 1000)
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .employeeCode(user.getEmployeeCode())
                .position(user.getPosition())
                .roles(principal.getRoles())
                .permissions(principal.getPermissions())
                .dashboard(principal.getDashboard())
                .build();

        return ResponseEntity.ok(GenericApiResponse.success("Login successful", response));
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
                .build();

        return ResponseEntity.ok(GenericApiResponse.success("Current user fetched successfully", response));
    }
}