package com.epms.controller;

import com.epms.dto.NotificationTemplateRequestDto;
import com.epms.dto.NotificationTemplateResponseDto;
import com.epms.service.NotificationTemplateService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/notification-templates")
@RequiredArgsConstructor
public class NotificationTemplateController {

    private final NotificationTemplateService notificationTemplateService;

    @PostMapping
    public ResponseEntity<NotificationTemplateResponseDto> createNotificationTemplate(
            @Valid @RequestBody NotificationTemplateRequestDto requestDto) {
        NotificationTemplateResponseDto responseDto = notificationTemplateService.createNotificationTemplate(requestDto);
        return new ResponseEntity<>(responseDto, HttpStatus.CREATED);
    }

    @GetMapping
    public ResponseEntity<List<NotificationTemplateResponseDto>> getAllNotificationTemplates() {
        return ResponseEntity.ok(notificationTemplateService.getAllNotificationTemplates());
    }

    @GetMapping("/{id}")
    public ResponseEntity<NotificationTemplateResponseDto> getNotificationTemplateById(@PathVariable Integer id) {
        return ResponseEntity.ok(notificationTemplateService.getNotificationTemplateById(id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<NotificationTemplateResponseDto> updateNotificationTemplate(
            @PathVariable Integer id,
            @Valid @RequestBody NotificationTemplateRequestDto requestDto) {
        return ResponseEntity.ok(notificationTemplateService.updateNotificationTemplate(id, requestDto));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteNotificationTemplate(@PathVariable Integer id) {
        notificationTemplateService.deleteNotificationTemplate(id);
        return ResponseEntity.noContent().build();
    }
}
