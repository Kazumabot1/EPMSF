import api from './api';

export type MonitoringHealthStatus =
    | 'READY'
    | 'ON_TRACK'
    | 'NEEDS_ATTENTION'
    | 'AT_RISK'
    | 'BLOCKED'
    | string;

export type MonitoringAlertSeverity = 'INFO' | 'WARNING' | 'CRITICAL' | 'SUCCESS' | string;

export type MonitoringAlertType =
    | 'NO_TARGETS'
    | 'NO_ASSIGNMENTS'
    | 'OVERDUE_ASSIGNMENTS'
    | 'BLOCKED_TARGETS'
    | 'AT_RISK_TARGETS'
    | 'PRIVACY_COVERAGE'
    | 'HEAVY_WORKLOAD'
    | 'BEHIND_SCHEDULE'
    | 'READY_TO_CLOSE'
    | 'NOT_READY_TO_CLOSE'
    | string;

export interface MonitoringOverview {
    totalTargets: number;
    totalAssignments: number;
    notStartedCount: number;
    inProgressCount: number;
    submittedCount: number;
    cancelledCount: number;
    declinedCount: number;
    overdueCount: number;
    pendingCount: number;
    completionPercent: number;
    readyTargetCount: number;
    onTrackTargetCount: number;
    needsAttentionTargetCount: number;
    atRiskTargetCount: number;
    blockedTargetCount: number;
    readyToCloseTargetCount: number;
    requiredCoveragePercent: number;
    privacyRiskTargetCount: number;
}

export interface RelationshipProgress {
    relationshipType: string;
    label: string;
    assignedCount: number;
    submittedCount: number;
    notStartedCount: number;
    inProgressCount: number;
    cancelledCount: number;
    declinedCount: number;
    overdueCount: number;
    pendingCount: number;
    completionPercent: number;
    protectedRelationship: boolean;
    minimumProtectedResponses: number;
    targetsWithRelationship: number;
    targetsPassingPrivacy: number;
    targetsFailingPrivacy: number;
    warning?: string | null;
}

export interface TargetRelationshipStatus {
    relationshipType: string;
    label: string;
    assignedCount: number;
    submittedCount: number;
    pendingCount: number;
    overdueCount: number;
    required: boolean;
    protectedRelationship?: boolean;
    minimumResponses?: number;
    completed?: boolean;
    privacyPassed: boolean;
    status: string;
}

export interface TargetHealth {
    feedbackRequestId?: number | null;
    targetEmployeeId: number;
    targetUserId?: number | null;
    targetEmployeeCode?: string | null;
    targetEmployeeName: string;
    targetEmployeeEmail?: string | null;
    departmentName?: string | null;
    positionName?: string | null;
    managerName?: string | null;
    requestStatus?: string | null;
    dueAt?: string | null;
    assignedCount: number;
    submittedCount: number;
    pendingCount: number;
    overdueCount: number;
    completionPercent: number;
    requiredCoveragePercent: number;
    privacyCoveragePassed: boolean;
    healthStatus: MonitoringHealthStatus;
    readyToClose: boolean;
    blockingReasons: string[];
    warnings: string[];
    recommendedAction?: string | null;
    lastActivityAt?: string | null;
    relationshipStatuses: TargetRelationshipStatus[];
}

export interface EvaluatorWorkload {
    evaluatorEmployeeId: number;
    evaluatorEmployeeName: string;
    evaluatorEmployeeCode?: string | null;
    evaluatorEmployeeEmail?: string | null;
    departmentName?: string | null;
    positionName?: string | null;
    assignedCount: number;
    submittedCount: number;
    pendingCount: number;
    overdueCount: number;
    completionPercent: number;
    workloadStatus: string;
    lastActivityAt?: string | null;
    relationshipCounts: Record<string, number>;
    targetNames: string[];
}

export type CloseReadinessStatus =
    | 'READY_TO_CLOSE'
    | 'CLOSE_WITH_WARNINGS'
    | 'NOT_READY_TO_CLOSE'
    | 'ALREADY_CLOSED'
    | 'PUBLISHED'
    | string;

export type CloseChecklistStatus = 'PASS' | 'WARNING' | 'BLOCKER' | 'INFO' | string;

export interface CloseReadinessChecklistItem {
    key: string;
    category: string;
    status: CloseChecklistStatus;
    title: string;
    message: string;
    affectedCount: number;
    blocking: boolean;
}

export interface CloseReadiness {
    status: CloseReadinessStatus;
    statusLabel: string;
    canClose: boolean;
    canCloseWithWarnings: boolean;
    requiresAcknowledgement: boolean;
    hardBlockerCount: number;
    warningCount: number;
    passCount: number;
    totalTargets: number;
    readyTargets: number;
    pendingAssignments: number;
    overdueAssignments: number;
    privacyRiskTargets: number;
    summary: string;
    primaryActionLabel: string;
    checklist: CloseReadinessChecklistItem[];
}

