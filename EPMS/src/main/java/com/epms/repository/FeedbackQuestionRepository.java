package com.epms.repository;

import com.epms.entity.FeedbackQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackQuestionRepository extends JpaRepository<FeedbackQuestion, Long> {

    List<FeedbackQuestion> findBySectionIdOrderByQuestionOrderAsc(Long sectionId);
}
