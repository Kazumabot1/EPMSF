
package com.epms.service.auth;

import com.epms.dto.EmailSendResult;
import com.epms.dto.auth.ForgotPasswordRequest;
import com.epms.dto.auth.ResetForgotPasswordRequest;
import com.epms.dto.auth.VerifyForgotPasswordOtpRequest;
import com.epms.dto.auth.VerifyForgotPasswordOtpResponse;
import com.epms.entity.Employee;
import com.epms.entity.PasswordResetOtp;
import com.epms.entity.User;
import com.epms.exception.BadRequestException;
import com.epms.repository.EmployeeRepository;
import com.epms.repository.PasswordResetOtpRepository;
import com.epms.repository.RefreshTokenRepository;
import com.epms.repository.UserRepository;
import com.epms.service.OnboardingEmailService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.SecureRandom;
import java.util.Date;
import java.util.HexFormat;
import java.util.Optional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ForgotPasswordService {

    private static final String OTP_SENT_MESSAGE = "OTP sent successfully. Please check your email.";
    private static final String ACCOUNT_NOT_FOUND_MESSAGE = "No active account was found for this email address.";
    private static final String INACTIVE_MESSAGE = "This account is inactive for now. Please contact HR or HR Admin to verify.";
    private static final int OTP_EXPIRE_MINUTES = 10;
    private static final int MAX_FAILED_ATTEMPTS = 5;

    private final UserRepository userRepository;
    private final EmployeeRepository employeeRepository;
    private final PasswordResetOtpRepository passwordResetOtpRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final OnboardingEmailService onboardingEmailService;
    private final PasswordEncoder passwordEncoder;
    private final PasswordPolicyService passwordPolicyService;
    private final SecureRandom secureRandom = new SecureRandom();

    @Transactional
    public String requestOtp(ForgotPasswordRequest request) {
        String email = normalizeEmail(request.getEmail());
        Optional<User> userOpt = userRepository.findByEmailIgnoreCase(email);

        if (userOpt.isEmpty()) {
            throw new BadRequestException(ACCOUNT_NOT_FOUND_MESSAGE);
        }

        User user = userOpt.get();
        validateResetAllowed(user);

        passwordResetOtpRepository.consumeOpenOtpsByEmail(email);

        String otp = generateSixDigitOtp();
        PasswordResetOtp row = new PasswordResetOtp();
        row.setUser(user);
        row.setEmail(email);
        row.setOtpHash(hash(otp));
        row.setExpiresAt(new Date(System.currentTimeMillis() + OTP_EXPIRE_MINUTES * 60_000L));
        row.setFailedAttempts(0);
        row.setCreatedAt(new Date());
        passwordResetOtpRepository.save(row);

        EmailSendResult sendResult = onboardingEmailService.sendForgotPasswordOtpEmail(
                user.getEmail(),
                user.getFullName(),
                otp,
                OTP_EXPIRE_MINUTES
        );

        if (!sendResult.isSent()) {
            throw new BadRequestException("OTP could not be sent. " + safe(sendResult.getSafeErrorDetail()));
        }

        return OTP_SENT_MESSAGE;
    }

    @Transactional
    public VerifyForgotPasswordOtpResponse verifyOtp(VerifyForgotPasswordOtpRequest request) {
        String email = normalizeEmail(request.getEmail());
        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new BadRequestException("Invalid or expired OTP."));
        validateResetAllowed(user);

        PasswordResetOtp row = passwordResetOtpRepository
                .findTopByEmailIgnoreCaseAndConsumedAtIsNullOrderByCreatedAtDesc(email)
                .orElseThrow(() -> new BadRequestException("Invalid or expired OTP."));

        if (row.getExpiresAt() == null || row.getExpiresAt().before(new Date())) {
            throw new BadRequestException("OTP has expired. Please request a new OTP.");
        }

        if (row.getFailedAttempts() != null && row.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            throw new BadRequestException("Too many wrong OTP attempts. Please request a new OTP.");
        }

        if (!hash(request.getOtp()).equals(row.getOtpHash())) {
            row.setFailedAttempts((row.getFailedAttempts() == null ? 0 : row.getFailedAttempts()) + 1);
            passwordResetOtpRepository.save(row);
            throw new BadRequestException("Invalid OTP.");
        }

        String resetToken = UUID.randomUUID().toString() + UUID.randomUUID();
        row.setVerifiedAt(new Date());
        row.setResetTokenHash(hash(resetToken));
        row.setExpiresAt(new Date(System.currentTimeMillis() + OTP_EXPIRE_MINUTES * 60_000L));
        passwordResetOtpRepository.save(row);

        return new VerifyForgotPasswordOtpResponse(resetToken);
    }

    @Transactional
    public void resetPassword(ResetForgotPasswordRequest request) {
        if (!request.getNewPassword().equals(request.getConfirmPassword())) {
            throw new BadRequestException("New password and confirm password do not match.");
        }

        passwordPolicyService.validateOrThrow(request.getNewPassword(), "New password");

        PasswordResetOtp row = passwordResetOtpRepository.findByResetTokenHashAndConsumedAtIsNull(hash(request.getResetToken()))
                .orElseThrow(() -> new BadRequestException("Invalid or expired reset token."));

        if (row.getVerifiedAt() == null) {
            throw new BadRequestException("Please verify OTP before resetting your password.");
        }

        if (row.getExpiresAt() == null || row.getExpiresAt().before(new Date())) {
            throw new BadRequestException("Reset token has expired. Please request a new OTP.");
        }

        User user = row.getUser();
        validateResetAllowed(user);

        if (passwordEncoder.matches(request.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("New password must be different from the current password.");
        }

        user.setPassword(passwordEncoder.encode(request.getNewPassword()));
        user.setMustChangePassword(false);
        user.setPasswordChangedAt(new Date());
        user.setAccountStatus("ACTIVE");
        user.setUpdatedAt(new Date());
        userRepository.save(user);

        row.setConsumedAt(new Date());
        passwordResetOtpRepository.save(row);
        refreshTokenRepository.deleteByUserId(user.getId());
    }

    private void validateResetAllowed(User user) {
        if (user == null) {
            throw new BadRequestException("Invalid account.");
        }

        if (user.getEmployeeId() != null) {
            Employee employee = employeeRepository.findById(user.getEmployeeId()).orElse(null);
            if (employee != null && Boolean.FALSE.equals(employee.getActive())) {
                throw new BadRequestException(INACTIVE_MESSAGE);
            }
        }

        if (Boolean.FALSE.equals(user.getActive())) {
            throw new BadRequestException(INACTIVE_MESSAGE);
        }
    }

    private String normalizeEmail(String email) {
        return email == null ? "" : email.trim().toLowerCase();
    }

    private String generateSixDigitOtp() {
        return String.format("%06d", secureRandom.nextInt(1_000_000));
    }

    private String hash(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hashed = digest.digest(value.getBytes(StandardCharsets.UTF_8));
            return HexFormat.of().formatHex(hashed);
        } catch (Exception ex) {
            throw new IllegalStateException("Unable to hash reset value", ex);
        }
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "Please check SMTP settings." : value;
    }
}
