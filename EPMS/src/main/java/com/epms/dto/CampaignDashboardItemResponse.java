package com.epms.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;

@Data
@Builder
public class CampaignDashboardItemResponse {
    private Long campaignId;
    private String campaignName;
    private String status;
    private LocalDate startDate;
    private LocalDate endDate;
    private Long totalRequests;
    private Double completionPercent;
}
