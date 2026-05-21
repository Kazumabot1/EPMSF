
package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.entity.UserProfile;
import com.epms.repository.UserProfileRepository;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/profile-images")
@RequiredArgsConstructor
public class ProfileImageController {

    private final UserProfileRepository userProfileRepository;

    @GetMapping("/users/{userId}")
    public ResponseEntity<GenericApiResponse<ProfileImageResponse>> getProfileImage(
            @PathVariable Integer userId
    ) {
        ProfileImageResponse response = userProfileRepository.findByUserId(userId)
                .map(this::toResponse)
                .orElse(new ProfileImageResponse(null, null));

        return ResponseEntity.ok(GenericApiResponse.success("Profile image fetched", response));
    }

    @GetMapping("/users")
    public ResponseEntity<GenericApiResponse<Map<Integer, ProfileImageResponse>>> getProfileImages(
            @RequestParam(required = false) List<Integer> userIds
    ) {
        Map<Integer, ProfileImageResponse> result = new LinkedHashMap<>();

        if (userIds == null || userIds.isEmpty()) {
            return ResponseEntity.ok(GenericApiResponse.success("Profile images fetched", result));
        }

        List<Integer> cleanIds = userIds.stream()
                .filter(id -> id != null && id > 0)
                .distinct()
                .toList();

        for (Integer userId : cleanIds) {
            userProfileRepository.findByUserId(userId)
                    .map(this::toResponse)
                    .ifPresent(profile -> result.put(userId, profile));
        }

        return ResponseEntity.ok(GenericApiResponse.success("Profile images fetched", result));
    }

    private ProfileImageResponse toResponse(UserProfile profile) {
        return new ProfileImageResponse(
                profile.getProfileImageData(),
                profile.getProfileImageType()
        );
    }

    @Data
    @AllArgsConstructor
    public static class ProfileImageResponse {
        private String profileImageData;
        private String profileImageType;
    }
}
