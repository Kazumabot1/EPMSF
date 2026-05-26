package com.epms.dto;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import lombok.*;

import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateDepartmentKpiScoresRequest {
    @NotEmpty
    @Valid
    private List<ScoreUpdate> scores;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ScoreUpdate {
        private Integer templateRowId;
        private Double actualValue;
    }
}
