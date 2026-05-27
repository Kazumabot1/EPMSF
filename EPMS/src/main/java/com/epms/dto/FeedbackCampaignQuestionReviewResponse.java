package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignQuestionReviewResponse {
    private Long campaignId;
    private String campaignName;
    private String campaignStatus;
    private Boolean saved;
    private Integer targetCount;
    private Integer assignmentCount;
    private Integer groupCount;
    private Integer questionCount;
    private Integer includedQuestionCount;
    private Integer scoredQuestionCount;
    private Integer includedScoredQuestionCount;
    private Double totalCompetencyWeight;
    private Boolean competencyWeightsReady;
    private LocalDateTime lastSavedAt;
    @Builder.Default
    private List<String> warnings = List.of();
    @Builder.Default
    private List<FeedbackCampaignCompetencyWeightResponse> competencyWeights = List.of();
    @Builder.Default
    private List<FeedbackCampaignQuestionGroupResponse> groups = List.of();
}
