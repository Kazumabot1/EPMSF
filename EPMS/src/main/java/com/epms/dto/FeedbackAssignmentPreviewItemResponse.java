package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackAssignmentPreviewItemResponse {
    Long requestId;
    Long targetEmployeeId;
    String targetEmployeeName;
    int managerAssignments;
    int selfAssignments;
    int subordinateAssignments;
    int peerAssignments;
    int totalAssignments;
    int autoAssignments;
    int manualAssignments;
    List<String> warnings;
}
