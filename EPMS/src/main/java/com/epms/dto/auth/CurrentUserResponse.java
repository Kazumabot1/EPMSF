package com.epms.dto.auth;

import lombok.Builder;
import lombok.Data;

import java.util.List;

@Data
@Builder
public class CurrentUserResponse {

    private Integer id;
    private String email;
    private String fullName;
    private String employeeCode;
    private String position;
    private List<String> roles;
    private List<String> permissions;
    private String dashboard;
    private Boolean mustChangePassword;
}