package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignCompetencyWeightResponse {
    private Long competencyId;
    private String competencyCode;
    private String competencyName;
    private Integer displayOrder;
    private Integer questionCountPerForm;
    private Boolean questionCountVariesByForm;
    private Integer formCount;
    private List<String> usedInForms;
    private Map<String, Integer> includedScoredQuestionCountByForm;
    private Double defaultWeightPercent;
    private Double weightPercent;
    private Boolean saved;
    private List<String> warnings;
}
