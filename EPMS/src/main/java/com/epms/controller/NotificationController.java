package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.NotificationResponseDto;
import com.epms.entity.Notification;
import com.epms.repository.NotificationRepository;
import com.epms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;

    @GetMapping
    public GenericApiResponse<List<NotificationResponseDto>> getMyNotifications() {
        Integer userId = SecurityUtils.currentUserId();

        List<NotificationResponseDto> notifications = notificationRepository
                .findByUser_Id(userId, PageRequest.of(0, 50, Sort.by(Sort.Direction.DESC, "createdAt")))
                .getContent()
                .stream()
                .map(this::toDto)
                .toList();

        return GenericApiResponse.success("Notifications fetched", notifications);
    }

    @GetMapping("/unread-count")
    public GenericApiResponse<Long> getUnreadCount() {
        Integer userId = SecurityUtils.currentUserId();
        return GenericApiResponse.success(
                "Unread notifications count",
                notificationRepository.countByUser_IdAndIsReadFalse(userId)
        );
    }

    @PutMapping("/{id}/read")
    public GenericApiResponse<NotificationResponseDto> markAsRead(@PathVariable Integer id) {
        Integer userId = SecurityUtils.currentUserId();

        Notification notification = notificationRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Notification not found"));

        if (!notification.getUser().getId().equals(userId)) {
            throw new RuntimeException("You cannot access this notification.");
        }

        notification.setIsRead(true);

        return GenericApiResponse.success(
                "Notification marked as read",
                toDto(notificationRepository.save(notification))
        );
    }

    private NotificationResponseDto toDto(Notification n) {
        return new NotificationResponseDto(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getType(),
                n.getIsRead(),
                n.getCreatedAt()
        );
    }
}