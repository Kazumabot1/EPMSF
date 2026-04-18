package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipUpdateRequestDto {

    @NotNull(message = "PIP ID must not be null")
    private Integer pipId;
    private String comments;
    private String status;
    private Integer updatedBy;
}
