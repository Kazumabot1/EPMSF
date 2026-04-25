package com.epms.repository;

import com.epms.entity.FeedbackCampaign;
import com.epms.entity.enums.FeedbackCampaignStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface FeedbackCampaignRepository extends JpaRepository<FeedbackCampaign, Long> {
    List<FeedbackCampaign> findByStatusOrderByStartDateDesc(FeedbackCampaignStatus status);
    List<FeedbackCampaign> findAllByOrderByStartDateDesc();
}
