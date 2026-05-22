package com.epms.repository;

import com.epms.entity.FeedbackCampaign;
import com.epms.entity.enums.FeedbackCampaignEarlyCloseStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.Collection;
import java.util.List;

public interface FeedbackCampaignRepository extends JpaRepository<FeedbackCampaign, Long> {
    List<FeedbackCampaign> findByStatusOrderByStartDateDesc(FeedbackCampaignStatus status);
    List<FeedbackCampaign> findAllByOrderByStartDateDesc();
    List<FeedbackCampaign> findByEarlyCloseRequestStatusOrderByEarlyCloseRequestedAtAsc(FeedbackCampaignEarlyCloseStatus status);

    @Query("""
            SELECT c
            FROM FeedbackCampaign c
            WHERE c.status IN :statuses
              AND c.startDate <= :endDate
              AND c.endDate >= :startDate
            ORDER BY c.startDate ASC, c.id ASC
            """)
    List<FeedbackCampaign> findOverlappingCampaigns(
            @Param("startDate") LocalDate startDate,
            @Param("endDate") LocalDate endDate,
            @Param("statuses") Collection<FeedbackCampaignStatus> statuses
    );
}
