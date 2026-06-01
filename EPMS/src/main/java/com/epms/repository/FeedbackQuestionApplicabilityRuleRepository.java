package com.epms.repository;

import com.epms.entity.FeedbackQuestionApplicabilityRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface FeedbackQuestionApplicabilityRuleRepository extends JpaRepository<FeedbackQuestionApplicabilityRule, Long> {

    @Query("""
        SELECT r
        FROM FeedbackQuestionApplicabilityRule r
        JOIN FETCH r.questionBank qb
        LEFT JOIN FETCH r.ruleSet rs
        WHERE r.active = true
          AND (rs IS NULL OR rs.active = true)
          AND qb.status = 'ACTIVE'
          AND :levelRank BETWEEN r.targetLevelMinRank AND r.targetLevelMaxRank
          AND r.evaluatorRelationshipType = :relationshipType
          AND (r.targetPositionId IS NULL OR r.targetPositionId = :targetPositionId)
          AND (r.targetDepartmentId IS NULL OR r.targetDepartmentId = :targetDepartmentId)
          AND :today IS NOT NULL
        ORDER BY CASE WHEN r.targetPositionId IS NULL THEN 1 ELSE 0 END ASC,
                 CASE WHEN r.targetDepartmentId IS NULL THEN 1 ELSE 0 END ASC,
                 r.displayOrder ASC,
                 r.rulePriority ASC,
                 r.id ASC
    """)
    List<FeedbackQuestionApplicabilityRule> findApplicableRules(
            @Param("levelRank") Integer levelRank,
            @Param("targetPositionId") Long targetPositionId,
            @Param("targetDepartmentId") Long targetDepartmentId,
            @Param("relationshipType") String relationshipType,
            @Param("today") LocalDate today
    );

    @Query("""
        SELECT DISTINCT r
        FROM FeedbackQuestionApplicabilityRule r
        LEFT JOIN FETCH r.ruleSet rs
        LEFT JOIN FETCH r.questionBank qb
        LEFT JOIN FETCH r.legacyQuestionVersion qv
        LEFT JOIN FETCH qv.questionBank legacyQb
        ORDER BY CASE WHEN (rs.active = true OR (rs IS NULL AND r.active = true)) THEN 0 ELSE 1 END ASC,
                 CASE WHEN rs.id IS NULL THEN r.id ELSE rs.id END DESC,
                 r.targetLevelMinRank ASC,
                 r.targetLevelMaxRank ASC,
                 r.evaluatorRelationshipType ASC,
                 r.displayOrder ASC,
                 r.id DESC
    """)
    List<FeedbackQuestionApplicabilityRule> findAllDetailed();

    @Query("""
        SELECT DISTINCT r
        FROM FeedbackQuestionApplicabilityRule r
        LEFT JOIN FETCH r.ruleSet rs
        LEFT JOIN FETCH r.questionBank qb
        LEFT JOIN FETCH r.legacyQuestionVersion qv
        LEFT JOIN FETCH qv.questionBank legacyQb
        WHERE rs.id = :ruleSetId
        ORDER BY r.displayOrder ASC, r.evaluatorRelationshipType ASC, r.id ASC
    """)
    List<FeedbackQuestionApplicabilityRule> findDetailedByRuleSetId(@Param("ruleSetId") Long ruleSetId);

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
        UPDATE feedback_question_applicability_rules r
        JOIN feedback_question_versions qv ON qv.id = r.question_version_id
        LEFT JOIN feedback_question_bank existing_qb ON existing_qb.id = r.question_bank_id
        SET r.question_bank_id = qv.question_bank_id
        WHERE r.question_version_id IS NOT NULL
          AND (r.question_bank_id IS NULL OR r.question_bank_id = 0 OR existing_qb.id IS NULL)
    """, nativeQuery = true)
    int repairQuestionBankReferencesFromLegacyVersions();

    @Modifying(clearAutomatically = true, flushAutomatically = true)
    @Query(value = """
        UPDATE feedback_question_applicability_rules r
        LEFT JOIN feedback_question_bank qb ON qb.id = r.question_bank_id
        SET r.active = FALSE,
            r.question_bank_id = NULL
        WHERE r.question_bank_id IS NOT NULL
          AND qb.id IS NULL
    """, nativeQuery = true)
    int deactivateRulesWithBrokenQuestionBankReferences();

    /**
     * HR-facing Form Setup uses a simple best-match model:
     * Position form -> Department form -> Default form. Department + position specific
     * legacy rows are ignored so hidden compatibility data cannot unexpectedly affect
     * campaign previews.
     */
    default List<FeedbackQuestionApplicabilityRule> findBestMatchingFormRules(
            Integer levelRank,
            Long targetPositionId,
            Long targetDepartmentId,
            String relationshipType,
            LocalDate today
    ) {
        List<FeedbackQuestionApplicabilityRule> candidates = findApplicableRules(
                levelRank,
                targetPositionId,
                targetDepartmentId,
                relationshipType,
                today
        );
        if (candidates == null || candidates.isEmpty()) {
            return List.of();
        }

        int bestScope = candidates.stream()
                .mapToInt(rule -> formScopeScore(rule, targetPositionId, targetDepartmentId))
                .filter(score -> score > 0)
                .max()
                .orElse(0);

        if (bestScope <= 0) {
            return List.of();
        }

        return candidates.stream()
                .filter(rule -> formScopeScore(rule, targetPositionId, targetDepartmentId) == bestScope)
                .toList();
    }

    private static int formScopeScore(FeedbackQuestionApplicabilityRule rule, Long targetPositionId, Long targetDepartmentId) {
        if (rule == null) {
            return 0;
        }
        if (rule.getTargetPositionId() != null && rule.getTargetDepartmentId() != null) {
            return 0;
        }
        if (targetPositionId != null && targetPositionId.equals(rule.getTargetPositionId())) {
            return 3;
        }
        if (targetDepartmentId != null
                && rule.getTargetPositionId() == null
                && targetDepartmentId.equals(rule.getTargetDepartmentId())) {
            return 2;
        }
        if (rule.getTargetPositionId() == null && rule.getTargetDepartmentId() == null) {
            return 1;
        }
        return 0;
    }

    @Query("""
        SELECT COUNT(r)
        FROM FeedbackQuestionApplicabilityRule r
        LEFT JOIN r.ruleSet rs
        WHERE r.active = true
          AND (rs IS NULL OR rs.active = true)
          AND r.questionBank.id = :questionBankId
          AND r.targetLevelMinRank <= :targetLevelMaxRank
          AND :targetLevelMinRank <= r.targetLevelMaxRank
          AND r.evaluatorRelationshipType = :relationshipType
          AND ((:targetPositionId IS NULL AND r.targetPositionId IS NULL) OR r.targetPositionId = :targetPositionId)
          AND ((:targetDepartmentId IS NULL AND r.targetDepartmentId IS NULL) OR r.targetDepartmentId = :targetDepartmentId)
          AND (:excludeRuleId IS NULL OR r.id <> :excludeRuleId)
          AND (:excludeRuleSetId IS NULL OR rs IS NULL OR rs.id <> :excludeRuleSetId)
    """)
    long countDuplicateRulesOutsideRuleSet(
            @Param("questionBankId") Long questionBankId,
            @Param("targetLevelMinRank") Integer targetLevelMinRank,
            @Param("targetLevelMaxRank") Integer targetLevelMaxRank,
            @Param("relationshipType") String relationshipType,
            @Param("targetPositionId") Long targetPositionId,
            @Param("targetDepartmentId") Long targetDepartmentId,
            @Param("excludeRuleId") Long excludeRuleId,
            @Param("excludeRuleSetId") Long excludeRuleSetId
    );
}
