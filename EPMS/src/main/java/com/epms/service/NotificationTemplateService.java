package com.epms.service;

import com.epms.dto.NotificationTemplateRequestDto;
import com.epms.dto.NotificationTemplateResponseDto;

import java.util.List;

public interface NotificationTemplateService {

    NotificationTemplateResponseDto createNotificationTemplate(NotificationTemplateRequestDto requestDto);

    List<NotificationTemplateResponseDto> getAllNotificationTemplates();

    NotificationTemplateResponseDto getNotificationTemplateById(Integer id);

    NotificationTemplateResponseDto updateNotificationTemplate(Integer id, NotificationTemplateRequestDto requestDto);

    void deleteNotificationTemplate(Integer id);
}
