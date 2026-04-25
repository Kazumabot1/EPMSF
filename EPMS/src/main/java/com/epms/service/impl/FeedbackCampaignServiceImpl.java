package com.epms.service.impl;

import com.epms.entity.FeedbackCampaign;
import com.epms.entity.enums.FeedbackCampaignStatus;
import com.epms.exception.BusinessValidationException;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackCampaignRepository;
import com.epms.service.FeedbackCampaignService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedbackCampaignServiceImpl implements FeedbackCampaignService {

    private final FeedbackCampaignRepository feedbackCampaignRepository;

    @Override
    @Transactional
    public FeedbackCampaign createCampaign(String name, LocalDate startDate, LocalDate endDate, String status, Long createdByUserId) {
        validateDates(startDate, endDate);

        FeedbackCampaign campaign = new FeedbackCampaign();
        campaign.setName(name);
        campaign.setStartDate(startDate);
        campaign.setEndDate(endDate);
        campaign.setStatus(FeedbackCampaignStatus.valueOf(status.toUpperCase()));
        campaign.setCreatedByUserId(createdByUserId);
        return feedbackCampaignRepository.save(campaign);
    }

    @Override
    @Transactional
    public FeedbackCampaign updateCampaign(Long campaignId, String name, LocalDate startDate, LocalDate endDate, String status) {
        validateDates(startDate, endDate);

        FeedbackCampaign campaign = getCampaignById(campaignId);
        campaign.setName(name);
        campaign.setStartDate(startDate);
        campaign.setEndDate(endDate);
        campaign.setStatus(FeedbackCampaignStatus.valueOf(status.toUpperCase()));
        return feedbackCampaignRepository.save(campaign);
    }

    @Override
    @Transactional(readOnly = true)
    public FeedbackCampaign getCampaignById(Long campaignId) {
        return feedbackCampaignRepository.findById(campaignId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback campaign not found."));
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackCampaign> getAllCampaigns() {
        return feedbackCampaignRepository.findAllByOrderByStartDateDesc();
    }

    private void validateDates(LocalDate startDate, LocalDate endDate) {
        if (startDate == null || endDate == null) {
            throw new BusinessValidationException("Campaign start and end dates are required.");
        }
        if (endDate.isBefore(startDate)) {
            throw new BusinessValidationException("Campaign end date must be on or after the start date.");
        }
    }
}
