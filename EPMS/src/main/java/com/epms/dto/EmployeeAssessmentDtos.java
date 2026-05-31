package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
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
        private Integer questionId;
        private String sectionTitle;
        private String questionText;
        private Integer itemOrder;
        private String responseType;
        private Integer rating;
        private String comment;
        private Boolean yesNoAnswer;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentRequest {
        private Integer formId;
        private Integer assessmentFormId;
        private String period;
        private String remarks;
        private List<AssessmentItemRequest> items;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ReviewActionRequest {
        private String comment;
        private String reason;
        private Long signatureId;
        private String signatureImageData;
        private String signatureImageType;
        private String signatureName;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentItemResponse {
        private Long id;
        private Integer questionId;
        private String sectionTitle;
        private String questionText;
        private Integer itemOrder;
        private String responseType;
        private Boolean isRequired;
        private Double weight;
        private Integer rating;
        private Integer maxRating;
        private String comment;
        private Boolean yesNoAnswer;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentSectionResponse {
        private Integer id;
        private String title;
        private Integer orderNo;
        private List<AssessmentItemResponse> items;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentScoreBandResponse {
        private Integer id;
        private Integer minScore;
        private Integer maxScore;
        private String label;
        private String description;
        private Integer sortOrder;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AssessmentResponse {
        private Long id;
        private Integer formId;
        private Integer assessmentFormId;
        private String formName;
        private String companyName;

        private Integer userId;
        private Integer employeeId;
        private String employeeName;
        private String employeeCode;
        private String currentPosition;
        private Integer departmentId;
        private String departmentName;
        private Integer managerUserId;
        private String managerName;
        private Integer departmentHeadUserId;
        private String departmentHeadName;
        private LocalDate assessmentDate;

        private String period;
        private String status;
        private Double totalScore;
        private Double maxScore;
        private Double scorePercent;
        private String performanceLabel;
        private String remarks;
        private String managerComment;
        private String hrComment;
        private String departmentHeadComment;
        private String declineReason;
        private String rejectedByRole;
        private Integer rejectedByUserId;
        private String rejectedByName;
        private LocalDateTime rejectedAt;

        private Long employeeSignatureId;
        private String employeeSignatureName;
        private String employeeSignatureImageData;
        private String employeeSignatureImageType;
        private LocalDateTime employeeSignedAt;

        private Long managerSignatureId;
        private String managerSignatureName;
        private String managerSignatureImageData;
        private String managerSignatureImageType;
        private LocalDateTime managerSignedAt;

        private Long departmentHeadSignatureId;
        private String departmentHeadSignatureName;
        private String departmentHeadSignatureImageData;
        private String departmentHeadSignatureImageType;
        private LocalDateTime departmentHeadSignedAt;

        private Long hrSignatureId;
        private String hrSignatureName;
        private String hrSignatureImageData;
        private String hrSignatureImageType;
        private LocalDateTime hrSignedAt;

        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;
        private LocalDateTime submittedAt;
        private LocalDateTime approvedAt;
        private LocalDateTime declinedAt;

        private List<AssessmentSectionResponse> sections;
        private List<AssessmentScoreBandResponse> scoreBands;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreTableRowResponse {
        private Long id;
        private Integer formId;
        private Integer assessmentFormId;
        private String formName;

        private Integer employeeId;
        private String employeeName;
        private String employeeCode;
        private Integer departmentId;
        private String departmentName;
        private Integer managerUserId;
        private String managerName;

        private String period;
        private String status;
        private Double totalScore;
        private Double maxScore;
        private Double scorePercent;
        private String performanceLabel;

        private LocalDateTime submittedAt;
        private LocalDateTime approvedAt;
        private LocalDateTime declinedAt;
        private String declineReason;
        private String rejectedByRole;
        private Integer rejectedByUserId;
        private String rejectedByName;
        private LocalDateTime rejectedAt;

        private Boolean employeeSigned;
        private Boolean managerSigned;
        private Boolean departmentHeadSigned;
        private Boolean hrSigned;
    }
}