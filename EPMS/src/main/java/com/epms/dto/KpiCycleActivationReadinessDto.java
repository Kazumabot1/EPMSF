package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class KpiCycleActivationReadinessDto {

    private Integer cycleId;
    private String cycleName;
    private boolean ready;
    private int targetEmployeeCount;
    @Builder.Default
    private List<KpiUnassignedEvaluatorDto> unassignedEvaluators = new ArrayList<>();
    @Builder.Default
    private List<String> blockingIssues = new ArrayList<>();
}
