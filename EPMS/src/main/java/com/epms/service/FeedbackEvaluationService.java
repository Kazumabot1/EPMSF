package com.epms.service;

import com.epms.entity.enums.EvaluatorSourceType;
import com.epms.repository.projection.PendingEvaluatorProjection;

import java.util.List;

public interface FeedbackEvaluationService {
    void autoAssignEvaluators(Long feedbackRequestId, Long targetEmployeeId, boolean isAnonymousEnabled, List<EvaluatorSourceType> evaluatorTypes);
    List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId);
}
