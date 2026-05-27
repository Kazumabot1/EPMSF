package com.epms.service;

import com.epms.entity.FeedbackCampaign;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackResponse;
import com.epms.entity.FeedbackSummary;

import java.time.LocalDateTime;
import java.util.List;

public interface FeedbackSummaryCalculationService {

    void applySummaryValues(
            FeedbackSummary summary,
            FeedbackCampaign campaign,
            Long targetEmployeeId,
            List<FeedbackEvaluatorAssignment> assignments,
            List<FeedbackResponse> responses,
            LocalDateTime summarizedAt
    );
}
