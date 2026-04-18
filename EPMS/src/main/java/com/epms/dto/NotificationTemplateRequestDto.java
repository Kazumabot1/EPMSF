package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplateRequestDto {

    private String channelType;
    @NotBlank(message = "Subject template must not be blank")
    private String subjectTemplate;
    @NotBlank(message = "Body template must not be blank")
    private String bodyTemplate;
}
