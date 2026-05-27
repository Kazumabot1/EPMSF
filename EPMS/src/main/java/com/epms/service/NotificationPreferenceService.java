package com.epms.service;

import com.epms.dto.notification.NotificationSettingResponseDto;
import com.epms.dto.notification.NotificationSettingsUpdateRequestDto;
import com.epms.notification.NotificationDeliveryPolicy;

import java.util.List;

public interface NotificationPreferenceService {

    List<NotificationSettingResponseDto> getMySettings(Integer userId);

    List<NotificationSettingResponseDto> updateMySettings(Integer userId, NotificationSettingsUpdateRequestDto request);

    boolean isInAppEnabled(Integer userId, NotificationDeliveryPolicy policy);
}
