package com.epms.service.impl;

import com.epms.entity.FeedbackAssignmentQuestion;
import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.service.FeedbackAssignmentQuestionSnapshotService;
import com.epms.service.FeedbackQuestionResolverService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class FeedbackQuestionResolverServiceImpl implements FeedbackQuestionResolverService {

    private final FeedbackAssignmentQuestionSnapshotService assignmentQuestionSnapshotService;

    @Override
    @Transactional
    public List<FeedbackAssignmentQuestion> findOrCreateAssignmentQuestions(FeedbackEvaluatorAssignment assignment) {
        return assignmentQuestionSnapshotService.findOrCreateAssignmentQuestions(assignment);
    }

    @Override
    @Transactional(readOnly = true)
    public List<FeedbackAssignmentQuestion> getAssignmentQuestions(Long assignmentId) {
        return assignmentQuestionSnapshotService.getAssignmentQuestions(assignmentId);
    }

    @Override
    @Transactional
    public void snapshotCampaignAssignments(Long campaignId) {
        assignmentQuestionSnapshotService.snapshotCampaignAssignments(campaignId);
    }
}
