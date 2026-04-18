package com.epms.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OneOnOneActionItemRequestDto {

    @NotNull(message = "Meeting ID must not be null")
    private Integer meetingId;
    @NotBlank(message = "Description must not be blank")
    private String description;
    private String owner;
    private Date dueDate;
    private String status;
}
