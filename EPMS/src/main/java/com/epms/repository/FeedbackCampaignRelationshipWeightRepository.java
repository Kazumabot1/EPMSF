package com.epms.repository;

import com.epms.entity.FeedbackCampaignRelationshipWeight;
import com.epms.entity.enums.FeedbackRelationshipType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackCampaignRelationshipWeightRepository extends JpaRepository<FeedbackCampaignRelationshipWeight, Long> {
    List<FeedbackCampaignRelationshipWeight> findByCampaignIdOrderByRelationshipTypeAsc(Long campaignId);
    Optional<FeedbackCampaignRelationshipWeight> findByCampaignIdAndRelationshipType(Long campaignId, FeedbackRelationshipType relationshipType);
    void deleteByCampaignId(Long campaignId);
    void deleteByCampaignIdAndRelationshipTypeNotIn(Long campaignId, Collection<FeedbackRelationshipType> relationshipTypes);
}
