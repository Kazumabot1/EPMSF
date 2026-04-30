package com.epms.dto;

import com.epms.entity.enums.KpiFormStatus;
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
public class KpiFormRequestDTO {

    @NotBlank
    private String title;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @Builder.Default
    private KpiFormStatus status = KpiFormStatus.DRAFT;

    @NotEmpty
    private List<Integer> positionIds = new ArrayList<>();

    @NotEmpty
    private List<KpiFormItemDTO> items = new ArrayList<>();
}
