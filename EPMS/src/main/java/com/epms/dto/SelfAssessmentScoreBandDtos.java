package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

public final class SelfAssessmentScoreBandDtos {

    private SelfAssessmentScoreBandDtos() {
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreBandRequest {
        private Integer id;
        private Integer minScore;
        private Integer maxScore;
        private String label;
        private String description;
        private Integer sortOrder;
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreTableUpdateRequest {
        private Integer editedBandId;
        private String reason;
        private List<ScoreBandRequest> bands = new ArrayList<>();
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreBandResponse {
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
    public static class ScoreBandAuditResponse {
        private Long id;
        private Integer bandId;
        private Integer sortOrder;
        private Integer changedByUserId;
        private String changedByName;
        private String changedByRole;
        private String changedPart;
        private String oldValue;
        private String newValue;
        private String reason;
        private LocalDateTime changedAt;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreTableResponse {
        private List<ScoreBandResponse> bands;
        private List<ScoreBandAuditResponse> audits;
        private Boolean activeFormExists;
        private Integer activeFormCount;
    }
}