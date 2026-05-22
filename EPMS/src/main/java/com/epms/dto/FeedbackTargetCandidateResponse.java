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
public class FeedbackTargetCandidateResponse {
    private Long employeeId;
    private Integer userId;
    private String employeeCode;
    private String employeeName;
    private String email;

    private Integer parentDepartmentId;
    private String parentDepartmentName;
    private Integer currentDepartmentId;
    private String currentDepartmentName;

    private Integer positionId;
    private String positionName;
    private String levelCode;

    private Integer managerUserId;
    private Integer managerEmployeeId;
    private String managerName;

    private String employmentStatus;
    private Boolean eligible;
    private List<String> blockReasons;
    private List<String> warnings;
    private List<String> notes;

    private Integer activeTeamCount;
    private List<String> activeTeamNames;
    private Integer peerCandidateCount;
    private Integer subordinateCandidateCount;
}
