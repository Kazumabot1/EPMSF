package com.epms.entity;

import com.epms.entity.enums.FeedbackCampaignEarlyCloseStatus;
import com.epms.entity.enums.FeedbackCampaignStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "feedback_campaigns")
@Getter
@Setter
@NoArgsConstructor
public class FeedbackCampaign {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "name", nullable = false)
    private String name;

    @Column(name = "review_year")
    private Integer reviewYear;

    @Column(name = "campaign_type", nullable = false)
    private String campaignType;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "description", columnDefinition = "TEXT")
    private String description;

    @Column(name = "instructions", columnDefinition = "TEXT")
    private String instructions;

    @Column(name = "form_id")
    private Long formId;

    @Column(name = "auto_submit_completed_drafts_on_close", nullable = false)
    private Boolean autoSubmitCompletedDraftsOnClose = false;

    @Column(name = "manager_feedback_anonymous", nullable = false)
    private Boolean managerFeedbackAnonymous = false;

    @Column(name = "peer_feedback_anonymous", nullable = false)
    private Boolean peerFeedbackAnonymous = true;

    @Column(name = "subordinate_feedback_anonymous", nullable = false)
    private Boolean subordinateFeedbackAnonymous = true;

    @Column(name = "self_feedback_anonymous", nullable = false)
    private Boolean selfFeedbackAnonymous = false;

    @Column(name = "redistribute_missing_relationship_weight", nullable = false)
    private Boolean redistributeMissingRelationshipWeight = true;

    @Enumerated(EnumType.STRING)
    @Column(name = "early_close_request_status", nullable = false)
    private FeedbackCampaignEarlyCloseStatus earlyCloseRequestStatus = FeedbackCampaignEarlyCloseStatus.NONE;

    @Column(name = "early_close_requested_at")
    private LocalDateTime earlyCloseRequestedAt;

    @Column(name = "early_close_requested_by_user_id")
    private Long earlyCloseRequestedByUserId;

    @Column(name = "early_close_request_reason", columnDefinition = "TEXT")
    private String earlyCloseRequestReason;

    @Column(name = "early_close_reviewed_at")
    private LocalDateTime earlyCloseReviewedAt;

    @Column(name = "early_close_reviewed_by_user_id")
    private Long earlyCloseReviewedByUserId;

    @Column(name = "early_close_review_reason", columnDefinition = "TEXT")
    private String earlyCloseReviewReason;

    @Column(name = "closed_at")
    private LocalDateTime closedAt;

    @Column(name = "closed_by_user_id")
    private Long closedByUserId;

    @Column(name = "close_reason", columnDefinition = "TEXT")
    private String closeReason;

    @Column(name = "closed_early", nullable = false)
    private Boolean closedEarly = false;

    @Enumerated(EnumType.STRING)
    @Column(name = "status", nullable = false)
    private FeedbackCampaignStatus status;

    @Column(name = "created_by_user_id", nullable = false)
    private Long createdByUserId;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at")
    private LocalDateTime updatedAt;

    @OneToMany(mappedBy = "campaign", fetch = FetchType.LAZY)
    private List<FeedbackRequest> feedbackRequests = new ArrayList<>();

    public LocalDateTime getStartAt() {
        if (startDate == null) {
            return null;
        }
        return startDate.atTime(startTime != null ? startTime : LocalTime.of(9, 0));
    }

    public LocalDateTime getEndAt() {
        if (endDate == null) {
            return null;
        }
        return endDate.atTime(endTime != null ? endTime : LocalTime.of(17, 0));
    }

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
        if (this.startTime == null) {
            this.startTime = LocalTime.of(9, 0);
        }
        if (this.endTime == null) {
            this.endTime = LocalTime.of(17, 0);
        }
        if (this.reviewYear == null && this.startDate != null) {
            this.reviewYear = this.startDate.getYear();
        }
        if (this.campaignType == null || this.campaignType.isBlank()) {
            this.campaignType = "360 Feedback";
        }
        if (this.autoSubmitCompletedDraftsOnClose == null) {
            this.autoSubmitCompletedDraftsOnClose = false;
        }
        if (this.managerFeedbackAnonymous == null) {
            this.managerFeedbackAnonymous = false;
        }
        if (this.peerFeedbackAnonymous == null) {
            this.peerFeedbackAnonymous = true;
        }
        if (this.subordinateFeedbackAnonymous == null) {
            this.subordinateFeedbackAnonymous = true;
        }
        if (this.selfFeedbackAnonymous == null) {
            this.selfFeedbackAnonymous = false;
        }
        if (this.redistributeMissingRelationshipWeight == null) {
            this.redistributeMissingRelationshipWeight = true;
        }
        if (this.earlyCloseRequestStatus == null) {
            this.earlyCloseRequestStatus = FeedbackCampaignEarlyCloseStatus.NONE;
        }
        if (this.closedEarly == null) {
            this.closedEarly = false;
        }
    }

    @PreUpdate
    protected void onUpdate() {
        this.updatedAt = LocalDateTime.now();
    }
}
