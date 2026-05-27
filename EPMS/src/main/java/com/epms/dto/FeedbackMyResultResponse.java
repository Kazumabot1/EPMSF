package com.epms.dto;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class FeedbackMyResultResponse {
    Long employeeId;
    String employeeName;
    @Builder.Default
    List<FeedbackResultItemResponse> results = List.of();
}
