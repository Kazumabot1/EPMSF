package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AppraisalQuestionResponseDto {

    private Long id;
    private Long sectionId;
    private String questionText;
    private String responseType;
    private Boolean isRequired;
    private Double weight;
    private Long ratingScaleId;
    private LocalDateTime createdAt;
}
