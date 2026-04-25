package com.epms.repository;

import com.epms.entity.FeedbackResponse;
import com.epms.entity.enums.ResponseStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface FeedbackResponseRepository extends JpaRepository<FeedbackResponse, Long> {

    Optional<FeedbackResponse> findByEvaluatorAssignmentId(Long evaluatorAssignmentId);

    boolean existsByEvaluatorAssignmentId(Long evaluatorAssignmentId);

    /**
     * Get submitted responses only (e.g. for general viewing or aggregation).
     */
    @Query("SELECT r FROM FeedbackResponse r WHERE r.finalStatus = :status")
    List<FeedbackResponse> findByFinalStatus(@Param("status") ResponseStatus status);

    /**
     * Get submitted responses specifically for a feedback request.
     */
    @Query("SELECT r FROM FeedbackResponse r " +
           "JOIN r.evaluatorAssignment a " +
           "WHERE a.feedbackRequest.id = :requestId AND r.finalStatus = :status")
    List<FeedbackResponse> findResponsesByRequestIdAndStatus(@Param("requestId") Long requestId, @Param("status") ResponseStatus status);

    @Query("SELECT r FROM FeedbackResponse r " +
           "JOIN r.evaluatorAssignment a " +
           "JOIN a.feedbackRequest req " +
            "WHERE req.targetEmployeeId = :targetEmployeeId " +
           "AND r.finalStatus = :status")
    List<FeedbackResponse> findByTargetEmployeeIdAndStatus(@Param("targetEmployeeId") Long targetEmployeeId,
                                                           @Param("status") ResponseStatus status);

    @Query("SELECT r FROM FeedbackResponse r " +
           "JOIN r.evaluatorAssignment a " +
           "JOIN a.feedbackRequest req " +
           "WHERE req.campaign.id = :campaignId AND r.finalStatus = :status")
    List<FeedbackResponse> findByCampaignIdAndStatus(@Param("campaignId") Long campaignId, @Param("status") ResponseStatus status);

    @Query("SELECT r FROM FeedbackResponse r " +
           "JOIN r.evaluatorAssignment a " +
           "JOIN a.feedbackRequest req " +
           "WHERE req.targetEmployeeId IN :targetEmployeeIds " +
           "AND r.finalStatus = :status")
    List<FeedbackResponse> findByTargetEmployeeIdsAndStatus(@Param("targetEmployeeIds") List<Long> targetEmployeeIds,
                                                            @Param("status") ResponseStatus status);

    /**
     * Example modifying query to update final status of a response.
     */
    @Modifying
    @Query("UPDATE FeedbackResponse r SET r.finalStatus = :newStatus WHERE r.id = :responseId")
    int updateStatus(@Param("responseId") Long responseId, @Param("newStatus") ResponseStatus newStatus);
}
