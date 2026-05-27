package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackTeamSummaryResponse {
    /**
     * Backward compatible owner field. For manager view this is the manager user id;
     * for department-head view this is the department head user id.
     */
    Long managerUserId;
    Long ownerUserId;
    String viewScope;
    Integer departmentId;
    String departmentName;
    Integer totalDirectReports;
    Integer totalDepartmentEmployees;
    Integer totalClosedResults;
    List<FeedbackResultItemResponse> items;
}
