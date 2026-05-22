package com.epms.repository;

import com.epms.entity.FeedbackCampaignQuestionSelection;
import com.epms.entity.enums.FeedbackRelationshipType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackCampaignQuestionSelectionRepository extends JpaRepository<FeedbackCampaignQuestionSelection, Long> {

    List<FeedbackCampaignQuestionSelection> findByCampaignIdOrderByRelationshipTypeAscTargetLevelRankAscSectionOrderAscDisplayOrderAscIdAsc(Long campaignId);

    List<FeedbackCampaignQuestionSelection> findByCampaignIdAndIncludedTrueOrderByRelationshipTypeAscTargetLevelRankAscSectionOrderAscDisplayOrderAscIdAsc(Long campaignId);

    @Query("""
        SELECT s
        FROM FeedbackCampaignQuestionSelection s
        LEFT JOIN FETCH s.questionVersion qv
        LEFT JOIN FETCH qv.questionBank qb
        WHERE s.campaign.id = :campaignId
          AND s.included = true
          AND s.relationshipType = :relationshipType
          AND s.targetLevelCode = :targetLevelCode
          AND (s.targetPositionId IS NULL OR s.targetPositionId = :targetPositionId)
          AND (s.targetDepartmentId IS NULL OR s.targetDepartmentId = :targetDepartmentId)
        ORDER BY s.sectionOrder ASC, s.displayOrder ASC, s.id ASC
    """)
    List<FeedbackCampaignQuestionSelection> findIncludedForAssignmentGroup(
            @Param("campaignId") Long campaignId,
            @Param("relationshipType") FeedbackRelationshipType relationshipType,
            @Param("targetLevelCode") String targetLevelCode,
            @Param("targetPositionId") Long targetPositionId,
            @Param("targetDepartmentId") Long targetDepartmentId
    );

    long countByCampaignIdAndIncludedTrue(Long campaignId);

    boolean existsByCampaignIdAndIncludedTrue(Long campaignId);

    @Modifying
    void deleteByCampaignId(Long campaignId);
}
