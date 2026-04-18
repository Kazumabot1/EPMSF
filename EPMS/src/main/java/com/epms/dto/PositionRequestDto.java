package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PositionRequestDto {

    @NotBlank(message = "Position title must not be blank")
    private String positionTitle;

    @NotNull(message = "Level id must not be null")
    private Integer levelId;

    private String description;

    private Boolean status;

    private String createdBy;
}
