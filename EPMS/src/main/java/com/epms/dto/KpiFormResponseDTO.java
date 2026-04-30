package com.epms.dto;

import com.epms.entity.enums.KpiFormStatus;
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
public class KpiFormResponseDTO {

    private Integer id;
    private String title;
    private LocalDate startDate;
    private LocalDate endDate;
    private KpiFormStatus status;

    private Integer version;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    private String createdBy;
    private Integer createdByUserId;

    @Builder.Default
    private List<KpiPositionSummaryDTO> positions = new ArrayList<>();

    @Builder.Default
    private List<KpiFormItemDTO> items = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class KpiPositionSummaryDTO {
        private Integer id;
        private Integer positionId;
        private String positionTitle;
    }
}
