package com.epms.notification;

public final class NotificationEventKey {

    private NotificationEventKey() {
    }

    public static final String KPI_SCORING_REQUESTED = "KPI_SCORING_REQUESTED";
    public static final String KPI_EMPLOYEE_TARGET_ASSIGNED = "KPI_EMPLOYEE_TARGET_ASSIGNED";
    public static final String KPI_POSITION_CHANGE_SCORING_REQUIRED = "KPI_POSITION_CHANGE_SCORING_REQUIRED";
    public static final String KPI_CYCLE_WRAP_UP = "KPI_CYCLE_WRAP_UP";
    public static final String KPI_RESULT_FINALIZED = "KPI_RESULT_FINALIZED";
    public static final String KPI_HR_SUMMARY = "KPI_HR_SUMMARY";
    public static final String DEPARTMENT_KPI_APPROVAL_REQUESTED = "DEPARTMENT_KPI_APPROVAL_REQUESTED";
    public static final String DEPARTMENT_KPI_APPROVAL_DECIDED = "DEPARTMENT_KPI_APPROVAL_DECIDED";
    public static final String DEPARTMENT_KPI_FINALIZED = "DEPARTMENT_KPI_FINALIZED";

    public static final String APPRAISAL_CYCLE_ACTIVATED = "APPRAISAL_CYCLE_ACTIVATED";
    public static final String APPRAISAL_CYCLE_DEACTIVATED = "APPRAISAL_CYCLE_DEACTIVATED";
    public static final String APPRAISAL_MANAGER_REVIEW_STARTED = "APPRAISAL_MANAGER_REVIEW_STARTED";
    public static final String APPRAISAL_DEADLINE_REMINDER = "APPRAISAL_DEADLINE_REMINDER";
    public static final String APPRAISAL_DEADLINE_OVERDUE = "APPRAISAL_DEADLINE_OVERDUE";
    public static final String APPRAISAL_REVIEW_SUBMITTED = "APPRAISAL_REVIEW_SUBMITTED";
    public static final String APPRAISAL_RESULT_PUBLISHED = "APPRAISAL_RESULT_PUBLISHED";
    public static final String APPRAISAL_CYCLE_LOCKED = "APPRAISAL_CYCLE_LOCKED";
    public static final String APPRAISAL_CYCLE_COMPLETED = "APPRAISAL_CYCLE_COMPLETED";

    public static final String FEEDBACK_360_TASK_ASSIGNED = "FEEDBACK_360_TASK_ASSIGNED";
    public static final String FEEDBACK_360_DEADLINE_REMINDER = "FEEDBACK_360_DEADLINE_REMINDER";
    public static final String FEEDBACK_360_OVERDUE_REMINDER = "FEEDBACK_360_OVERDUE_REMINDER";
    public static final String FEEDBACK_360_SUMMARY_PUBLISHED = "FEEDBACK_360_SUMMARY_PUBLISHED";
    public static final String FEEDBACK_360_DRAFT_AUTO_SUBMITTED = "FEEDBACK_360_DRAFT_AUTO_SUBMITTED";
    public static final String FEEDBACK_360_EARLY_CLOSE_REVIEW = "FEEDBACK_360_EARLY_CLOSE_REVIEW";
    public static final String FEEDBACK_360_EARLY_CLOSE_DECIDED = "FEEDBACK_360_EARLY_CLOSE_DECIDED";

    public static final String CONTINUOUS_FEEDBACK_RECEIVED = "CONTINUOUS_FEEDBACK_RECEIVED";

    public static final String MEETING_CREATED = "MEETING_CREATED";
    public static final String MEETING_UPDATED = "MEETING_UPDATED";
    public static final String MEETING_CANCELLED = "MEETING_CANCELLED";
    public static final String MEETING_REMINDER = "MEETING_REMINDER";

    public static final String PIP_CREATED = "PIP_CREATED";
    public static final String PIP_PHASE_UPDATED = "PIP_PHASE_UPDATED";
    public static final String PIP_ENDED = "PIP_ENDED";
    public static final String PIP_CREATOR_CONFIRMATION = "PIP_CREATOR_CONFIRMATION";

    public static final String TEAM_CREATED = "TEAM_CREATED";
    public static final String TEAM_STRUCTURE_CHANGED = "TEAM_STRUCTURE_CHANGED";
    public static final String TEAM_MEMBER_ADDED = "TEAM_MEMBER_ADDED";
    public static final String TEAM_MEMBER_REMOVED = "TEAM_MEMBER_REMOVED";
    public static final String TEAM_LEADER_CHANGED = "TEAM_LEADER_CHANGED";
    public static final String PROJECT_MANAGER_CHANGED = "PROJECT_MANAGER_CHANGED";
    public static final String TEAM_ANNOUNCEMENT = "TEAM_ANNOUNCEMENT";

    public static final String POSITION_DEPARTMENT_CHANGED = "POSITION_DEPARTMENT_CHANGED";

    public static final String HR_ANNOUNCEMENT_NORMAL = "HR_ANNOUNCEMENT_NORMAL";
    public static final String HR_ANNOUNCEMENT_IMPORTANT = "HR_ANNOUNCEMENT_IMPORTANT";
}
