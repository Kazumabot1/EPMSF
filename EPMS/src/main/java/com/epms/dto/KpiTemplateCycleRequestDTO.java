package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class KpiTemplateCycleRequestDTO {

    @NotBlank
    private String cycleName;

    @NotNull
    private LocalDate startDate;

    private Integer durationMonths;

    private Integer durationYears;

    @Builder.Default
    @NotEmpty
    private List<Integer> kpiFormIds = new ArrayList<>();

    /** Required when updating a cycle; ignored on create. */
    private String editReason;
}
