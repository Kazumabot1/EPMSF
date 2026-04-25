package com.epms.service.impl;

import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.entity.enums.EvaluatorSelectionMethod;
import com.epms.entity.enums.EvaluatorSourceType;
import com.epms.exception.BusinessValidationException;
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
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class FeedbackEvaluationServiceImpl implements FeedbackEvaluationService {

    private final FeedbackEvaluatorAssignmentRepository assignmentRepository;
    private final FeedbackRequestRepository feedbackRequestRepository;
    private final EmployeeHierarchyService employeeHierarchyService;

    @Override
    @Transactional
    public void autoAssignEvaluators(Long feedbackRequestId, Long targetEmployeeId, boolean isAnonymousEnabled,
                                     List<EvaluatorSourceType> evaluatorTypes) {
        log.info("Auto-assigning evaluators for Request ID: {}, Target Employee: {}", feedbackRequestId, targetEmployeeId);

        FeedbackRequest request = feedbackRequestRepository.findById(feedbackRequestId)
                .orElseThrow(() -> new ResourceNotFoundException("Feedback request not found"));

        List<FeedbackEvaluatorAssignment> assignments = new ArrayList<>();
        Set<EvaluatorSourceType> requestedTypes = evaluatorTypes == null
                ? Set.of()
                : new LinkedHashSet<>(evaluatorTypes);

        if (requestedTypes.contains(EvaluatorSourceType.MANAGER)) {
            Integer managerId = employeeHierarchyService.getManagerId(targetEmployeeId.intValue());
            if (managerId != null && !assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(feedbackRequestId, managerId.longValue())) {
                assignments.add(createAssignment(request, managerId.longValue(), EvaluatorSourceType.MANAGER,
                        EvaluatorSelectionMethod.MANUAL, isAnonymousEnabled));
            }
        }

        if (requestedTypes.contains(EvaluatorSourceType.PEER)) {
            List<Integer> peerIds = employeeHierarchyService.getRandomPeers(targetEmployeeId.intValue(), 3);
            if (peerIds != null) {
                for (Integer peerId : peerIds) {
                    if (!assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(feedbackRequestId, peerId.longValue())) {
                        assignments.add(createAssignment(request, peerId.longValue(), EvaluatorSourceType.PEER,
                                EvaluatorSelectionMethod.AUTO_RANDOM, isAnonymousEnabled));
                    }
                }
            }
        }

        if (requestedTypes.contains(EvaluatorSourceType.SUBORDINATE)) {
            List<Integer> subordinateIds = employeeHierarchyService.getSubordinates(targetEmployeeId.intValue());
            if (subordinateIds != null) {
                for (Integer subId : subordinateIds) {
                    if (!assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(feedbackRequestId, subId.longValue())) {
                        assignments.add(createAssignment(request, subId.longValue(), EvaluatorSourceType.SUBORDINATE,
                                EvaluatorSelectionMethod.MANUAL, isAnonymousEnabled));
                    }
                }
            }
        }

        if (requestedTypes.contains(EvaluatorSourceType.SELF)
                && !assignmentRepository.existsByFeedbackRequestIdAndEvaluatorEmployeeId(feedbackRequestId, targetEmployeeId)) {
            assignments.add(createAssignment(request, targetEmployeeId, EvaluatorSourceType.SELF,
                    EvaluatorSelectionMethod.MANUAL, isAnonymousEnabled));
        }

        if (!assignments.isEmpty()) {
            assignmentRepository.saveAll(assignments);
            log.info("Assigned {} evaluators automatically.", assignments.size());
        } else {
            throw new BusinessValidationException("No evaluators could be assigned for the selected evaluator types.");
        }
    }

    private FeedbackEvaluatorAssignment createAssignment(FeedbackRequest request, Long evaluatorId, EvaluatorSourceType sourceType,
                                                         EvaluatorSelectionMethod selectionMethod, boolean isAnonymousEnabled) {
        FeedbackEvaluatorAssignment assignment = new FeedbackEvaluatorAssignment();
        assignment.setFeedbackRequest(request);
        assignment.setEvaluatorEmployeeId(evaluatorId);
        assignment.setSourceType(sourceType);
        assignment.setSelectionMethod(selectionMethod);
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
