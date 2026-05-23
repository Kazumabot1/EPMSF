package com.epms.dto;

import com.epms.entity.enums.KpiTemplateCycleStatus;
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
    private String durationLabel;
    private KpiTemplateCycleStatus status;
    private Integer currentPeriodId;
    private Integer currentPeriodNumber;
    private LocalDate currentPeriodStartDate;
    private LocalDate currentPeriodEndDate;
    private LocalDateTime closingRequestedAt;
    private LocalDateTime graceEndsAt;
    private LocalDateTime closedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Builder.Default
    private List<KpiFormSummaryDTO> kpiForms = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiFormSummaryDTO {
        private Integer id;
        private String title;
    }
}
