package com.epms.repository;

import com.epms.entity.FeedbackCampaignCompetencyWeight;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackCampaignCompetencyWeightRepository extends JpaRepository<FeedbackCampaignCompetencyWeight, Long> {
    List<FeedbackCampaignCompetencyWeight> findByCampaignIdOrderByCompetencyNameSnapshotAsc(Long campaignId);
    void deleteByCampaignId(Long campaignId);
}
