package com.epms.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class FeedbackRequestListResponse {
    private Long id;
    private Long formId;
    private Long campaignId;
    private String campaignName;
    private Long targetEmployeeId;
    private LocalDateTime dueAt;
    private String status;
}
