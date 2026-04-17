package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class KpiItemRequestDto {

    @NotBlank(message = "Name must not be blank")
    private String name;

    @NotNull(message = "kpiCategoryId must not be null")
    private Integer kpiCategoryId;
}
