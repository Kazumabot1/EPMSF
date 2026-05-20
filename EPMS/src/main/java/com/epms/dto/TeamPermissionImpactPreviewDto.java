package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamPermissionImpactPreviewDto {
    private Integer positionId;
    private String positionTitle;
    private boolean hasImpact;
    private int memberRemovalCount;
    private int projectManagerRemovalCount;
    private int teamInactivationCount;

    @Builder.Default
    private List<ImpactItem> items = new ArrayList<>();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ImpactItem {
        private String impactType;
        private Integer teamId;
        private String teamName;
        private Integer userId;
        private String userName;
        private String positionTitle;
        private String message;
    }
}