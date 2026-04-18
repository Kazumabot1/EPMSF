package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class RolePermissionResponseDto {

    private Integer id;
    private Integer roleId;
    private Integer permissionId;
}
