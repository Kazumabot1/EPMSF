package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackTeamSummaryResponse {
    Long managerUserId;
    Long ownerUserId;
    String viewScope;
    Integer departmentId;
    String departmentName;
    Integer totalDirectReports;
    Integer totalDepartmentEmployees;
    Integer totalManagedTeams;
    Integer totalDepartmentTeams;
    Integer totalClosedResults;
    String accessTitle;
    String accessDescription;
    String privacyNotice;
    String emptyStateMessage;
    List<FeedbackResultItemResponse> items;
}
