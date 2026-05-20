package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinalizeEmployeeKpiRequest {

    @NotBlank(message = "Finalization reason is required.")
    @Size(max = 2000, message = "Finalization reason must be 2000 characters or fewer.")
    private String reason;
}
