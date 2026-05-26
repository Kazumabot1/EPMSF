package com.epms.service;

import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.entity.FeedbackEvaluatorAssignment;

import java.util.List;

public interface FeedbackAssignmentQuestionSnapshotService {

    List<FeedbackAssignmentQuestion> findOrCreateAssignmentQuestions(FeedbackEvaluatorAssignment assignment);

    List<FeedbackAssignmentQuestion> getAssignmentQuestions(Long assignmentId);

    void snapshotCampaignAssignments(Long campaignId);
}
