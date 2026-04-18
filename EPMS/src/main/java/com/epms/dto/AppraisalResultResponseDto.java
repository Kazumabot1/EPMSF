package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Date;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalResultResponseDto {

    private Integer id;
    private Integer employeeId;
    private Integer cycleId;
    private Double selfScore;
    private Double managerScore;
    private Double finalScore;
    private String performanceCategory;
    private String status;
    private String selfComment;
    private String managerComment;
    private Date submittedAt;
    private Date lockedAt;
}

