package com.epms.service;

import com.epms.dto.FeedbackQuestionBankReadinessResponse;
import com.epms.dto.FeedbackQuestionBankUpsertRequest;
import com.epms.dto.FeedbackQuestionQualityValidationResponse;

public interface QuestionQualityValidationService {

    FeedbackQuestionQualityValidationResponse validateQuestion(FeedbackQuestionBankUpsertRequest request, Long excludeQuestionId);

    FeedbackQuestionBankReadinessResponse getReadiness();
}
