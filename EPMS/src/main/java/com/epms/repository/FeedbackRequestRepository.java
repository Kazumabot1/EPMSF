package com.epms.repository;

import com.epms.entity.FeedbackRequest;
import com.epms.entity.enums.FeedbackRequestStatus;
import com.epms.repository.projection.FeedbackSummaryProjection;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FeedbackRequestRepository extends JpaRepository<FeedbackRequest, Long> {

    List<FeedbackRequest> findByTargetEmployeeId(Long targetEmployeeId);

    Page<FeedbackRequest> findByTargetEmployeeId(Long targetEmployeeId, Pageable pageable);

    List<FeedbackRequest> findByCampaignId(Long campaignId);

    Page<FeedbackRequest> findByCampaignId(Long campaignId, Pageable pageable);

    List<FeedbackRequest> findByStatus(FeedbackRequestStatus status);

    Page<FeedbackRequest> findByStatus(FeedbackRequestStatus status, Pageable pageable);

    List<FeedbackRequest> findByDueAtBefore(LocalDateTime dueAt);

    List<FeedbackRequest> findByTargetEmployeeIdAndCampaignId(Long targetEmployeeId, Long campaignId);

    /**
     * Calculate average score per feedback request.
     * Uses projection for read optimization.
     */
    @Query("SELECT r.evaluatorAssignment.feedbackRequest.id as requestId, " +
           "AVG(r.overallScore) as avgScore, " +
           "COUNT(r) as totalResponses " +
           "FROM FeedbackResponse r " +
           "WHERE r.evaluatorAssignment.feedbackRequest.id = :requestId " +
           "GROUP BY r.evaluatorAssignment.feedbackRequest.id")
    FeedbackSummaryProjection getFeedbackSummaryByRequestId(@Param("requestId") Long requestId);
}
