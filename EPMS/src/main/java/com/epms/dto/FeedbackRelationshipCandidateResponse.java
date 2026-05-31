package com.epms.dto;

import com.epms.entity.enums.FeedbackRelationshipType;
import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackRelationshipCandidateResponse {
    Long employeeId;
    Integer userId;
    String employeeCode;
    String employeeName;
    String email;

    Integer currentDepartmentId;
    String currentDepartmentName;

    Integer positionId;
    String positionName;
    String levelCode;

    FeedbackRelationshipType relationshipType;
    String sourceLabel;
}
