package com.epms.dto;

import com.epms.entity.enums.KpiFormStatus;
import lombok.*;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentKpiTemplateResponseDto {
    private Integer id;
    private String title;
    private LocalDate startDate;
    private LocalDate endDate;
    private KpiFormStatus status;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private Integer createdByUserId;

    @Builder.Default
    private List<DepartmentSummary> departments = new ArrayList<>();

    @Builder.Default
    private List<KpiFormItemDTO> items = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class DepartmentSummary {
        private Integer id;
        private String departmentName;
    }
}