export interface MonitoringAlert {
    alertType: MonitoringAlertType;
    severity: MonitoringAlertSeverity;
    title: string;
    message: string;
    affectedCount: number;
    actionType?: string | null;
    filterKey?: string | null;
}

export interface FeedbackCampaignCloseRequest {
    closeMode?: 'STANDARD' | 'WITH_WARNINGS' | string;
    acknowledgedWarnings?: boolean;
    reason?: string | null;
}


export type FeedbackReminderScope =
    | 'CAMPAIGN'
    | 'TARGET'
    | 'RELATIONSHIP'
    | 'TARGET_RELATIONSHIP'
    | 'EVALUATOR'
    | 'ASSIGNMENTS';

export interface FeedbackScopedReminderRequest {
    scope: FeedbackReminderScope;
    targetEmployeeId?: number | null;
    evaluatorEmployeeId?: number | null;
    relationshipType?: string | null;
    assignmentIds?: number[];
    onlyOverdue?: boolean;
}

export interface FeedbackReminderResponse {
    campaignId: number;
    campaignName: string;
    pendingAssignmentCount: number;
    notifiedEvaluatorCount: number;
    skippedAssignmentCount: number;
    notifiedUserCount?: number;
    reminderScope?: FeedbackReminderScope | string | null;
    targetEmployeeId?: number | null;
    evaluatorEmployeeId?: number | null;
    relationshipType?: string | null;
    assignmentIds?: number[];
    onlyOverdue?: boolean | null;
    warnings: string[];
}

export interface FeedbackReminderHistoryItem {
    id: number;
    userId?: number | null;
    changedByName?: string | null;
    action: string;
    entityType: string;
    entityId: number;
    oldValue?: string | null;
    newValue?: string | null;
    reason?: string | null;
    timestamp?: string | null;
}


export interface MonitoringActivityItem {
    id?: number | null;
    activityType: string;
    title: string;
    message: string;
    severity: MonitoringAlertSeverity;
    actorName?: string | null;
    actorRole?: string | null;
    actorUserId?: number | null;
    metadata?: string | null;
    occurredAt?: string | null;
}

export interface FeedbackCampaignMonitoringResponse {
    campaignId: number;
    campaignName: string;
    campaignStatus: string;
    reviewYear?: number | null;
    startDate?: string | null;
    startTime?: string | null;
    endDate?: string | null;
    endTime?: string | null;
    daysRemaining?: number | null;
    totalCampaignDays?: number | null;
    expectedProgressPercent?: number | null;
    progressGapPercent?: number | null;
    campaignHealthStatus: MonitoringHealthStatus;
    readyToClose: boolean;
    closeWithWarnings: boolean;
    overview: MonitoringOverview;
    closeReadiness: CloseReadiness;
    relationships: RelationshipProgress[];
    targets: TargetHealth[];
    evaluators: EvaluatorWorkload[];
    alerts: MonitoringAlert[];
    activity: MonitoringActivityItem[];
}

const emptyCloseReadiness: CloseReadiness = {
    status: 'NOT_READY_TO_CLOSE',
    statusLabel: 'Not ready to close',
    canClose: false,
    canCloseWithWarnings: false,
    requiresAcknowledgement: false,
    hardBlockerCount: 0,
    warningCount: 0,
    passCount: 0,
    totalTargets: 0,
    readyTargets: 0,
    pendingAssignments: 0,
    overdueAssignments: 0,
    privacyRiskTargets: 0,
    summary: 'Close readiness is not available yet.',
    primaryActionLabel: 'Resolve blockers',
    checklist: [],
};

const emptyOverview: MonitoringOverview = {
    totalTargets: 0,
    totalAssignments: 0,
    notStartedCount: 0,
    inProgressCount: 0,
    submittedCount: 0,
    cancelledCount: 0,
    declinedCount: 0,
    overdueCount: 0,
    pendingCount: 0,
    completionPercent: 0,
    readyTargetCount: 0,
    onTrackTargetCount: 0,
    needsAttentionTargetCount: 0,
    atRiskTargetCount: 0,
    blockedTargetCount: 0,
    readyToCloseTargetCount: 0,
    requiredCoveragePercent: 0,
    privacyRiskTargetCount: 0,
};

