package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignTargetsResponse {
    private Long campaignId;
    private String campaignName;
    private String campaignStatus;
    private Integer targetCount;
    private Integer readyCount;
    private Integer warningCount;
    private Integer blockedCount;
    private List<FeedbackCampaignTargetResponse> targets;
    private List<String> warnings;
}
