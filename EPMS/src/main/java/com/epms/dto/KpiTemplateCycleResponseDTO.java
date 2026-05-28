package com.epms.dto;

import com.epms.entity.enums.KpiTemplateCycleStatus;
import com.epms.entity.enums.KpiEarlyCloseReviewDecision;
import com.epms.entity.enums.KpiGraceExtension;
import com.epms.entity.enums.KpiTemplateCyclePeriodStatus;
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
public class KpiTemplateCycleResponseDTO {

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
    private LocalDateTime closingRequestedAt;
    private LocalDateTime graceEndsAt;
    private LocalDateTime closedAt;
    private String earlyCloseReason;
    private KpiGraceExtension graceExtension;
    private LocalDateTime earlyCloseRequestedAt;
    private Integer earlyCloseRequestedByUserId;
    private String earlyCloseRequestedByName;
    private LocalDateTime earlyCloseReviewedAt;
    private Integer earlyCloseReviewedByUserId;
    private String earlyCloseReviewedByName;
    private KpiEarlyCloseReviewDecision earlyCloseReviewDecision;
    private String earlyCloseReviewReason;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<KpiFormSummaryDTO> kpiForms = new ArrayList<>();

    @Builder.Default
    private List<KpiFormPeriodScheduleDTO> periodSchedules = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiFormSummaryDTO {
        private Integer id;
        private String title;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiFormPeriodScheduleDTO {
        private Integer kpiFormId;
        private String kpiFormTitle;

        @Builder.Default
        private List<PeriodDTO> periods = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PeriodDTO {
        private Integer id;
        private Integer periodNumber;
        private LocalDate startDate;
        private LocalDate endDate;
        private KpiTemplateCyclePeriodStatus status;
    }
}
