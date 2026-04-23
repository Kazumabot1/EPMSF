package com.epms.repository;

import com.epms.entity.AppraisalQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface AppraisalQuestionRepository extends JpaRepository<AppraisalQuestion, Long> {
}
