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
public class FeedbackCampaignQuestionGroupResponse {
    private String groupKey;
    private String relationshipType;
    private String relationshipLabel;
    private String targetLevelCode;
    private Integer targetLevelRank;
    private Integer targetCount;
    private Integer assignmentCount;
    private Integer questionCount;
    private Integer includedQuestionCount;
    private Integer scoredQuestionCount;
    private Integer includedScoredQuestionCount;
    @Builder.Default
    private List<String> warnings = List.of();
    @Builder.Default
    private List<FeedbackCampaignQuestionItemResponse> questions = List.of();
}
