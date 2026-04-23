package com.epms.repository;

import com.epms.entity.FeedbackEvaluatorAssignment;
import com.epms.entity.enums.AssignmentStatus;
import com.epms.repository.projection.PendingEvaluatorProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface FeedbackEvaluatorAssignmentRepository extends JpaRepository<FeedbackEvaluatorAssignment, Long> {

    List<FeedbackEvaluatorAssignment> findByFeedbackRequestId(Long feedbackRequestId);

    List<FeedbackEvaluatorAssignment> findByEvaluatorEmployeeId(Long evaluatorEmployeeId);

    Page<FeedbackEvaluatorAssignment> findByEvaluatorEmployeeId(Long evaluatorEmployeeId, Pageable pageable);

    List<FeedbackEvaluatorAssignment> findByEvaluatorEmployeeIdAndStatus(Long evaluatorEmployeeId, AssignmentStatus status);

    List<FeedbackEvaluatorAssignment> findByFeedbackRequestIdAndStatusIn(Long feedbackRequestId, List<AssignmentStatus> statuses);

    Page<FeedbackEvaluatorAssignment> findByEvaluatorEmployeeIdAndStatus(Long evaluatorEmployeeId, AssignmentStatus status, Pageable pageable);

    boolean existsByFeedbackRequestIdAndEvaluatorEmployeeId(Long feedbackRequestId, Long evaluatorEmployeeId);

    /**
     * Get all evaluator assignments for a target employee in a specific cycle.
     */
    @Query("SELECT a FROM FeedbackEvaluatorAssignment a " +
           "JOIN a.feedbackRequest r " +
           "WHERE r.targetEmployeeId = :targetEmployeeId AND r.cycleId = :cycleId")
    List<FeedbackEvaluatorAssignment> findAssignmentsByTargetAndCycle(@Param("targetEmployeeId") Long targetEmployeeId, @Param("cycleId") Long cycleId);

    /**
     * Get pending evaluators (not submitted or declined yet) for a given feedback request.
     * Uses projection for data optimization.
     */
    @Query("SELECT a.evaluatorEmployeeId as evaluatorId, a.feedbackRequest.id as requestId " +
           "FROM FeedbackEvaluatorAssignment a " +
           "WHERE a.feedbackRequest.id = :requestId " +
           "AND a.status NOT IN (com.epms.entity.enums.AssignmentStatus.SUBMITTED, com.epms.entity.enums.AssignmentStatus.DECLINED)")
    List<PendingEvaluatorProjection> findPendingEvaluatorsByRequestId(@Param("requestId") Long requestId);

    long countByFeedbackRequestId(Long feedbackRequestId);

    long countByFeedbackRequestIdAndStatus(Long feedbackRequestId, AssignmentStatus status);
}
