package com.epms.dto;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class FeedbackRequestListResponse {
    private Long id;
    private Long formId;
    private Long cycleId;
    private Long targetEmployeeId;
    private LocalDateTime dueAt;
    private String status;
}
