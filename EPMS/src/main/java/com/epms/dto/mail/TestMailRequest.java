package com.epms.dto.mail;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class TestMailRequest {

    @NotBlank
    @Email
    private String to;
}
