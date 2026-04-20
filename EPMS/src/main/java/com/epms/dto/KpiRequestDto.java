package com.epms.dto;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiRequestDto {

    @NotBlank(message = "Title must not be blank")
    @Size(max = 255, message = "Title must not exceed 255 characters")
    private String title;

    @DecimalMin(value = "0.0", inclusive = true, message = "Target must be greater than or equal to 0")
    private Double target;

    @NotNull(message = "KPI unit id must not be null")
    private Integer kpiUnitId;

    @NotNull(message = "Weight must not be null")
    @Min(value = 1, message = "Weight must be at least 1")
    @Max(value = 100, message = "Weight must not exceed 100")
    private Integer weight;

    @NotNull(message = "KPI category id must not be null")
    private Integer kpiCategoryId;

    @NotNull(message = "KPI item id must not be null")
    private Integer kpiItemId;

    @NotBlank(message = "Created by must not be blank")
    @Size(max = 255, message = "Created by must not exceed 255 characters")
    private String createdBy;

    private Integer createdByUserId;
    private Integer updatedByUserId;
}
