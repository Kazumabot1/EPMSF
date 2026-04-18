package com.epms.repository.projection;

public interface FeedbackSummaryProjection {
    Long getRequestId();
    Double getAvgScore();
    Long getTotalResponses();
}
