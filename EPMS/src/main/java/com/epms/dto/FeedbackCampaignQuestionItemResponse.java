package com.epms.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FeedbackCampaignQuestionItemResponse {
    private Long selectionId;
    private Long questionBankId;
    private Long questionVersionId;
    private Long sourceRuleId;
    private String questionCode;
    private String competencyCode;
    private String competencyName;
    private String questionText;
    private String responseType;
    private String scoringBehavior;
    private Integer ratingScaleId;
    private Boolean required;
    private Boolean included;
    private Double weight;
    @Deprecated
    private String sectionCode;
    @Deprecated
    private String sectionTitle;
    @Deprecated
    private Integer sectionOrder;
    private Integer displayOrder;
}
