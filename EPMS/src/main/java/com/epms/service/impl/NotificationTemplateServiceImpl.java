package com.epms.service.impl;

import com.epms.dto.NotificationTemplateRequestDto;
import com.epms.dto.NotificationTemplateResponseDto;
import com.epms.entity.NotificationTemplate;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.NotificationTemplateRepository;
import com.epms.service.NotificationTemplateService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class NotificationTemplateServiceImpl implements NotificationTemplateService {

    private final NotificationTemplateRepository notificationTemplateRepository;

    @Override
    public NotificationTemplateResponseDto createNotificationTemplate(NotificationTemplateRequestDto requestDto) {
        NotificationTemplate notificationTemplate = new NotificationTemplate();
        notificationTemplate.setChannelType(requestDto.getChannelType());
        notificationTemplate.setSubjectTemplate(requestDto.getSubjectTemplate().trim());
        notificationTemplate.setBodyTemplate(requestDto.getBodyTemplate().trim());

        NotificationTemplate savedNotificationTemplate = notificationTemplateRepository.save(notificationTemplate);
        return mapToResponseDto(savedNotificationTemplate);
    }

    @Override
    public List<NotificationTemplateResponseDto> getAllNotificationTemplates() {
        return notificationTemplateRepository.findAll()
                .stream()
                .map(this::mapToResponseDto)
                .toList();
    }

    @Override
    public NotificationTemplateResponseDto getNotificationTemplateById(Integer id) {
        NotificationTemplate notificationTemplate = getNotificationTemplateEntityById(id);
        return mapToResponseDto(notificationTemplate);
    }

    @Override
    public NotificationTemplateResponseDto updateNotificationTemplate(Integer id, NotificationTemplateRequestDto requestDto) {
        NotificationTemplate existingNotificationTemplate = getNotificationTemplateEntityById(id);
        existingNotificationTemplate.setChannelType(requestDto.getChannelType());
        existingNotificationTemplate.setSubjectTemplate(requestDto.getSubjectTemplate().trim());
        existingNotificationTemplate.setBodyTemplate(requestDto.getBodyTemplate().trim());

        NotificationTemplate updatedNotificationTemplate = notificationTemplateRepository.save(existingNotificationTemplate);
        return mapToResponseDto(updatedNotificationTemplate);
    }

    @Override
    public void deleteNotificationTemplate(Integer id) {
        NotificationTemplate existingNotificationTemplate = getNotificationTemplateEntityById(id);
        notificationTemplateRepository.delete(existingNotificationTemplate);
    }

    private NotificationTemplate getNotificationTemplateEntityById(Integer id) {
        return notificationTemplateRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("NotificationTemplate not found with id: " + id));
    }

    private NotificationTemplateResponseDto mapToResponseDto(NotificationTemplate notificationTemplate) {
        return new NotificationTemplateResponseDto(
                notificationTemplate.getId(),
                notificationTemplate.getChannelType(),
                notificationTemplate.getSubjectTemplate(),
                notificationTemplate.getBodyTemplate()
        );
    }
}
