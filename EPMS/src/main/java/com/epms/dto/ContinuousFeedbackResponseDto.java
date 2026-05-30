package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContinuousFeedbackResponseDto {
    private Integer id;

    private Integer teamId;
    private String teamName;

    private Integer employeeId;
    private String employeeName;
    private String employeeEmail;
    private String employeeDepartmentName;

    private Integer giverUserId;
    private String giverName;
    private String giverEmail;
    private String giverDepartmentName;

    private String feedbackText;
    private String category;
    private Integer rating;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