export const emptyMonitoringResponse = (campaignId = 0): FeedbackCampaignMonitoringResponse => ({
    campaignId,
    campaignName: '',
    campaignStatus: 'DRAFT',
    reviewYear: null,
    startDate: null,
    startTime: null,
    endDate: null,
    endTime: null,
    daysRemaining: null,
    totalCampaignDays: null,
    expectedProgressPercent: 0,
    progressGapPercent: 0,
    campaignHealthStatus: 'BLOCKED',
    readyToClose: false,
    closeWithWarnings: false,
    overview: emptyOverview,
    closeReadiness: emptyCloseReadiness,
    relationships: [],
    targets: [],
    evaluators: [],
    alerts: [],
    activity: [],
});

function unwrap<T>(response: unknown, fallback: T): T {
    const payload = (response as { data?: unknown })?.data;

    if (payload && typeof payload === 'object' && 'data' in payload) {
        return ((payload as { data?: T }).data ?? fallback) as T;
    }

    return (payload ?? fallback) as T;
}

export const feedbackMonitoringService = {
    async getCampaignMonitoring(campaignId: number): Promise<FeedbackCampaignMonitoringResponse> {
        if (!campaignId || campaignId <= 0) {
            return emptyMonitoringResponse(campaignId);
        }

        const response = await api.get(`/v1/feedback/campaigns/${campaignId}/monitoring`);
        return unwrap<FeedbackCampaignMonitoringResponse>(response, emptyMonitoringResponse(campaignId));
    },

    async sendCampaignReminders(campaignId: number): Promise<FeedbackReminderResponse> {
        const response = await api.post(`/v1/feedback/campaigns/${campaignId}/reminders`);
        return unwrap<FeedbackReminderResponse>(response, {
            campaignId,
            campaignName: '',
            pendingAssignmentCount: 0,
            notifiedEvaluatorCount: 0,
            skippedAssignmentCount: 0,
            notifiedUserCount: 0,
            reminderScope: 'CAMPAIGN',
            warnings: [],
        });
    },

    async sendScopedReminders(campaignId: number, request: FeedbackScopedReminderRequest): Promise<FeedbackReminderResponse> {
        const response = await api.post(`/v1/feedback/campaigns/${campaignId}/reminders/scoped`, request);
        return unwrap<FeedbackReminderResponse>(response, {
            campaignId,
            campaignName: '',
            pendingAssignmentCount: 0,
            notifiedEvaluatorCount: 0,
            skippedAssignmentCount: 0,
            notifiedUserCount: 0,
            reminderScope: request.scope,
            targetEmployeeId: request.targetEmployeeId ?? null,
            evaluatorEmployeeId: request.evaluatorEmployeeId ?? null,
            relationshipType: request.relationshipType ?? null,
            assignmentIds: request.assignmentIds ?? [],
            onlyOverdue: request.onlyOverdue ?? false,
            warnings: [],
        });
    },

    async closeCampaign(campaignId: number, request: FeedbackCampaignCloseRequest): Promise<unknown> {
        const response = await api.post(`/v1/feedback/campaigns/${campaignId}/close`, request);
        return unwrap<unknown>(response, response);
    },

    async getMonitoringActivity(campaignId: number): Promise<MonitoringActivityItem[]> {
        if (!campaignId || campaignId <= 0) {
            return [];
        }
        const response = await api.get(`/v1/feedback/campaigns/${campaignId}/monitoring/activity`);
        return unwrap<MonitoringActivityItem[]>(response, []);
    },

    async exportMonitoringCsv(campaignId: number): Promise<void> {
        const response = await api.get(`/v1/feedback/campaigns/${campaignId}/monitoring/export`, {
            responseType: 'blob',
        });
        const blob = response.data instanceof Blob
            ? response.data
            : new Blob([response.data as BlobPart], { type: 'text/csv;charset=utf-8;' });
        const disposition = String(response.headers?.['content-disposition'] ?? '');
        const filenameMatch = disposition.match(/filename=\"?([^\";]+)\"?/i);
        const filename = filenameMatch?.[1] || `360-monitoring-campaign-${campaignId}.csv`;
        const url = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(url);
    },

    async getReminderHistory(campaignId: number): Promise<FeedbackReminderHistoryItem[]> {
        if (!campaignId || campaignId <= 0) {
            return [];
        }

        const response = await api.get('/v1/feedback/audit-logs', {
            params: {
                entityType: 'FEEDBACK_CAMPAIGN',
                entityId: campaignId,
            },
        });
        const rows = unwrap<FeedbackReminderHistoryItem[]>(response, []);
        return rows.filter((item) =>
            ['FEEDBACK_DEADLINE_REMINDERS_SENT', 'FEEDBACK_OVERDUE_REMINDERS_SENT'].includes(
                String(item.action ?? '').toUpperCase(),
            ),
        );
    },
};
