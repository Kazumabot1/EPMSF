package com.epms.service;

import com.epms.dto.UserProfileDtos.ChangePasswordRequest;
import com.epms.dto.UserProfileDtos.UpdateUserProfileRequest;
import com.epms.dto.UserProfileDtos.UserProfileResponse;
import com.epms.entity.Department;
import com.epms.entity.User;
import com.epms.entity.UserProfile;
import com.epms.exception.BadRequestException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.DepartmentRepository;
import com.epms.repository.UserProfileRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import com.epms.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.Objects;

@Service
@RequiredArgsConstructor
public class UserProfileService {

    private static final int MAX_IMAGE_LENGTH = 7_100_000;
    private static final int MIN_PASSWORD_LENGTH = 8;
    private static final int MAX_PASSWORD_LENGTH = 128;

    private final UserRepository userRepository;
    private final UserProfileRepository userProfileRepository;
    private final DepartmentRepository departmentRepository;
    private final PasswordEncoder passwordEncoder;

    @Transactional(readOnly = true)
    public UserProfileResponse getMyProfile() {
        User user = currentUser();
        UserProfile profile = userProfileRepository.findByUserId(user.getId()).orElse(null);

        return toResponse(user, profile);
    }

    @Transactional
    public UserProfileResponse updateMyProfile(UpdateUserProfileRequest request) {
        if (request == null) {
            throw new BadRequestException("Profile request is required.");
        }

        User user = currentUser();

        UserProfile profile = userProfileRepository
                .findByUserId(user.getId())
                .orElseGet(() -> createProfile(user.getId()));

        String fullName = clean(request.getFullName());
        String email = clean(request.getEmail());
        String phoneNumber = clean(request.getPhoneNumber());
        String imageData = clean(request.getProfileImageData());
        String imageType = clean(request.getProfileImageType());

        if (fullName != null) {
            user.setFullName(fullName);
        }

        if (email != null) {
            validateEmail(email);

            String normalizedEmail = email.toLowerCase(Locale.ROOT);

            userRepository.findByEmail(normalizedEmail).ifPresent(existing -> {
                if (!Objects.equals(existing.getId(), user.getId())) {
                    throw new BadRequestException("This email is already used by another account.");
                }
            });

            user.setEmail(normalizedEmail);
        }

        profile.setPhoneNumber(phoneNumber);

        if (imageData != null) {
            validateImage(imageData, imageType);
            profile.setProfileImageData(imageData);
            profile.setProfileImageType(imageType);
        }

        if (imageData == null
                && request.getProfileImageData() != null
                && request.getProfileImageData().isBlank()) {
            profile.setProfileImageData(null);
            profile.setProfileImageType(null);
        }

        userRepository.save(user);
        UserProfile savedProfile = userProfileRepository.save(profile);

        return toResponse(user, savedProfile);
    }

    @Transactional
    public void changeMyPassword(ChangePasswordRequest request) {
        if (request == null) {
            throw new BadRequestException("Password request is required.");
        }

        String currentPassword = request.getCurrentPassword();
        String newPassword = request.getNewPassword();
        String confirmPassword = request.getConfirmPassword();

        validatePasswordRequest(currentPassword, newPassword, confirmPassword);

        User user = currentUser();

        if (user.getPassword() == null || user.getPassword().isBlank()) {
            throw new BadRequestException("Your account password is not set. Please contact HR/Admin.");
        }

        if (!passwordEncoder.matches(currentPassword, user.getPassword())) {
            throw new BadRequestException("Current password is incorrect.");
        }

        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new BadRequestException("New password must be different from your current password.");
        }

        if (containsUserIdentity(newPassword, user)) {
            throw new BadRequestException("Password must not contain your name or email.");
        }

        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    private void validatePasswordRequest(
            String currentPassword,
            String newPassword,
            String confirmPassword
    ) {
        if (isBlank(currentPassword)) {
            throw new BadRequestException("Current password is required.");
        }

        if (isBlank(newPassword)) {
            throw new BadRequestException("New password is required.");
        }

        if (isBlank(confirmPassword)) {
            throw new BadRequestException("Confirm password is required.");
        }

        if (!newPassword.equals(confirmPassword)) {
            throw new BadRequestException("New password and confirm password do not match.");
        }

        if (!newPassword.equals(newPassword.trim())) {
            throw new BadRequestException("Password must not start or end with spaces.");
        }

        if (newPassword.length() < MIN_PASSWORD_LENGTH) {
            throw new BadRequestException("New password must be at least 8 characters.");
        }

        if (newPassword.length() > MAX_PASSWORD_LENGTH) {
            throw new BadRequestException("New password must be 128 characters or less.");
        }

        if (!newPassword.matches(".*[A-Z].*")) {
            throw new BadRequestException("New password must contain at least one uppercase letter.");
        }

        if (!newPassword.matches(".*[a-z].*")) {
            throw new BadRequestException("New password must contain at least one lowercase letter.");
        }

        if (!newPassword.matches(".*\\d.*")) {
            throw new BadRequestException("New password must contain at least one number.");
        }

        if (!newPassword.matches(".*[^A-Za-z0-9].*")) {
            throw new BadRequestException("New password must contain at least one special character.");
        }
    }

