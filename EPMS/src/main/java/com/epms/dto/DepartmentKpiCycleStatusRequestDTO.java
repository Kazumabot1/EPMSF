package com.epms.dto;

import com.epms.entity.enums.KpiGraceExtension;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentKpiCycleStatusRequestDTO {

    @NotNull
    private Boolean active;

    @Size(max = 1000, message = "Early close reason cannot exceed 1,000 characters.")
    private String reason;

    private KpiGraceExtension graceExtension;
}

