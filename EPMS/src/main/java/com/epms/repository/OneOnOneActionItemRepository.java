package com.epms.repository;

import com.epms.entity.OneOnOneActionItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface OneOnOneActionItemRepository extends JpaRepository<OneOnOneActionItem, Integer> {

    // Find the action item belonging to a specific meeting (OneToOne, so at most one result)
    Optional<OneOnOneActionItem> findByMeetingId(Integer meetingId);
}
