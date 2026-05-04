package com.epms.repository;

import com.epms.entity.Notification;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface NotificationRepository extends JpaRepository<Notification, Integer> {
    long countByUser_IdAndIsReadFalse(Integer userId);

    Page<Notification> findByUser_Id(Integer userId, Pageable pageable);

    List<Notification> findByUser_IdAndIsReadFalse(Integer userId);
}