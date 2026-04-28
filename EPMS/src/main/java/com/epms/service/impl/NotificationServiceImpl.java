package com.epms.service.impl;
// added KHN ( ChatGPT)
import com.epms.entity.Notification;
import com.epms.entity.User;
import com.epms.repository.NotificationRepository;
import com.epms.repository.UserRepository;
import com.epms.service.NotificationService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements NotificationService {

    private final NotificationRepository notificationRepo;
    private final UserRepository userRepo;

    @Override
    public void send(Integer userId, String title, String message, String type) {
        User user = userRepo.findById(userId).orElseThrow();

        Notification n = new Notification();
        n.setUser(user);
        n.setTitle(title);
        n.setMessage(message);
        n.setType(type);
        n.setIsRead(false);

        notificationRepo.save(n);
    }
}