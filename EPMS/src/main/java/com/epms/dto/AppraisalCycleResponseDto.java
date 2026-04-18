package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalCycleResponseDto {

    private Integer id;
    private String name;
    private String type;
    private Date startDate;
    private Date endDate;
    private Boolean isActive;
    private String status;
    private Date createdAt;
}

