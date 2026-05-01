package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

public final class EmployeeAssessmentDtos {

    private EmployeeAssessmentDtos() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentItemRequest {
        private Long id;
        private String sectionTitle;
        private String questionText;
        private Integer itemOrder;
        private Integer rating;
        private String comment;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentRequest {
        private String period;
        private String remarks;
        private List<AssessmentItemRequest> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentItemResponse {
        private Long id;
        private String sectionTitle;
        private String questionText;
        private Integer itemOrder;
        private Integer rating;
        private Integer maxRating;
        private String comment;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentSectionResponse {
        private String title;
        private List<AssessmentItemResponse> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentResponse {
        private Long id;
        private Integer userId;
        private Integer employeeId;
        private String employeeName;
        private String employeeCode;
        private Integer departmentId;
        private String departmentName;
        private String period;
        private String status;
        private Double totalScore;
        private Double maxScore;
        private Double scorePercent;
        private String performanceLabel;
        private String remarks;
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime submittedAt;
        private List<AssessmentSectionResponse> sections;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreTableRowResponse {
        private Long id;
        private Integer employeeId;
        private String employeeName;
        private String employeeCode;
        private String departmentName;
        private String period;
        private String status;
        private Double totalScore;
        private Double maxScore;
        private Double scorePercent;
        private String performanceLabel;
        private LocalDateTime submittedAt;
    }
}
