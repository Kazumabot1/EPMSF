package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackTeamSummaryResponse {
    Long managerUserId;
    Integer totalDirectReports;
    Integer totalClosedResults;
    @Builder.Default
    List<FeedbackResultItemResponse> items = List.of();
}
