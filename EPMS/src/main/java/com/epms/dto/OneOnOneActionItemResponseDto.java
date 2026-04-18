package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OneOnOneActionItemResponseDto {

    private Integer id;
    private Integer meetingId;
    private String description;
    private String owner;
    private Date dueDate;
    private String status;
    private Date createdAt;
}
