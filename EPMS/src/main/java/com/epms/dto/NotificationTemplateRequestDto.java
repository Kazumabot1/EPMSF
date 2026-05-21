package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplateRequestDto {

    private String channelType;
    private List<String> channels;
    @NotEmpty(message = "At least one target role is required")
    private List<String> targetRoles;
    @NotBlank(message = "Subject template must not be blank")
    private String subjectTemplate;
    @NotBlank(message = "Body template must not be blank")
    private String bodyTemplate;
}
