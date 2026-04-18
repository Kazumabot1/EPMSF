package com.epms.repository;

import com.epms.entity.FeedbackSection;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackSectionRepository extends JpaRepository<FeedbackSection, Long> {

    List<FeedbackSection> findByFormIdOrderByOrderNoAsc(Long formId);
}
