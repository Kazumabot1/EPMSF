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

    @NotNull
    private Integer durationMonths;

    @NotEmpty
    private List<Integer> kpiFormIds = new ArrayList<>();
}
