package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackCompetencyResultResponse {
    String competencyCode;
    String competencyName;
    Double averageScore;
    Long responseCount;
    Long questionCount;
    List<FeedbackRelationshipScoreResponse> relationshipBreakdown;
}
