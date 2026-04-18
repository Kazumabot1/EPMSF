package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class OneOnOneMeetingResponseDto {

    private Integer id;
    private Integer managerId;
    private Integer employeeId;
    private Date scheduledDate;
    private String notes;
    private String status;
    private Date followUpDate;
    private Boolean isFinalized;
    private Date createdAt;
    private Date updatedAt;
}
