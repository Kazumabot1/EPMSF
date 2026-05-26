package com.epms.dto;

import com.epms.entity.enums.KpiFormStatus;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentKpiTemplateRequestDto {
    @NotBlank
    private String title;
    @Builder.Default
    private KpiFormStatus status = KpiFormStatus.DRAFT;
    private Integer durationMonths;
    @NotEmpty
    @Builder.Default
    private List<Integer> departmentIds = new ArrayList<>();
    @NotEmpty
    @Valid
    @Builder.Default
    private List<KpiFormItemDTO> items = new ArrayList<>();
}
