package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplateResponseDto {

    private Integer id;
    private String channelType;
    private List<String> channels;
    private List<String> targetRoles;
    private List<String> targetEmails;
    private String subjectTemplate;
    private String bodyTemplate;
}
