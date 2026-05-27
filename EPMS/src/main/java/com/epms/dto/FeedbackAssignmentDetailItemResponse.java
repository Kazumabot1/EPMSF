package com.epms.dto;

import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSelectionMethod;
import com.epms.entity.enums.FeedbackRelationshipType;
import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackAssignmentDetailItemResponse {
    Long assignmentId;
    Long requestId;
    Long targetEmployeeId;
    String targetEmployeeName;
    Long evaluatorEmployeeId;
    String evaluatorEmployeeName;
    String evaluatorEmployeeCode;
    String evaluatorEmployeeEmail;
    Integer evaluatorDepartmentId;
    Integer evaluatorPositionId;
    String evaluatorPositionName;
    String manualReason;
    String selectionReason;
    String confidence;
    @Builder.Default
    List<String> warnings = List.of();
    FeedbackRelationshipType relationshipType;
    EvaluatorSelectionMethod selectionMethod;
    AssignmentStatus status;
    Boolean anonymous;
}
