package com.epms.service.auth;

import com.epms.dto.auth.AuthResponse;
import com.epms.dto.auth.ChangePasswordRequest;
import com.epms.dto.auth.LoginRequest;
import com.epms.dto.auth.RefreshTokenRequest;
import com.epms.entity.RefreshToken;
import com.epms.entity.User;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.RefreshTokenRepository;
import com.epms.repository.UserRepository;
import com.epms.security.CustomUserDetailsService;
import com.epms.security.JwtService;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Date;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final AuthenticationManager authenticationManager;
    private final JwtService jwtService;
    private final RefreshTokenRepository refreshTokenRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final CustomUserDetailsService customUserDetailsService;
    private final AuthRateLimitService authRateLimitService;

    @Value("${app.jwt.refresh-token-expiration-ms:604800000}")
    private long refreshTokenExpirationMs;

    @Value("${app.jwt.access-token-expiration-ms:3600000}")
    private long accessTokenExpirationMs;

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.getEmail());
        String key = email.isBlank() ? "anonymous" : email.toLowerCase();

        authRateLimitService.check(key);
        try {
            authenticationManager.authenticate(
                    new UsernamePasswordAuthenticationToken(
                            email,
                            request.getPassword()
                    )
            );
            authRateLimitService.success(key);
        } catch (AuthenticationException ex) {
            authRateLimitService.fail(key);
            throw new BadRequestException("Invalid email or password");
        }

        User user = userRepository.findActiveByEmail(email)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        UserPrincipal principal =
                (UserPrincipal) customUserDetailsService.loadUserByUsername(email);

        refreshTokenRepository.deleteByUserId(user.getId());

        RefreshToken refreshToken = createRefreshToken(user.getId());

        return buildAuthResponse(user, principal, refreshToken.getToken());
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken storedToken = refreshTokenRepository.findByToken(request.getRefreshToken())
                .orElseThrow(() -> new BadRequestException("Invalid refresh token"));

        if (storedToken.getExpiryDate() == null || storedToken.getExpiryDate().before(new Date())) {
            refreshTokenRepository.delete(storedToken);
            throw new BadRequestException("Refresh token has expired");
        }

        User user = userRepository.findById(storedToken.getUserId())
                .filter(u -> u.getActive() == null || Boolean.TRUE.equals(u.getActive()))
                .orElseThrow(() -> new ResourceNotFoundException("User not found for refresh token"));

        UserPrincipal principal =
                (UserPrincipal) customUserDetailsService.loadUserByUsername(user.getEmail());

        return buildAuthResponse(user, principal, storedToken.getToken());
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            refreshTokenRepository.deleteByToken(refreshToken);
        }
    }

    @Transactional
    public void changePassword(Integer userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        if (request.getCurrentPassword() == null || request.getCurrentPassword().isBlank()) {
            throw new BadRequestException("Current password is required");
        }

        if (!passwordEncoder.matches(request.getCurrentPassword(), user.getPassword())) {
            throw new BadRequestException("Current password is incorrect");
        }

        if (request.getNewPassword() == null || request.getNewPassword().length() < 8) {
            throw new BadRequestException("New password must be at least 8 characters long");
        }

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password must be different from the current password");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        user.setPasswordChangedAt(new Date());
        user.setAccountStatus("ACTIVE");
        user.setUpdatedAt(new Date());

        userRepository.save(user);

        refreshTokenRepository.deleteByUserId(userId);
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim();
    }

    private RefreshToken createRefreshToken(Integer userId) {
        RefreshToken refreshToken = new RefreshToken();

        refreshToken.setUserId(userId);
        refreshToken.setToken(UUID.randomUUID().toString());
        refreshToken.setExpiryDate(new Date(System.currentTimeMillis() + refreshTokenExpirationMs));

        return refreshTokenRepository.save(refreshToken);
    }

    private AuthResponse buildAuthResponse(User user, UserPrincipal principal, String refreshToken) {
        return AuthResponse.builder()
                .accessToken(jwtService.generateAccessToken(principal))
                .refreshToken(refreshToken)
                .tokenType("Bearer")
                .expiresIn(accessTokenExpirationMs / 1000)
                .id(user.getId())
                .email(user.getEmail())
                .fullName(user.getFullName())
                .employeeCode(user.getEmployeeCode())
                .position(user.getPosition() != null ? user.getPosition().getPositionTitle() : null)
                .roles(principal.getRoles())
                .permissions(principal.getPermissions())
                .dashboard(principal.getDashboard())
                .mustChangePassword(Boolean.TRUE.equals(user.getMustChangePassword()))
                .build();
    }
}
