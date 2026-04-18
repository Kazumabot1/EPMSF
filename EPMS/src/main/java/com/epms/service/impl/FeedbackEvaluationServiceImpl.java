package com.epms.service.impl;

import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSelectionMethod;
import com.epms.entity.enums.EvaluatorSourceType;
import com.epms.exception.ResourceNotFoundException;
import com.epms.repository.FeedbackEvaluatorAssignmentRepository;
import com.epms.repository.FeedbackRequestRepository;
import com.epms.repository.projection.PendingEvaluatorProjection;
import com.epms.service.EmployeeHierarchyService;
import com.epms.service.FeedbackEvaluationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackEvaluationServiceImpl implements FeedbackEvaluationService {

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final EmployeeHierarchyService employeeHierarchyService;

    @Override
    @Transactional
    public void autoAssignEvaluators(Long feedbackRequestId, Long targetEmployeeId, boolean isAnonymousEnabled) {
        log.info("Auto-assigning evaluators for Request ID: {}, Target Employee: {}", feedbackRequestId, targetEmployeeId);

        FeedbackRequest request = feedbackRequestRepository.findById(feedbackRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback request not found"));

        List<FeedbackEvaluatorAssignment> assignments = new ArrayList<>();

        // 1. Assign Manager
        Long managerId = employeeHierarchyService.getManagerId(targetEmployeeId);
        if (managerId != null && !assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(feedbackRequestId, managerId)) {
            assignments.add(createAssignment(request, managerId, EvaluatorSourceType.MANAGER, isAnonymousEnabled));
        }

        // 2. Assign Peers (Random Selection)
        List<Long> peerIds = employeeHierarchyService.getRandomPeers(targetEmployeeId, 3);
        if (peerIds != null) {
            for (Long peerId : peerIds) {
                if (!assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(feedbackRequestId, peerId)) {
                    assignments.add(createAssignment(request, peerId, EvaluatorSourceType.PEER, isAnonymousEnabled));
                }
            }
        }

        // 3. Assign Subordinates
        List<Long> subordinateIds = employeeHierarchyService.getSubordinates(targetEmployeeId);
        if (subordinateIds != null) {
            for (Long subId : subordinateIds) {
                if (!assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(feedbackRequestId, subId)) {
                    assignments.add(createAssignment(request, subId, EvaluatorSourceType.SUBORDINATE, isAnonymousEnabled));
                }
            }
        }

        if (!assignments.isEmpty()) {
            assignmentRepository.saveAll(assignments);
            log.info("Assigned {} evaluators automatically.", assignments.size());
        } else {
            log.warn("No evaluators were found for auto-assignment.");
        }
    }

    private FeedbackEvaluatorAssignment createAssignment(FeedbackRequest request, Long evaluatorId, EvaluatorSourceType sourceType, boolean isAnonymousEnabled) {
        FeedbackEvaluatorAssignment assignment = new FeedbackEvaluatorAssignment();
        assignment.setFeedbackRequest(request);
        assignment.setEvaluatorEmployeeId(evaluatorId);
        assignment.setSourceType(sourceType);
        assignment.setSelectionMethod(EvaluatorSelectionMethod.AUTO_RANDOM);
        assignment.setIsAnonymous(isAnonymousEnabled);
        assignment.setStatus(AssignmentStatus.PENDING);
        return assignment;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PendingEvaluatorProjection> getPendingEvaluators(Long requestId) {
        return assignmentRepository.findPendingEvaluatorsByRequestId(requestId);
    }
}
