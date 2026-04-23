package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalFormResponseDto {

    private Long id;
    private String formName;
    private String description;
    private Boolean isActive;
    private LocalDateTime createdAt;
    private List<AppraisalSectionResponseDto> sections;
}
