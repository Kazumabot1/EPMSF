package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignTargetResponse {
    private Long requestId;
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
    @Builder.Default
    private List<String> blockReasons = List.of();
    @Builder.Default
    private List<String> warnings = List.of();
    @Builder.Default
    private List<String> notes = List.of();

    private Integer activeTeamCount;
    @Builder.Default
    private List<String> activeTeamNames = List.of();
    private Integer peerCandidateCount;
    private Integer subordinateCandidateCount;

    private LocalDateTime selectedAt;
    private Long selectedByUserId;
}
