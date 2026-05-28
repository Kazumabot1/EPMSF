package com.epms.dto;

import com.epms.entity.enums.DepartmentKpiResultStatus;
import com.epms.entity.enums.KpiEarlyCloseReviewDecision;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentKpiResultDto {
    private Integer departmentKpiResultId;
    private Integer departmentId;
    private String departmentName;
    private Integer templateId;
    private String templateTitle;
    private Integer cyclePeriodId;
    private DepartmentKpiResultStatus status;
    private Double totalScore;
    private Double totalWeightedScore;
    private LocalDateTime finalizedAt;
    private LocalDate periodStartDate;
    private LocalDate periodEndDate;
    private String finalizationRequestReason;
    private LocalDateTime finalizationRequestedAt;
    private Integer finalizationRequestedByUserId;
    private String finalizationRequestedByName;
    private KpiEarlyCloseReviewDecision finalizationReviewDecision;
    private String finalizationReviewReason;
    private LocalDateTime finalizationReviewedAt;
    private Integer finalizationReviewedByUserId;
    private String finalizationReviewedByName;

    @Builder.Default
    private List<Line> lines = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Line {
        private Integer templateRowId;
        private String kpiLabel;
        private Double target;
        private Integer weight;
        private String unitName;
        private Double actualValue;
        private Double score;
        private Double weightedScore;
    }
}
