package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class DepartmentKpiFinalizationRequestDto {
    @NotBlank(message = "Finalization reason is required.")
    @Size(max = 1000, message = "Finalization reason cannot exceed 1,000 characters.")
    private String reason;
}
