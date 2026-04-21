package com.epms.entity.enums;

/**
 * Standardized status for feedback evaluator assignments.
 * PENDING     → evaluator has been notified, not yet started.
 * IN_PROGRESS → evaluator has saved a draft of their response.
 * SUBMITTED   → evaluator has finalized and submitted the response.
 * EXPIRED     → evaluation deadline passed before submission.
 */
public enum FeedbackAssignmentStatus {
    PENDING,
    IN_PROGRESS,
    SUBMITTED,
    EXPIRED
}
