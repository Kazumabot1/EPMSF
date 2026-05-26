package com.epms.dto;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class FeedbackAssignmentEmployeeInfoResponse {
    Long employeeId;
    Integer userId;
    String employeeCode;
    String employeeName;
    String email;
    String positionName;
    String departmentName;
    String levelCode;
}
