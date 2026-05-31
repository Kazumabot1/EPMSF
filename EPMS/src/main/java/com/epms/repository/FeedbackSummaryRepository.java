package com.epms.repository;

import com.epms.entity.FeedbackSummary;
import com.epms.entity.enums.FeedbackSummaryVisibilityStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackSummaryRepository extends JpaRepository<FeedbackSummary, Long> {
    List<FeedbackSummary> findByCampaignIdOrderByTargetEmployeeIdAsc(Long campaignId);

    Optional<FeedbackSummary> findByCampaignIdAndTargetEmployeeId(Long campaignId, Long targetEmployeeId);

    @Query("""
            select summary
            from FeedbackSummary summary
            where summary.targetEmployeeId = :targetEmployeeId
            order by summary.summarizedAt desc, summary.campaign.id desc
            """)
    List<FeedbackSummary> findByTargetEmployeeIdOrderByCampaignEndDateDesc(@Param("targetEmployeeId") Long targetEmployeeId);

    @Query("""
            select summary
            from FeedbackSummary summary
            where summary.targetEmployeeId in :targetEmployeeIds
            order by summary.summarizedAt desc, summary.campaign.id desc, summary.targetEmployeeId asc
            """)
    List<FeedbackSummary> findByTargetEmployeeIdInOrderByCampaignEndDateDesc(@Param("targetEmployeeIds") Collection<Long> targetEmployeeIds);

    boolean existsByCampaign_IdAndTargetEmployeeIdAndVisibilityStatus(
            Long campaignId,
            Long targetEmployeeId,
            FeedbackSummaryVisibilityStatus visibilityStatus
    );
}
