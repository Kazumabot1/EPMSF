package com.epms.repository;

import com.epms.entity.FeedbackCompetency;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackCompetencyRepository extends JpaRepository<FeedbackCompetency, Long> {

    Optional<FeedbackCompetency> findByCodeIgnoreCase(String code);

    boolean existsByCodeIgnoreCase(String code);

    @Query("""
        SELECT c
        FROM FeedbackCompetency c
        ORDER BY c.displayOrder ASC, c.name ASC
    """)
    List<FeedbackCompetency> findAllOrdered();

    @Query("""
        SELECT DISTINCT qb.competencyCode
        FROM FeedbackQuestionBank qb
        WHERE qb.competencyCode IS NOT NULL
          AND qb.competencyCode <> ''
    """)
    List<String> findDistinctQuestionCompetencyCodes();

    @Query("""
        SELECT COUNT(qb)
        FROM FeedbackQuestionBank qb
        WHERE qb.competencyCode = :competencyCode
    """)
    long countQuestionsByCompetencyCode(@Param("competencyCode") String competencyCode);

    @Query("""
        SELECT COUNT(qb)
        FROM FeedbackQuestionBank qb
        WHERE qb.competencyCode = :competencyCode
          AND qb.status = 'ACTIVE'
    """)
    long countActiveQuestionsByCompetencyCode(@Param("competencyCode") String competencyCode);

    @Query("""
        SELECT COALESCE(MAX(c.displayOrder), 0) + 10
        FROM FeedbackCompetency c
    """)
    Integer nextDisplayOrder();
}
