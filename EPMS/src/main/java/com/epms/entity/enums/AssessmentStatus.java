package com.epms.entity.enums;

public enum AssessmentStatus {
    DRAFT,

    /*
     * Legacy statuses kept for old records.
     */
    SUBMITTED,
    REJECTED,

    /*
     * New self-assessment workflow.
     */
    PENDING_MANAGER,
    PENDING_DEPARTMENT_HEAD,
    PENDING_HR,

    APPROVED,
    DECLINED,

    /*
     * Rejected after the assessment period already ended.
     * Employee can see the final score but cannot edit again.
     */
    CLOSED_REJECTED
}