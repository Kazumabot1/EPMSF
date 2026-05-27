package com.epms.service.impl;
// added KHN ( ChatGPT)
import com.epms.dto.NotificationResponseDto;
import com.epms.entity.Notification;
import com.epms.entity.User;
import com.epms.notification.NotificationDeliveryPolicy;
import com.epms.notification.NotificationPolicyRegistry;
import com.epms.repository.NotificationRepository;
import com.epms.repository.UserRepository;
import com.epms.service.NotificationPreferenceService;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;
    private final SimpMessagingTemplate messagingTemplate;
    private final NotificationPolicyRegistry notificationPolicyRegistry;
    private final NotificationPreferenceService notificationPreferenceService;

    @Override
    @Transactional
    public void send(Integer userId, String title, String message, String type) {
        saveAndPush(userId, null, title, message, type, null);
    }

    @Override
    @Transactional
    public void send(Integer userId, String title, String message, String type, Integer referenceId) {
        saveAndPush(userId, null, title, message, type, referenceId);
    }

    @Override
    @Transactional
    public boolean sendOnce(Integer userId, String title, String message, String type) {
        return sendOnce(userId, title, message, type, null);
    }

    @Override
    @Transactional
    public boolean sendOnce(Integer userId, String title, String message, String type, Integer referenceId) {
        if (notificationRepo.existsByUser_IdAndTypeAndTitleAndMessage(userId, type, title, message)) {
            return false;
        }
        return saveAndPush(userId, null, title, message, type, referenceId);
    }

    @Override
    @Transactional
    public boolean sendEvent(Integer userId, String eventKey, String title, String message, String type) {
        return sendEvent(userId, eventKey, title, message, type, null);
    }

    @Override
    @Transactional
    public boolean sendEvent(Integer userId, String eventKey, String title, String message, String type, Integer referenceId) {
        return saveAndPush(userId, eventKey, title, message, type, referenceId);
    }

    @Override
    @Transactional
    public boolean sendEventOnce(Integer userId, String eventKey, String title, String message, String type) {
        return sendEventOnce(userId, eventKey, title, message, type, null);
    }

    @Override
    @Transactional
    public boolean sendEventOnce(Integer userId, String eventKey, String title, String message, String type, Integer referenceId) {
        if (notificationRepo.existsByUser_IdAndTypeAndTitleAndMessage(userId, type, title, message)) {
            return false;
        }
        return saveAndPush(userId, eventKey, title, message, type, referenceId);
    }

    private boolean saveAndPush(Integer userId, String eventKey, String title, String message, String type, Integer referenceId) {
        NotificationDeliveryPolicy policy = notificationPolicyRegistry.resolve(eventKey, type);

        if (!notificationPreferenceService.isInAppEnabled(userId, policy)) {
            return false;
        }

        User user = userRepo.findById(userId).orElseThrow();

        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title);
        n.setMessage(message);
        n.setType(type);
        n.setCategory(policy.getCategory());
        n.setEventKey(policy.getEventKey());
        n.setMandatory(policy.isMandatory());
        n.setReferenceId(referenceId);
        n.setIsRead(false);

        Notification saved = notificationRepo.save(n);

        messagingTemplate.convertAndSendToUser(user.getEmail(), "/queue/notifications", toDto(saved));
        return true;
    }

    private NotificationResponseDto toDto(Notification saved) {
        return new NotificationResponseDto(
                saved.getId(),
                saved.getTitle(),
                saved.getMessage(),
                saved.getType(),
                saved.getIsRead(),
                saved.getCreatedAt(),
                saved.getReferenceId(),
                saved.getCategory(),
                saved.getEventKey(),
                saved.getMandatory()
        );
    }
}
