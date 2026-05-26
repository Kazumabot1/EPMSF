package com.epms.dto;

import lombok.Data;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Date;
import java.util.List;

public final class AssessmentFormDtos {

    private AssessmentFormDtos() {
    }

    @Data
    public static class AssessmentQuestionPayload {
        private Integer id;
        private String questionText;
        private String responseType;
        private Boolean isRequired;
        private Double weight;
    }

    @Data
    public static class AssessmentSectionPayload {
        private Integer id;
        private String title;
        private Integer orderNo;
        private List<AssessmentQuestionPayload> questions = new ArrayList<>();
    }

    @Data
    public static class AssessmentScoreBandPayload {
        private Integer id;
        private Integer minScore;
        private Integer maxScore;
        private String label;
        private String description;
        private Integer sortOrder;
    }

    @Data
    public static class AssessmentFormPayload {
        private String formName;
        private String companyName;
        private String description;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private List<String> targetRoles = new ArrayList<>();
        private List<Integer> targetDepartmentIds = new ArrayList<>();
        private List<AssessmentSectionPayload> sections = new ArrayList<>();
        private List<AssessmentScoreBandPayload> scoreBands = new ArrayList<>();
    }

    @Data
    public static class AssessmentFormActivationPayload {
        private Boolean active;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
    }

    @Data
    public static class AssessmentQuestionResponse {
        private Integer id;
        private String questionText;
        private String responseType;
        private Boolean isRequired;
        private Double weight;
    }

    @Data
    public static class AssessmentSectionResponse {
        private Integer id;
        private String title;
        private Integer orderNo;
        private List<AssessmentQuestionResponse> questions = new ArrayList<>();
    }

    @Data
    public static class AssessmentScoreBandResponse {
        private Integer id;
        private Integer minScore;
        private Integer maxScore;
        private String label;
        private String description;
        private Integer sortOrder;
    }

    @Data
    public static class AssessmentFormResponse {
        private Integer id;
        private String formName;
        private String companyName;
        private String description;
        private LocalDateTime startDate;
        private LocalDateTime endDate;
        private Boolean isActive;
        private List<String> targetRoles = new ArrayList<>();
        private List<Integer> targetDepartmentIds = new ArrayList<>();
        private Date createdAt;
        private Date updatedAt;
        private List<AssessmentSectionResponse> sections = new ArrayList<>();
        private List<AssessmentScoreBandResponse> scoreBands = new ArrayList<>();
    }
}