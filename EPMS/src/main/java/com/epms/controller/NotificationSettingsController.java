package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.notification.NotificationSettingResponseDto;
import com.epms.dto.notification.NotificationSettingsUpdateRequestDto;
import com.epms.security.SecurityUtils;
import com.epms.service.NotificationPreferenceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notification-settings")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationSettingsController {

    private final NotificationPreferenceService notificationPreferenceService;

    @GetMapping("/me")
    public GenericApiResponse<List<NotificationSettingResponseDto>> getMyNotificationSettings() {
        return GenericApiResponse.success(
                "Notification settings fetched",
                notificationPreferenceService.getMySettings(SecurityUtils.currentUserId())
        );
    }

    @PutMapping("/me")
    public GenericApiResponse<List<NotificationSettingResponseDto>> updateMyNotificationSettings(
            @Valid @RequestBody NotificationSettingsUpdateRequestDto request
    ) {
        return GenericApiResponse.success(
                "Notification settings updated",
                notificationPreferenceService.updateMySettings(SecurityUtils.currentUserId(), request)
        );
    }
}
