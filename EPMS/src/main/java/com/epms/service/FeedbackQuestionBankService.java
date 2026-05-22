package com.epms.service;

import com.epms.dto.FeedbackDynamicFormPreviewResponse;
import com.epms.dto.FeedbackQuestionBankResponse;
import com.epms.dto.FeedbackQuestionBankUpsertRequest;
import com.epms.dto.FeedbackQuestionRuleResponse;
import com.epms.dto.FeedbackQuestionRuleUpsertRequest;

import java.util.List;

public interface FeedbackQuestionBankService {

    List<FeedbackQuestionBankResponse> getQuestions();

    FeedbackQuestionBankResponse createQuestion(FeedbackQuestionBankUpsertRequest request, Long actorUserId);

    FeedbackQuestionBankResponse updateQuestion(Long questionId, FeedbackQuestionBankUpsertRequest request);

    FeedbackQuestionBankResponse updateQuestionStatus(Long questionId, String status);

    List<FeedbackQuestionRuleResponse> getRules();

    List<FeedbackQuestionRuleResponse> createRule(FeedbackQuestionRuleUpsertRequest request);

    FeedbackQuestionRuleResponse updateRule(Long ruleId, FeedbackQuestionRuleUpsertRequest request);

    List<FeedbackQuestionRuleResponse> updateRuleSet(Long ruleSetId, FeedbackQuestionRuleUpsertRequest request);

    void deactivateRule(Long ruleId);

    FeedbackQuestionRuleResponse activateRule(Long ruleId);

    FeedbackDynamicFormPreviewResponse previewDynamicForm(
            String levelCode,
            String relationshipType,
            Long targetPositionId,
            Long targetDepartmentId
    );
}
