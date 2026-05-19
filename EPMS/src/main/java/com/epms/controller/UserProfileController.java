package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.UserProfileDtos.ChangePasswordRequest;
import com.epms.dto.UserProfileDtos.UpdateUserProfileRequest;
import com.epms.dto.UserProfileDtos.UserProfileResponse;
import com.epms.service.UserProfileService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/profile")
@RequiredArgsConstructor
public class UserProfileController {

    private final UserProfileService userProfileService;

    @GetMapping("/me")
    public ResponseEntity<GenericApiResponse<UserProfileResponse>> getMyProfile() {
        return ResponseEntity.ok(
                GenericApiResponse.success("Profile fetched", userProfileService.getMyProfile())
        );
    }

    @PutMapping("/me")
    public ResponseEntity<GenericApiResponse<UserProfileResponse>> updateMyProfile(
            @RequestBody UpdateUserProfileRequest request
    ) {
        return ResponseEntity.ok(
                GenericApiResponse.success("Profile updated", userProfileService.updateMyProfile(request))
        );
    }

    @PutMapping("/me/password")
    public ResponseEntity<GenericApiResponse<String>> changeMyPassword(
            @RequestBody ChangePasswordRequest request
    ) {
        userProfileService.changeMyPassword(request);

        return ResponseEntity.ok(
                GenericApiResponse.success("Password changed", "OK")
        );
    }
}