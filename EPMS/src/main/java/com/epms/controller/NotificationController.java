package com.epms.controller;

import com.epms.dto.GenericApiResponse;
import com.epms.dto.NotificationResponseDto;
import com.epms.entity.Notification;
import com.epms.entity.User;
import com.epms.repository.NotificationRepository;
import com.epms.repository.UserRepository;
import com.epms.security.SecurityUtils;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/notifications")
@RequiredArgsConstructor
@CrossOrigin(origins = "*")
public class NotificationController {

    private final NotificationRepository notificationRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

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

    @PutMapping("/read-all")
    @Transactional
    public GenericApiResponse<Integer> markAllAsRead() {
        Integer userId = SecurityUtils.currentUserId();

        List<Notification> unread = notificationRepository.findByUser_IdAndIsReadFalse(userId);
        for (Notification n : unread) {
            n.setIsRead(true);
        }
        notificationRepository.saveAll(unread);
        publishReadStateChanged(userId, unread.stream().map(Notification::getId).toList(), true);

        return GenericApiResponse.success(
                "All notifications marked as read",
                unread.size()
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
        Notification saved = notificationRepository.save(notification);
        publishReadStateChanged(userId, List.of(saved.getId()), false);

        return GenericApiResponse.success(
                "Notification marked as read",
                toDto(saved)
        );
    }

    private void publishReadStateChanged(Integer userId, List<Integer> notificationIds, boolean allRead) {
        User user = userRepository.findById(userId).orElse(null);

        if (user == null || user.getEmail() == null || user.getEmail().isBlank()) {
            return;
        }

        messagingTemplate.convertAndSendToUser(
                user.getEmail(),
                "/queue/events",
                Map.of(
                        "eventType", "NOTIFICATIONS_READ_STATE_CHANGED",
                        "unreadCount", notificationRepository.countByUser_IdAndIsReadFalse(userId),
                        "notificationIds", notificationIds,
                        "allRead", allRead
                )
        );
    }

    private NotificationResponseDto toDto(Notification n) {
        return new NotificationResponseDto(
                n.getId(),
                n.getTitle(),
                n.getMessage(),
                n.getType(),
                n.getIsRead(),
                n.getCreatedAt(),
                n.getReferenceId(),
                n.getCategory(),
                n.getEventKey(),
                n.getMandatory()
        );
    }
}
