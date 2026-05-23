package com.epms.dto;

import com.epms.entity.enums.EmployeeKpiStatus;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class EmployeeKpiResultDto {
    private Integer employeeKpiFormId;
    private Integer kpiFormId;
    private Integer cyclePeriodId;
    private String kpiTitle;
    private String positionTitle;
    private EmployeeKpiStatus status;
    private Double totalScore;
    private Double totalWeightedScore;
    private LocalDateTime finalizedAt;
    private String earlyFinalizedReason;
    private Boolean finalizedBeforeEndDate;

    @Builder.Default
    private List<ManagerKpiScoreLineDto> lines = new ArrayList<>();
}
