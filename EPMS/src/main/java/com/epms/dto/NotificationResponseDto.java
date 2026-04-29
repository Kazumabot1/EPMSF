package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

import java.util.Date;

@Data
@AllArgsConstructor
public class NotificationResponseDto {
    private Integer id;
    private String title;
    private String message;
    private String type;
    private Boolean isRead;
    private Date createdAt;
}