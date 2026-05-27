package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import lombok.*;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentKpiCycleRequestDto {
    @NotBlank
    private String cycleName;
    @NotNull
    private LocalDate startDate;
    private Integer durationYears;
    private Integer durationMonths;
    @NotEmpty
    @Builder.Default
    private List<Integer> templateIds = new ArrayList<>();

    /** Required when updating a cycle; ignored on create. */
    private String editReason;
}
