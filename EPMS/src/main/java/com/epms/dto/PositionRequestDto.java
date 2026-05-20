/*
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
*/


package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
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

    /**
     * FK to roles.id — which system role this position maps to.
     * Determines the dashboard shown after login.
     */
    private Integer roleId;

    /** Permission flags for this position. May be null on create (defaults to all false). */
    private PositionPermissionDto permissions;

    @Size(max = 150, message = "Reason must not exceed 150 characters")
    private String reason;
}
