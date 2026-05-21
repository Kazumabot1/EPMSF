package com.epms.dto;

import com.epms.entity.enums.KpiFormStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiFormRequestDTO {

    @NotBlank
    private String title;

    @Builder.Default
    private KpiFormStatus status = KpiFormStatus.DRAFT;

    private LocalDate startDate;

    private LocalDate endDate;

    @NotEmpty
    @Builder.Default
    private List<Integer> positionIds = new ArrayList<>();

    @NotEmpty
    @Builder.Default
    private List<KpiFormItemDTO> items = new ArrayList<>();

    /**
     * Required on update when existing rows are removed. Key is the removed kpi_form_items.id.
     */
    private Map<Integer, String> removedItemReasons;
}
