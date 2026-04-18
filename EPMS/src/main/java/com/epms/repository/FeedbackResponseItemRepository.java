package com.epms.repository;

import com.epms.entity.FeedbackResponseItem;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackResponseItemRepository extends JpaRepository<FeedbackResponseItem, Long> {

    List<FeedbackResponseItem> findByResponseId(Long responseId);
}
