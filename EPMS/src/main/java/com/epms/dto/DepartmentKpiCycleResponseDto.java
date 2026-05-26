package com.epms.dto;

import com.epms.entity.enums.KpiTemplateCycleStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentKpiCycleResponseDto {
    private Integer id;
    private String cycleName;
    private LocalDate startDate;
    private LocalDate endDate;
    private Integer durationMonths;
    private Integer durationYears;
    private String durationLabel;
    private KpiTemplateCycleStatus status;
    private Integer currentPeriodId;
    private Integer currentPeriodNumber;
    private LocalDate currentPeriodStartDate;
    private LocalDate currentPeriodEndDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    @Builder.Default
    private List<TemplateSummary> templates = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class TemplateSummary {
        private Integer id;
        private String title;
    }
}
