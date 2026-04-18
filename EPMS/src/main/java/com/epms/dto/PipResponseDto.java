package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PipResponseDto {

    private Integer id;
    private Integer employeeId;
    private Integer createdBy;
    private String title;
    private String objectives;
    private String expectedOutcomes;
    private Date reviewDate;
    private String status;
    private Date startDate;
    private Date endDate;
    private Boolean isAcknowledged;
    private Date createdAt;
    private Date updatedAt;
}
