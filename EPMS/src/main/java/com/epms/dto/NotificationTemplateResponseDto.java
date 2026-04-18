package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplateResponseDto {

    private Integer id;
    private String channelType;
    private String subjectTemplate;
    private String bodyTemplate;
}
