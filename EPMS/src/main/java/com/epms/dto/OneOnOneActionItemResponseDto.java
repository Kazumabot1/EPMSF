package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;

@Data
public class OneOnOneActionItemResponseDto {

    private Integer id;
    private Integer meetingId;
    private String description;
    private LocalDateTime updatedAt;
}
