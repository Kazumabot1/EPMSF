package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalSectionResponseDto {

    private Long id;
    private Long formId;
    private String title;
    private Integer orderNo;
    private LocalDateTime createdAt;
    private List<AppraisalQuestionResponseDto> questions;
}