    private boolean containsUserIdentity(String password, User user) {
        if (password == null || user == null) {
            return false;
        }

        String lowerPassword = password.toLowerCase(Locale.ROOT);

        String email = clean(user.getEmail());
        if (email != null) {
            String lowerEmail = email.toLowerCase(Locale.ROOT);
            String emailName = lowerEmail.contains("@")
                    ? lowerEmail.substring(0, lowerEmail.indexOf("@"))
                    : lowerEmail;

            if (emailName.length() >= 3 && lowerPassword.contains(emailName)) {
                return true;
            }
        }

        String fullName = clean(user.getFullName());
        if (fullName != null) {
            String[] parts = fullName.toLowerCase(Locale.ROOT).split("\\s+");

            for (String part : parts) {
                if (part.length() >= 3 && lowerPassword.contains(part)) {
                    return true;
                }
            }
        }

        return false;
    }

    private UserProfile createProfile(Integer userId) {
        UserProfile profile = new UserProfile();
        profile.setUserId(userId);
        return profile;
    }

    private User currentUser() {
        Integer userId = SecurityUtils.currentUserId();

        return userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("Current user not found."));
    }

    private UserProfileResponse toResponse(User user, UserProfile profile) {
        UserPrincipal principal = SecurityUtils.currentUser();

        UserProfileResponse response = new UserProfileResponse();

        response.setUserId(user.getId());
        response.setFullName(user.getFullName());
        response.setEmail(user.getEmail());
        response.setPhoneNumber(profile == null ? null : profile.getPhoneNumber());
        response.setProfileImageData(profile == null ? null : profile.getProfileImageData());
        response.setProfileImageType(profile == null ? null : profile.getProfileImageType());

        response.setDashboard(principal == null ? null : principal.getDashboard());

        if (principal != null && principal.getRoles() != null && !principal.getRoles().isEmpty()) {
            response.setRole(principal.getRoles().get(0));
        }

        if (user.getPosition() != null) {
            response.setPosition(user.getPosition().getPositionTitle());
        } else if (principal != null) {
            response.setPosition(principal.getPosition());
        }

        response.setEmployeeCode(user.getEmployeeCode());
        response.setEmployeeId(user.getEmployeeId());
        response.setDepartmentId(user.getDepartmentId());

        if (user.getDepartmentId() != null) {
            response.setDepartmentName(
                    departmentRepository.findById(user.getDepartmentId())
                            .map(Department::getDepartmentName)
                            .orElse(null)
            );
        }

        return response;
    }

    private void validateEmail(String email) {
        if (!email.contains("@") || !email.contains(".")) {
            throw new BadRequestException("Please enter a valid email address.");
        }
    }

    private void validateImage(String imageData, String imageType) {
        if (imageData.length() > MAX_IMAGE_LENGTH) {
            throw new BadRequestException("Profile image is too large. Please upload an image below 5MB.");
        }

        if (imageType == null || imageType.isBlank()) {
            throw new BadRequestException("Profile image type is required.");
        }

        String type = imageType.toLowerCase(Locale.ROOT);

        if (!type.equals("image/png")
                && !type.equals("image/jpeg")
                && !type.equals("image/jpg")
                && !type.equals("image/webp")) {
            throw new BadRequestException("Only PNG, JPG, JPEG, or WEBP profile images are allowed.");
        }
    }

    private boolean isBlank(String value) {
        return value == null || value.trim().isEmpty();
    }

    private String clean(String value) {
        if (value == null) {
            return null;
        }

        String trimmed = value.trim();

        return trimmed.isEmpty() ? null : trimmed;
    }
}