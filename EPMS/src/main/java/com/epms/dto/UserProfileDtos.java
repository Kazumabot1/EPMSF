package com.epms.dto;

import lombok.Data;

public final class UserProfileDtos {

    private UserProfileDtos() {
    }

    @Data
    public static class UserProfileResponse {
        private Integer userId;
        private String fullName;
        private String email;
        private String phoneNumber;
        private String profileImageData;
        private String profileImageType;
        private String role;
        private String dashboard;
        private String position;
        private String employeeCode;
        private Integer employeeId;
        private Integer departmentId;
        private String departmentName;
    }

    @Data
    public static class UpdateUserProfileRequest {
        private String fullName;
        private String email;
        private String phoneNumber;
        private String profileImageData;
        private String profileImageType;
    }

    @Data
    public static class ChangePasswordRequest {
        private String currentPassword;
        private String newPassword;
        private String confirmPassword;
    }
}