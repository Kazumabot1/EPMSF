package com.epms.dto;

import com.epms.entity.enums.EmployeeKpiStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ManagerKpiAssignmentDto {
    private Integer employeeKpiFormId;
    private Integer employeeId;
    private String employeeName;
    private String positionTitle;
    private Integer kpiFormId;
    private String kpiTitle;
    private EmployeeKpiStatus status;
    private Double totalScore;
    private Double totalWeightedScore;
    private LocalDateTime finalizedAt;
    private String earlyFinalizedReason;
    private Boolean finalizedBeforeEndDate;

    private LocalDate periodStartDate;
    private LocalDate periodEndDate;

    @Builder.Default
    private List<ManagerKpiScoreLineDto> lines = new ArrayList<>();
}
