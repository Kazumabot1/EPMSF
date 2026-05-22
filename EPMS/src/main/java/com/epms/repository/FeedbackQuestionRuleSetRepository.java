package com.epms.repository;

import com.epms.entity.FeedbackQuestionRuleSet;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface FeedbackQuestionRuleSetRepository extends JpaRepository<FeedbackQuestionRuleSet, Long> {
}
