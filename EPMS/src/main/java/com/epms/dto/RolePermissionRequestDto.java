package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RolePermissionRequestDto {

    @NotNull(message = "Role ID must not be null")
    private Integer roleId;
    @NotNull(message = "Permission ID must not be null")
    private Integer permissionId;
}
