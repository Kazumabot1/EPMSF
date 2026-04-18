package com.epms.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserRoleRequestDto {

    @NotNull(message = "User ID must not be null")
    private Integer userId;
    @NotNull(message = "Role ID must not be null")
    private Integer roleId;
}
