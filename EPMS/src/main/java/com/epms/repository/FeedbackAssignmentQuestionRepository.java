package com.epms.repository;

import com.epms.entity.FeedbackAssignmentQuestion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackAssignmentQuestionRepository extends JpaRepository<FeedbackAssignmentQuestion, Long> {

    boolean existsByAssignmentId(Long assignmentId);

    long countByAssignmentId(Long assignmentId);

    List<FeedbackAssignmentQuestion> findByAssignmentIdOrderBySectionOrderAscDisplayOrderAscIdAsc(Long assignmentId);

    long countByAssignmentFeedbackRequestCampaignId(Long campaignId);

    void deleteByAssignmentFeedbackRequestCampaignId(Long campaignId);

    @Query("""
        SELECT aq
        FROM FeedbackAssignmentQuestion aq
        LEFT JOIN FETCH aq.sourceQuestion sq
        LEFT JOIN FETCH sq.section s
        LEFT JOIN FETCH aq.questionVersion qv
        LEFT JOIN FETCH qv.questionBank qb
        WHERE aq.assignment.id = :assignmentId
        ORDER BY aq.sectionOrder ASC, aq.displayOrder ASC, aq.id ASC
    """)
    List<FeedbackAssignmentQuestion> findDetailedByAssignmentId(@Param("assignmentId") Long assignmentId);
}
