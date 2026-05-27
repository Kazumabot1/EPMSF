package com.epms.repository;

import com.epms.entity.UserNotificationPreference;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface UserNotificationPreferenceRepository extends JpaRepository<UserNotificationPreference, Integer> {

    List<UserNotificationPreference> findByUser_Id(Integer userId);

    Optional<UserNotificationPreference> findByUser_IdAndCategoryAndEventKey(
            Integer userId,
            String category,
            String eventKey
    );
}
