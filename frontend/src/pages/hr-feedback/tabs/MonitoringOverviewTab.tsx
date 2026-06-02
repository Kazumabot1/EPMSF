import { useEffect, useMemo, useRef, useState, type ReactNode, type RefObject } from 'react';
import { hrFeedbackApi } from '../../../api/hrFeedbackApi';
import {
    emptyMonitoringResponse,
    feedbackMonitoringService,
    type CloseReadiness,
    type CloseReadinessChecklistItem,
    type EvaluatorWorkload,
    type FeedbackCampaignMonitoringResponse,
    type FeedbackReminderHistoryItem,
    type FeedbackReminderResponse,
    type FeedbackScopedReminderRequest,
    type MonitoringActivityItem,
    type MonitoringAlert,
    type MonitoringAlertSeverity,
    type MonitoringOverview,
    type RelationshipProgress,
    type TargetHealth,
    type TargetRelationshipStatus,
} from '../../../services/feedbackMonitoringService';
import type { FeedbackCampaign } from '../../../types/feedbackCampaign';
import './feedback-monitoring.css';

type LoadState = 'idle' | 'loading' | 'success' | 'error';

type Tone = 'emerald' | 'blue' | 'amber' | 'orange' | 'red' | 'slate' | 'violet';

interface ReminderIntent {
    title: string;
    description: string;
    request?: FeedbackScopedReminderRequest;
}

interface CloseConfirmState {
    open: boolean;
    acknowledged: boolean;
    reason: string;
}


type TargetRelationshipFilter = 'ALL' | 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF' | 'MISSING' | 'PRIVACY_RISK' | 'OVERDUE';

type TargetReadyFilter = 'ALL' | 'READY' | 'NOT_READY';

type EvaluatorWorkloadFilter = 'ALL' | 'PENDING' | 'OVERDUE' | 'HEAVY' | 'OVERLOADED' | 'COMPLETE';
type EvaluatorRelationshipFilter = 'ALL' | 'MANAGER' | 'PEER' | 'SUBORDINATE' | 'SELF';

type TargetFilterPreset = {
    token: number;
    search?: string;
    department?: string;
    health?: string;
    relationshipFilter?: TargetRelationshipFilter;
    readyFilter?: TargetReadyFilter;
};

type EvaluatorFilterPreset = {
    token: number;
    search?: string;
    workloadFilter?: EvaluatorWorkloadFilter;
    relationshipFilter?: EvaluatorRelationshipFilter;
};


const EVALUATOR_WORKLOAD_FILTERS: Array<{ value: EvaluatorWorkloadFilter; label: string }> = [
    { value: 'ALL', label: 'All workloads' },
    { value: 'PENDING', label: 'Pending only' },
    { value: 'OVERDUE', label: 'Overdue only' },
    { value: 'HEAVY', label: 'Heavy workload' },
    { value: 'OVERLOADED', label: 'Overloaded' },
    { value: 'COMPLETE', label: 'Completed' },
];

const EVALUATOR_RELATIONSHIP_FILTERS: Array<{ value: EvaluatorRelationshipFilter; label: string }> = [
    { value: 'ALL', label: 'All relationships' },
    { value: 'MANAGER', label: 'Manager' },
    { value: 'PEER', label: 'Peer' },
    { value: 'SUBORDINATE', label: 'Subordinate reviewer' },
    { value: 'SELF', label: 'Self' },
];

const TARGET_RELATIONSHIP_FILTERS: Array<{ value: TargetRelationshipFilter; label: string }> = [
    { value: 'ALL', label: 'All relationships' },
    { value: 'MANAGER', label: 'Manager needs action' },
    { value: 'PEER', label: 'Peer needs action' },
    { value: 'SUBORDINATE', label: 'Subordinate reviewer needs action' },
    { value: 'SELF', label: 'Self needs action' },
    { value: 'MISSING', label: 'Missing evaluator' },
    { value: 'PRIVACY_RISK', label: 'Privacy risk' },
    { value: 'OVERDUE', label: 'Overdue' },
];

const TARGET_READY_FILTERS: Array<{ value: TargetReadyFilter; label: string }> = [
    { value: 'ALL', label: 'All readiness' },
    { value: 'READY', label: 'Ready to close' },
    { value: 'NOT_READY', label: 'Not ready' },
];

const RELATIONSHIP_ORDER = ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'];

const statusLabels: Record<string, string> = {
    DRAFT: 'Draft',
    READY_TO_ACTIVATE: 'Ready to activate',
    ACTIVE: 'Active',
    CLOSED: 'Closed',
    PUBLISHED: 'Published',
};

const healthLabels: Record<string, string> = {
    READY: 'Ready to close',
    ON_TRACK: 'On track',
    NEEDS_ATTENTION: 'Needs attention',
    AT_RISK: 'At risk',
    BLOCKED: 'Blocked',
};

const statusTone: Record<string, Tone> = {
    DRAFT: 'slate',
    READY_TO_ACTIVATE: 'blue',
    ACTIVE: 'emerald',
    CLOSED: 'violet',
    PUBLISHED: 'blue',
};

const healthTone: Record<string, Tone> = {
    READY: 'emerald',
    ON_TRACK: 'blue',
    NEEDS_ATTENTION: 'amber',
    AT_RISK: 'orange',
    BLOCKED: 'red',
};

const severityTone: Record<string, Tone> = {
    CRITICAL: 'red',
    WARNING: 'amber',
    INFO: 'blue',
    SUCCESS: 'emerald',
};

const severityRank: Record<string, number> = {
    CRITICAL: 0,
    WARNING: 1,
    INFO: 2,
    SUCCESS: 3,
};

const closeReadinessToneByStatus: Record<string, Tone> = {
    READY_TO_CLOSE: 'emerald',
    CLOSE_WITH_WARNINGS: 'amber',
    NOT_READY_TO_CLOSE: 'red',
    ALREADY_CLOSED: 'violet',
    PUBLISHED: 'blue',
};

const closeChecklistTone: Record<string, Tone> = {
    PASS: 'emerald',
    WARNING: 'amber',
    BLOCKER: 'red',
    INFO: 'blue',
};

const toneClasses: Record<Tone, { badge: string; icon: string; soft: string; text: string; bar: string; border: string }> = {
    emerald: {
        badge: 'border-emerald-200 bg-emerald-50 text-emerald-700',
        icon: 'bg-emerald-50 text-emerald-600 ring-emerald-100',
        soft: 'bg-emerald-50 text-emerald-700',
        text: 'text-emerald-700',
        bar: 'bg-emerald-500',
        border: 'border-emerald-200',
    },
    blue: {
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        icon: 'bg-blue-50 text-blue-600 ring-blue-100',
        soft: 'bg-blue-50 text-blue-700',
        text: 'text-blue-700',
        bar: 'bg-blue-500',
        border: 'border-blue-200',
    },
    amber: {
        badge: 'border-amber-200 bg-amber-50 text-amber-700',
        icon: 'bg-amber-50 text-amber-600 ring-amber-100',
        soft: 'bg-amber-50 text-amber-700',
        text: 'text-amber-700',
        bar: 'bg-amber-500',
        border: 'border-amber-200',
    },
    orange: {
        badge: 'border-orange-200 bg-orange-50 text-orange-700',
        icon: 'bg-orange-50 text-orange-600 ring-orange-100',
        soft: 'bg-orange-50 text-orange-700',
        text: 'text-orange-700',
        bar: 'bg-orange-500',
        border: 'border-orange-200',
    },
    red: {
        badge: 'border-red-200 bg-red-50 text-red-700',
        icon: 'bg-red-50 text-red-600 ring-red-100',
        soft: 'bg-red-50 text-red-700',
        text: 'text-red-700',
        bar: 'bg-red-500',
        border: 'border-red-200',
    },
    slate: {
        badge: 'border-slate-200 bg-slate-50 text-slate-700',
        icon: 'bg-slate-50 text-slate-600 ring-slate-100',
        soft: 'bg-slate-50 text-slate-700',
        text: 'text-slate-700',
        bar: 'bg-slate-500',
        border: 'border-slate-200',
    },
    violet: {
        badge: 'border-blue-200 bg-blue-50 text-blue-700',
        icon: 'bg-blue-50 text-blue-600 ring-blue-100',
        soft: 'bg-blue-50 text-blue-700',
        text: 'text-blue-700',
        bar: 'bg-blue-500',
        border: 'border-blue-200',
    },
};

const campaignSortRank: Record<string, number> = {
    ACTIVE: 0,
    READY_TO_ACTIVATE: 1,
    CLOSED: 2,
    DRAFT: 3,
    PUBLISHED: 4,
};

const clampPercent = (value?: number | null) => {
    if (!Number.isFinite(Number(value))) return 0;
    return Math.min(100, Math.max(0, Number(value)));
};

const formatPercent = (value?: number | null) => `${clampPercent(value).toFixed(0)}%`;

const formatDecimalPercent = (value?: number | null) => `${clampPercent(value).toFixed(1)}%`;

const formatCount = (value?: number | null) => Number(value ?? 0).toLocaleString();

const labelFromValue = (value?: string | null) =>
    String(value ?? '')
        .replace(/_/g, ' ')
        .toLowerCase()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());

const formatDate = (date?: string | null, time?: string | null) => {
    if (!date) return '-';
    const composed = time ? `${date}T${time}` : date;
    const parsed = new Date(composed);
    if (Number.isNaN(parsed.getTime())) return time ? `${date} ${time}` : date;

    const options: Intl.DateTimeFormatOptions = {
        year: 'numeric',
        month: 'short',
        day: '2-digit',
    };

    if (time) {
        options.hour = '2-digit';
        options.minute = '2-digit';
    }

    return new Intl.DateTimeFormat(undefined, options).format(parsed);
};

const formatCampaignWindow = (monitoring: FeedbackCampaignMonitoringResponse) => {
    const start = formatDate(monitoring.startDate, monitoring.startTime);
    const end = formatDate(monitoring.endDate, monitoring.endTime);

    if (start === '-' && end === '-') return 'Schedule not set';
    return `${start} - ${end}`;
};

const daysRemainingLabel = (days?: number | null) => {
    if (days === null || days === undefined) return 'Schedule not set';
    if (days < 0) return `${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} overdue`;
    if (days === 0) return 'Ends today';
    if (days === 1) return '1 day remaining';
    return `${days} days remaining`;
};

const daysRemainingTone = (days?: number | null): Tone => {
    if (days === null || days === undefined) return 'slate';
    if (days < 0) return 'red';
    if (days <= 2) return 'orange';
    return 'blue';
};

const isClosedCampaignStatus = (status?: string | null) => ['CLOSED', 'PUBLISHED'].includes(String(status ?? '').toUpperCase());

const monitoringHealthLabel = (status?: string | null, health?: string | null) => {
    const normalizedStatus = String(status ?? '').toUpperCase();
    const normalizedHealth = String(health ?? '').toUpperCase();
    if (normalizedStatus === 'CLOSED') {
        if (normalizedHealth === 'READY') return 'Ready for results';
        if (normalizedHealth === 'BLOCKED') return 'Closed with blockers';
        return 'Follow-up needed';
    }
    if (normalizedStatus === 'PUBLISHED') return 'Published';
    return healthLabels[normalizedHealth] ?? labelFromValue(normalizedHealth);
};

const monitoringHealthTone = (status?: string | null, health?: string | null): Tone => {
    const normalizedStatus = String(status ?? '').toUpperCase();
    const normalizedHealth = String(health ?? '').toUpperCase();
    if (normalizedStatus === 'CLOSED') {
        if (normalizedHealth === 'READY') return 'emerald';
        if (normalizedHealth === 'BLOCKED') return 'red';
        return 'amber';
    }
    if (normalizedStatus === 'PUBLISHED') return 'blue';
    return resolveTone(normalizedHealth, healthTone);
};

const closeReadinessLabel = (monitoring: FeedbackCampaignMonitoringResponse) => {
    const status = String(monitoring.campaignStatus ?? '').toUpperCase();
    if (status === 'PUBLISHED') return 'Results published';
    if (status === 'CLOSED') {
        if (monitoring.readyToClose) return 'Ready to publish';
        if (monitoring.closeWithWarnings) return 'Publish with warnings';
        return 'Not ready to publish';
    }
    if (monitoring.readyToClose) return 'Ready to close';
    if (monitoring.closeWithWarnings) return 'Close with warnings';
    return 'Not ready yet';
};

const closeReadinessTone = (monitoring: FeedbackCampaignMonitoringResponse): Tone => {
    if (monitoring.readyToClose) return 'emerald';
    if (monitoring.closeWithWarnings) return 'amber';
    return 'red';
};

const daysRemainingDisplay = (monitoring: FeedbackCampaignMonitoringResponse) => {
    const days = monitoring.daysRemaining;
    if (days === null || days === undefined) return 'Schedule not set';
    if (isClosedCampaignStatus(monitoring.campaignStatus)) {
        if (days < 0) return `Deadline passed ${Math.abs(days)} day${Math.abs(days) === 1 ? '' : 's'} ago`;
        return 'Campaign closed';
    }
    return daysRemainingLabel(days);
};

const workloadBadgeLabel = (workload?: string | null) => {
    const normalized = String(workload ?? 'NORMAL').toUpperCase();
    if (normalized === 'NORMAL') return 'Load normal';
    if (normalized === 'HEAVY') return 'Heavy load';
    if (normalized === 'OVERLOADED') return 'Overloaded';
    return labelFromValue(normalized);
};

const compactRelationshipNote = (relationship: RelationshipProgress) => {
    const notes: string[] = [];
    if (relationship.overdueCount > 0) notes.push(`${formatCount(relationship.overdueCount)} overdue`);
    if (relationship.pendingCount > 0) notes.push(`${formatCount(relationship.pendingCount)} pending`);
    if (relationship.protectedRelationship && relationship.targetsFailingPrivacy > 0) {
        notes.push(`${formatCount(relationship.targetsFailingPrivacy)} anonymity issue${relationship.targetsFailingPrivacy === 1 ? '' : 's'}`);
    }
    if (notes.length === 0 && relationship.warning) return relationship.warning;
    return notes.join(' · ');
};
const closeReadinessStatusLabel = (readiness?: CloseReadiness | null) =>
    readiness?.statusLabel || labelFromValue(readiness?.status || 'NOT_READY_TO_CLOSE');

const closeReadinessStatusTone = (readiness?: CloseReadiness | null): Tone =>
    closeReadinessToneByStatus[String(readiness?.status ?? 'NOT_READY_TO_CLOSE').toUpperCase()] ?? 'slate';

const closeChecklistStatusTone = (status?: string | null): Tone =>
    closeChecklistTone[String(status ?? 'INFO').toUpperCase()] ?? 'slate';


const resolveTone = (value: string | undefined, map: Record<string, Tone>, fallback: Tone = 'slate') =>
    map[String(value ?? '').toUpperCase()] ?? fallback;

const normalizeRelationshipLabel = (relationship: RelationshipProgress) => {
    if (relationship.label) return relationship.label;
    if (relationship.relationshipType === 'SUBORDINATE') return 'Subordinate reviewer';
    return labelFromValue(relationship.relationshipType);
};

const sortRelationships = (relationships: RelationshipProgress[]) =>
    [...relationships].sort((left, right) => {
        const leftIndex = RELATIONSHIP_ORDER.indexOf(left.relationshipType);
        const rightIndex = RELATIONSHIP_ORDER.indexOf(right.relationshipType);
        return (leftIndex < 0 ? 99 : leftIndex) - (rightIndex < 0 ? 99 : rightIndex);
    });

const sortAlerts = (alerts: MonitoringAlert[]) =>
    [...alerts].sort((left, right) => {
        const leftRank = severityRank[String(left.severity).toUpperCase()] ?? 99;
        const rightRank = severityRank[String(right.severity).toUpperCase()] ?? 99;
        if (leftRank !== rightRank) return leftRank - rightRank;
        return String(left.title).localeCompare(String(right.title));
    });

const targetRelationshipStatusTone: Record<string, Tone> = {
    READY: 'emerald',
    PENDING: 'amber',
    IN_PROGRESS: 'blue',
    OVERDUE: 'red',
    PRIVACY_PENDING: 'orange',
    MISSING: 'red',
    NOT_APPLICABLE: 'slate',
};

const targetRelationshipStatusLabels: Record<string, string> = {
    READY: 'Ready',
    PENDING: 'Needs follow-up',
    IN_PROGRESS: 'In progress',
    OVERDUE: 'Overdue',
    PRIVACY_PENDING: 'Anonymity not ready',
    MISSING: 'No evaluator',
    NOT_APPLICABLE: 'N/A',
};


const workloadTone: Record<string, Tone> = {
    NORMAL: 'emerald',
    HEAVY: 'amber',
    OVERLOADED: 'red',
};

const reminderActionLabels: Record<string, string> = {
    FEEDBACK_DEADLINE_REMINDERS_SENT: 'Pending reminders sent',
    FEEDBACK_OVERDUE_REMINDERS_SENT: 'Overdue reminders sent',
};

const activityTone = (activity: MonitoringActivityItem): Tone => {
    const severity = String(activity.severity ?? '').toUpperCase();
    if (severity === 'SUCCESS') return 'emerald';
    if (severity === 'WARNING') return 'amber';
    if (severity === 'CRITICAL') return 'red';
    const type = String(activity.activityType ?? '').toUpperCase();
    if (type.includes('CLOSED')) return 'violet';
    if (type.includes('EXPORT')) return 'blue';
    if (type.includes('REMINDER')) return 'amber';
    return 'blue';
};

const activityIcon = (activityType?: string | null) => {
    const type = String(activityType ?? '').toUpperCase();
    if (type.includes('ACTIVATED')) return 'bi-play-circle';
    if (type.includes('CLOSED')) return 'bi-lock';
    if (type.includes('PUBLISHED')) return 'bi-megaphone';
    if (type.includes('REMINDER')) return 'bi-send';
    if (type.includes('ASSIGNMENT')) return 'bi-diagram-3';
    if (type.includes('TARGET')) return 'bi-people';
    if (type.includes('EXPORT')) return 'bi-download';
    return 'bi-clock-history';
};


const relationshipLabelFromKey = (relationship: string) =>
    relationship === 'SUBORDINATE' ? 'Subordinate reviewer' : labelFromValue(relationship);

const hasEvaluatorSearchMatch = (evaluator: EvaluatorWorkload, query: string) => {
    if (!query.trim()) return true;
    const haystack = [
        evaluator.evaluatorEmployeeName,
        evaluator.evaluatorEmployeeCode,
        evaluator.evaluatorEmployeeEmail,
        evaluator.departmentName,
        evaluator.positionName,
        ...(evaluator.targetNames ?? []),
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
};

const hasEvaluatorWorkloadFilterMatch = (evaluator: EvaluatorWorkload, filter: EvaluatorWorkloadFilter) => {
    if (filter === 'ALL') return true;
    if (filter === 'PENDING') return Number(evaluator.pendingCount ?? 0) > 0;
    if (filter === 'OVERDUE') return Number(evaluator.overdueCount ?? 0) > 0;
    if (filter === 'HEAVY') return String(evaluator.workloadStatus ?? '').toUpperCase() === 'HEAVY';
    if (filter === 'OVERLOADED') return String(evaluator.workloadStatus ?? '').toUpperCase() === 'OVERLOADED';
    if (filter === 'COMPLETE') return Number(evaluator.pendingCount ?? 0) === 0 && Number(evaluator.assignedCount ?? 0) > 0;
    return true;
};

const hasEvaluatorRelationshipFilterMatch = (evaluator: EvaluatorWorkload, filter: EvaluatorRelationshipFilter) => {
    if (filter === 'ALL') return true;
    return Number((evaluator.relationshipCounts ?? {})[filter] ?? 0) > 0;
};

const parseReminderMetric = (value: string | null | undefined, key: string) => {
    const match = String(value ?? '').match(new RegExp(`${key}=([0-9]+)`));
    return match ? Number(match[1]) : null;
};

const parseReminderText = (value: string | null | undefined, key: string) => {
    const match = String(value ?? '').match(new RegExp(`${key}=([^,]+)`));
    return match ? match[1].trim() : null;
};

const targetNeedsRelationshipAction = (relationship?: TargetRelationshipStatus | null) => {
    if (!relationship) return false;
    const status = String(relationship.status ?? '').toUpperCase();
    return relationship.required && !['READY', 'NOT_APPLICABLE'].includes(status);
};

const getTargetRelationship = (target: TargetHealth, relationshipType: string) =>
    (target.relationshipStatuses ?? []).find(
        (relationship) => String(relationship.relationshipType).toUpperCase() === relationshipType,
    );

const hasSearchMatch = (target: TargetHealth, query: string) => {
    if (!query.trim()) return true;
    const haystack = [
        target.targetEmployeeName,
        target.targetEmployeeCode,
        target.targetEmployeeEmail,
        target.departmentName,
        target.positionName,
        target.managerName,
        target.recommendedAction,
    ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
    return haystack.includes(query.trim().toLowerCase());
};

const hasTargetRelationshipFilterMatch = (target: TargetHealth, filter: TargetRelationshipFilter) => {
    if (filter === 'ALL') return true;
    if (filter === 'PRIVACY_RISK') return !target.privacyCoveragePassed;
    if (filter === 'OVERDUE') return Number(target.overdueCount ?? 0) > 0;
    if (filter === 'MISSING') {
        return (target.relationshipStatuses ?? []).some(
            (relationship) => String(relationship.status).toUpperCase() === 'MISSING',
        );
    }
    return targetNeedsRelationshipAction(getTargetRelationship(target, filter));
};

const sortTargetOptions = (values: Array<string | null | undefined>) =>
    Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim())))).sort((left, right) => left.localeCompare(right, undefined, { sensitivity: 'base' }));

const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return value;
    return new Intl.DateTimeFormat(undefined, {
        month: 'short',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    }).format(parsed);
};

const scrollIntoMonitoringView = (element: HTMLElement | null) => {
    element?.scrollIntoView({ behavior: 'smooth', block: 'start' });
};

const alertTargetsEvaluatorWorkload = (alert: MonitoringAlert) => {
    const key = `${alert.alertType ?? ''} ${alert.actionType ?? ''} ${alert.filterKey ?? ''}`.toUpperCase();
    return key.includes('OVERDUE') || key.includes('HEAVY_WORKLOAD') || key.includes('WORKLOAD') || key.includes('REMINDER');
};

const alertTargetsPrivacy = (alert: MonitoringAlert) => {
    const key = `${alert.alertType ?? ''} ${alert.actionType ?? ''} ${alert.filterKey ?? ''} ${alert.title ?? ''}`.toUpperCase();
    return key.includes('PRIVACY') || key.includes('ANONYMITY');
};

const relationshipFromAlert = (alert: MonitoringAlert): TargetRelationshipFilter => {
    const key = `${alert.alertType ?? ''} ${alert.actionType ?? ''} ${alert.filterKey ?? ''} ${alert.title ?? ''}`.toUpperCase();
    if (key.includes('PEER')) return 'PEER';
    if (key.includes('SUBORDINATE') || key.includes('SUBORDINATE REVIEWER')) return 'SUBORDINATE';
    if (key.includes('MANAGER')) return 'MANAGER';
    if (key.includes('SELF')) return 'SELF';
    if (key.includes('PRIVACY') || key.includes('ANONYMITY')) return 'PRIVACY_RISK';
    if (key.includes('OVERDUE')) return 'OVERDUE';
    return 'ALL';
};

const workloadFilterFromAlert = (alert: MonitoringAlert): EvaluatorWorkloadFilter => {
    const key = `${alert.alertType ?? ''} ${alert.actionType ?? ''} ${alert.filterKey ?? ''} ${alert.title ?? ''}`.toUpperCase();
    if (key.includes('OVERLOADED')) return 'OVERLOADED';
    if (key.includes('HEAVY')) return 'HEAVY';
    if (key.includes('OVERDUE')) return 'OVERDUE';
    if (key.includes('PENDING') || key.includes('REMINDER')) return 'PENDING';
    return 'ALL';
};

const alertActionLabel = (alert: MonitoringAlert) => {
    if (alertTargetsEvaluatorWorkload(alert)) return 'View evaluators';
    if (alertTargetsPrivacy(alert)) return 'Review targets';
    const key = `${alert.alertType ?? ''} ${alert.actionType ?? ''}`.toUpperCase();
    if (key.includes('READY_TO_CLOSE') || key.includes('NOT_READY_TO_CLOSE')) return 'Review readiness';
    if (key.includes('TARGET')) return 'View targets';
    return alert.actionType ? labelFromValue(alert.actionType) : 'Open details';
};

const alertCanUseCampaignReminder = (alert: MonitoringAlert) => {
    const key = `${alert.alertType ?? ''} ${alert.actionType ?? ''} ${alert.title ?? ''}`.toUpperCase();
    return key.includes('OVERDUE') || key.includes('PENDING') || key.includes('REMINDER');
};

const scopedReminderFromAlert = (alert: MonitoringAlert): FeedbackScopedReminderRequest => {
    const key = `${alert.alertType ?? ''} ${alert.actionType ?? ''} ${alert.filterKey ?? ''} ${alert.title ?? ''}`.toUpperCase();
    const relationship = relationshipFromAlert(alert);
    if (relationship !== 'ALL' && !['MISSING', 'PRIVACY_RISK', 'OVERDUE'].includes(relationship)) {
        return { scope: 'RELATIONSHIP', relationshipType: relationship, onlyOverdue: key.includes('OVERDUE') };
    }
    return { scope: 'CAMPAIGN', onlyOverdue: key.includes('OVERDUE') };
};

const pickDefaultCampaignId = (campaigns: FeedbackCampaign[]) => {
    const sorted = [...campaigns].sort((left, right) => {
        const statusDiff = (campaignSortRank[left.status] ?? 99) - (campaignSortRank[right.status] ?? 99);
        if (statusDiff !== 0) return statusDiff;
        return Number(right.id ?? 0) - Number(left.id ?? 0);
    });

    return sorted[0]?.id ?? '';
};

function extractErrorMessage(error: unknown, fallback: string) {
    const responseMessage = (error as { response?: { data?: { message?: string; error?: string } } })?.response?.data;
    if (responseMessage?.message) return responseMessage.message;
    if (responseMessage?.error) return responseMessage.error;
    if (error instanceof Error && error.message) return error.message;
    return fallback;
}

function Badge({ label, tone = 'slate' }: { label: string; tone?: Tone }) {
    return (
        <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-xs font-black uppercase tracking-wide ${toneClasses[tone].badge}`}>
      {label}
    </span>
    );
}

function SummaryCard({ icon, label, value, detail, tone }: { icon: string; label: string; value: string; detail: string; tone: Tone }) {
    return (
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
            <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                    <p className="truncate text-[11px] font-black uppercase tracking-[0.13em] text-slate-500">{label}</p>
                    <div className="mt-1 flex min-w-0 items-baseline gap-2">
                        <strong className="block text-xl font-black tracking-tight text-slate-950">{value}</strong>
                        <span className="truncate text-xs font-bold text-slate-500">{detail}</span>
                    </div>
                </div>
                <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ring-1 ${toneClasses[tone].icon}`}>
                    <i className={`bi ${icon}`} />
                </span>
            </div>
        </article>
    );
}

function LoadingSkeleton() {
    return (
        <div className="space-y-5">
            <div className="f360-monitoring-summary-grid">
                {Array.from({ length: 4 }, (_, index) => (
                    <div key={index} className="h-32 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
                        <div className="f360-monitoring-skeleton h-4 w-24 rounded-full" />
                        <div className="f360-monitoring-skeleton mt-5 h-8 w-28 rounded-full" />
                        <div className="f360-monitoring-skeleton mt-4 h-4 w-40 rounded-full" />
                    </div>
                ))}
            </div>
            <div className="grid min-w-0 grid-cols-1 gap-5 2xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)]">
                <div className="f360-monitoring-skeleton h-80 rounded-3xl" />
                <div className="f360-monitoring-skeleton h-80 rounded-3xl" />
            </div>
        </div>
    );
}

function EmptyState({ icon, title, description }: { icon: string; title: string; description: string }) {
    return (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center shadow-sm">
      <span className="mx-auto grid h-14 w-14 place-items-center rounded-3xl bg-slate-50 text-xl text-slate-500 ring-1 ring-slate-200">
        <i className={`bi ${icon}`} />
      </span>
            <h2 className="mt-4 text-xl font-black text-slate-950">{title}</h2>
            <p className="mx-auto mt-2 max-w-2xl text-sm font-semibold leading-6 text-slate-500">{description}</p>
        </section>
    );
}

function OverallProgressCard({ monitoring }: { monitoring: FeedbackCampaignMonitoringResponse }) {
    const overview = monitoring.overview;
    const percent = clampPercent(overview.completionPercent);
    const tone = percent >= 80 ? 'emerald' : percent >= 50 ? 'blue' : percent > 0 ? 'amber' : 'slate';

    return (
        <article className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Relationship completion</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">Feedback submission completion</h2>
                    <p className="mt-1 text-xs font-semibold leading-5 text-slate-500">Submitted evaluator forms only. Scores and comments stay hidden.</p>
                </div>
                <Badge label={`${formatPercent(percent)} complete`} tone={tone} />
            </div>

            <div className="mt-4">
                <div className="flex items-center justify-between gap-3 text-xs font-black uppercase tracking-wide text-slate-500">
                    <span>{formatCount(overview.submittedCount)} submitted</span>
                    <span>{formatCount(overview.totalAssignments)} total</span>
                </div>
                <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                    <div className={`h-full rounded-full ${toneClasses[tone].bar}`} style={{ width: `${percent}%` }} />
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 md:grid-cols-4 xl:mt-auto">
                <ProgressMiniMetric label="Submitted" value={overview.submittedCount} />
                <ProgressMiniMetric label="Pending" value={overview.pendingCount} />
                <ProgressMiniMetric label="In progress" value={overview.inProgressCount} />
                <ProgressMiniMetric label="Overdue" value={overview.overdueCount} tone={overview.overdueCount > 0 ? 'red' : 'slate'} />
            </div>
        </article>
    );
}

function ProgressMiniMetric({ label, value, tone = 'slate' }: { label: string; value: number; tone?: Tone }) {
    return (
        <div className={`rounded-2xl border ${toneClasses[tone].border} bg-slate-50 px-3.5 py-2.5`}>
            <span className="block text-[11px] font-black uppercase tracking-wide text-slate-500">{label}</span>
            <strong className={`mt-0.5 block text-base font-black ${toneClasses[tone].text}`}>{formatCount(value)}</strong>
        </div>
    );
}

function RelationshipProgressCard({ relationships }: { relationships: RelationshipProgress[] }) {
    const ordered = sortRelationships(relationships);

    return (
        <article className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Relationship coverage</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">360 coverage balance</h2>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black uppercase tracking-wide text-slate-500">
                    Live status
                </span>
            </div>

            {ordered.length === 0 ? (
                <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                    Relationship progress will appear after evaluator assignments are generated.
                </div>
            ) : (
                <div className="mt-4 grid gap-2">
                    {ordered.map((relationship) => (
                        <RelationshipRow key={relationship.relationshipType} relationship={relationship} />
                    ))}
                </div>
            )}
        </article>
    );
}

function RelationshipRow({ relationship }: { relationship: RelationshipProgress }) {
    const percent = clampPercent(relationship.completionPercent);
    const tone: Tone = percent >= 80 ? 'emerald' : percent >= 50 ? 'blue' : relationship.overdueCount > 0 ? 'red' : 'amber';
    const note = compactRelationshipNote(relationship);

    return (
        <div className="rounded-2xl border border-slate-200 bg-slate-50/80 px-3 py-2">
            <div className="grid min-w-0 grid-cols-1 gap-2 md:grid-cols-[minmax(145px,0.75fr)_minmax(160px,1fr)_48px] md:items-center">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                        <strong className="text-sm font-black text-slate-950">{normalizeRelationshipLabel(relationship)}</strong>
                        <span className="text-xs font-bold text-slate-500">
                            {formatCount(relationship.submittedCount)} / {formatCount(relationship.assignedCount)}
                        </span>
                    </div>
                    <div className="mt-1 flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wide">
                        <span className="rounded-full bg-white px-2 py-0.5 text-slate-500 ring-1 ring-slate-200">{formatCount(relationship.pendingCount)} pending</span>
                        {relationship.overdueCount > 0 && <span className="rounded-full bg-red-50 px-2 py-0.5 text-red-700 ring-1 ring-red-100">{formatCount(relationship.overdueCount)} overdue</span>}
                    </div>
                </div>

                <div className="min-w-0">
                    <div className="f360-monitoring-striped-bar-track f360-monitoring-compact-bar">
                        <div className={`f360-monitoring-striped-bar-fill ${toneClasses[tone].bar}`} style={{ width: `${percent}%` }} />
                    </div>
                    {note && <p className="mt-1 truncate text-[11px] font-semibold text-amber-700" title={note}>{note}</p>}
                </div>

                <strong className={`text-right text-sm font-black ${toneClasses[tone].text}`}>{formatPercent(percent)}</strong>
            </div>
        </div>
    );
}

function RiskPanel({ monitoring }: { monitoring: FeedbackCampaignMonitoringResponse }) {
    const overview = monitoring.overview;
    const health = String(monitoring.campaignHealthStatus ?? 'BLOCKED').toUpperCase();
    const tone = monitoringHealthTone(monitoring.campaignStatus, health);
    const progressGap = Number(monitoring.progressGapPercent ?? 0);
    const closeLabel = closeReadinessLabel(monitoring);
    const closeTone = closeReadinessTone(monitoring);

    return (
        <article className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Risk status</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">Campaign health</h2>
                </div>
                <div className="flex flex-wrap justify-end gap-2">
                    <Badge label={monitoringHealthLabel(monitoring.campaignStatus, health)} tone={tone} />
                    <Badge label={closeLabel} tone={closeTone} />
                </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
                <RiskMetric label="Expected" value={formatDecimalPercent(monitoring.expectedProgressPercent)} />
                <RiskMetric
                    label="Gap"
                    value={`${progressGap > 0 ? '+' : ''}${progressGap.toFixed(1)}%`}
                    tone={progressGap < -20 ? 'red' : progressGap < 0 ? 'amber' : 'emerald'}
                />
                <RiskMetric label="Coverage" value={formatDecimalPercent(overview.requiredCoveragePercent)} />
                <RiskMetric
                    label="Privacy"
                    value={formatCount(overview.privacyRiskTargetCount)}
                    tone={overview.privacyRiskTargetCount > 0 ? 'amber' : 'emerald'}
                />
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 xl:mt-auto">
                <TargetStatusPill label="Ready" value={overview.readyTargetCount} tone="emerald" />
                <TargetStatusPill label="On track" value={overview.onTrackTargetCount} tone="blue" />
                <TargetStatusPill label="Attention" value={overview.needsAttentionTargetCount} tone="amber" />
                <TargetStatusPill label="Blocked" value={overview.blockedTargetCount} tone="red" />
            </div>
        </article>
    );
}

function CloseReadinessSection({
                                   monitoring,
                                   closing,
                                   closeMessage,
                                   closeError,
                                   onOpenCloseConfirm,
                               }: {
    monitoring: FeedbackCampaignMonitoringResponse;
    closing: boolean;
    closeMessage: string;
    closeError: string;
    onOpenCloseConfirm: () => void;
}) {
    const readiness = monitoring.closeReadiness;
    const tone = closeReadinessStatusTone(readiness);
    const active = String(monitoring.campaignStatus ?? '').toUpperCase() === 'ACTIVE';
    const checklist = readiness?.checklist ?? [];
    const visibleChecklist = checklist.slice(0, 4);
    const canClose = active && Boolean(readiness?.canClose);
    const disabledReason = !active
        ? 'Close is available only while the campaign is active.'
        : !readiness?.canClose
            ? 'Resolve blocking setup issues before closing.'
            : '';

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge label="Close readiness" tone="blue" />
                        <Badge label={closeReadinessStatusLabel(readiness)} tone={tone} />
                    </div>
                    <h2 className="mt-2 text-lg font-black text-slate-950">Ready to close checklist</h2>
                    <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-500">
                        {readiness?.summary || 'Review setup, submissions, coverage, and privacy checks before closing feedback collection.'}
                    </p>
                </div>

                <div className="flex min-w-0 flex-wrap items-center gap-2 xl:justify-end">
                    <CloseReadinessMetric label="Blockers" value={readiness?.hardBlockerCount ?? 0} tone={(readiness?.hardBlockerCount ?? 0) > 0 ? 'red' : 'emerald'} />
                    <CloseReadinessMetric label="Warnings" value={readiness?.warningCount ?? 0} tone={(readiness?.warningCount ?? 0) > 0 ? 'amber' : 'emerald'} />
                    <CloseReadinessMetric label="Ready" value={`${formatCount(readiness?.readyTargets ?? 0)}/${formatCount(readiness?.totalTargets ?? 0)}`} tone="blue" />
                    <button
                        type="button"
                        disabled={!canClose || closing}
                        onClick={onOpenCloseConfirm}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                        title={disabledReason || 'Close campaign'}
                    >
                        {closing ? <i className="bi bi-arrow-repeat f360-monitoring-spin" /> : <i className="bi bi-lock-fill" />}
                        {closing ? 'Closing...' : readiness?.primaryActionLabel || 'Close campaign'}
                    </button>
                </div>
            </div>

            <div className="mt-3 grid gap-2 lg:grid-cols-2">
                {visibleChecklist.map((item) => (
                    <CloseChecklistRow key={item.key || `${item.title}-${item.status}`} item={item} />
                ))}
                {checklist.length > visibleChecklist.length && (
                    <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-500">
                        + {formatCount(checklist.length - visibleChecklist.length)} more checklist item{checklist.length - visibleChecklist.length === 1 ? '' : 's'}
                    </div>
                )}
            </div>

            {(disabledReason || closeMessage || closeError) && (
                <div className="mt-3 grid gap-2">
                    {disabledReason && <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-500">{disabledReason}</p>}
                    {closeMessage && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-700">{closeMessage}</p>}
                    {closeError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">{closeError}</p>}
                </div>
            )}
        </section>
    );
}

function CloseReadinessMetric({ label, value, tone }: { label: string; value: number | string; tone: Tone }) {
    return (
        <div className="min-w-[92px] rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>
            <strong className={`mt-0.5 block text-sm font-black ${toneClasses[tone].text}`}>{typeof value === 'number' ? formatCount(value) : value}</strong>
        </div>
    );
}

function CloseChecklistRow({ item }: { item: CloseReadinessChecklistItem }) {
    const tone = closeChecklistStatusTone(item.status);
    const status = String(item.status ?? 'INFO').toUpperCase();
    const icon = status === 'PASS' ? 'bi-check-circle-fill' : status === 'BLOCKER' ? 'bi-x-octagon-fill' : status === 'WARNING' ? 'bi-exclamation-triangle-fill' : 'bi-info-circle-fill';
    return (
        <div className="flex min-w-0 items-start gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2">
            <span className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${toneClasses[tone].icon}`}>
                <i className={`bi ${icon}`} />
            </span>
            <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                    <strong className="truncate text-sm font-black text-slate-900">{item.title}</strong>
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${toneClasses[tone].soft}`}>{labelFromValue(item.status)}</span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-500">{item.message}</p>
            </div>
        </div>
    );
}

function RiskMetric({ label, value, tone = 'slate' }: { label: string; value: string; tone?: Tone }) {
    return (
        <div className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
            <span className="block truncate text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>
            <strong className={`mt-0.5 block truncate text-sm font-black ${toneClasses[tone].text}`}>{value}</strong>
        </div>
    );
}

function TargetStatusPill({ label, value, tone }: { label: string; value: number; tone: Tone }) {
    return (
        <div className={`flex min-w-0 items-center justify-between gap-2 rounded-xl border ${toneClasses[tone].border} bg-white px-3 py-2`}>
            <span className="truncate text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>
            <strong className={`text-sm font-black ${toneClasses[tone].text}`}>{formatCount(value)}</strong>
        </div>
    );
}

function AlertsPanel({
                         alerts,
                         canSendReminders,
                         onAlertAction,
                         onRequestReminders,
                     }: {
    alerts: MonitoringAlert[];
    canSendReminders: boolean;
    onAlertAction: (alert: MonitoringAlert) => void;
    onRequestReminders: (intent?: ReminderIntent) => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const sortedAlerts = sortAlerts(alerts);
    const visibleAlerts = expanded ? sortedAlerts : sortedAlerts.slice(0, 4);
    const hiddenAlertCount = Math.max(0, sortedAlerts.length - visibleAlerts.length);

    return (
        <article className="flex h-full min-w-0 flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Main alerts</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">HR follow-up</h2>
                </div>
                <Badge label={`${sortedAlerts.length} alert${sortedAlerts.length === 1 ? '' : 's'}`} tone={sortedAlerts.length ? 'amber' : 'emerald'} />
            </div>

            {sortedAlerts.length === 0 ? (
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-bold leading-6 text-emerald-700">
                    No monitoring alerts right now.
                </div>
            ) : (
                <div className="mt-4 flex flex-1 flex-col gap-2">
                    {visibleAlerts.map((alert, index) => (
                        <AlertCard
                            key={`${alert.alertType}-${alert.severity}-${index}`}
                            alert={alert}
                            canSendReminders={canSendReminders}
                            onAlertAction={onAlertAction}
                            onRequestReminders={onRequestReminders}
                        />
                    ))}
                    {sortedAlerts.length > 4 && (
                        <button
                            type="button"
                            onClick={() => setExpanded((current) => !current)}
                            className="mt-auto rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-left text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                        >
                            {expanded ? 'Show fewer alerts' : `Show ${hiddenAlertCount} more alert${hiddenAlertCount === 1 ? '' : 's'}`}
                        </button>
                    )}
                </div>
            )}
        </article>
    );
}

function AlertCard({
                       alert,
                       canSendReminders,
                       onAlertAction,
                       onRequestReminders,
                   }: {
    alert: MonitoringAlert;
    canSendReminders: boolean;
    onAlertAction: (alert: MonitoringAlert) => void;
    onRequestReminders: (intent?: ReminderIntent) => void;
}) {
    const normalizedSeverity = String(alert.severity ?? 'INFO').toUpperCase() as MonitoringAlertSeverity;
    const tone = resolveTone(normalizedSeverity, severityTone, 'blue');
    const canUseReminder = alertCanUseCampaignReminder(alert);

    return (
        <div className={`rounded-xl border ${toneClasses[tone].border} bg-white px-3 py-2 shadow-sm`}>
            <div className="flex min-w-0 items-start gap-2">
                <span className={`mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-xl text-xs ring-1 ${toneClasses[tone].icon}`}>
                    <i className={`bi ${normalizedSeverity === 'CRITICAL' ? 'bi-x-octagon' : normalizedSeverity === 'WARNING' ? 'bi-exclamation-triangle' : 'bi-info-circle'}`} />
                </span>
                <div className="min-w-0 flex-1">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <strong className="min-w-0 text-sm font-black leading-5 text-slate-950">{alert.title}</strong>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${toneClasses[tone].soft}`}>
                            {labelFromValue(normalizedSeverity)}
                        </span>
                    </div>
                    <p className="mt-0.5 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{alert.message}</p>
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[11px] font-black text-slate-500">
                        <span className="rounded-full bg-slate-100 px-2.5 py-1">Affected: {formatCount(alert.affectedCount)}</span>
                        <button type="button" onClick={() => onAlertAction(alert)} className="rounded-full bg-blue-50 px-2.5 py-1 text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100">
                            {alertActionLabel(alert)}
                        </button>
                        {canUseReminder && (
                            <button
                                type="button"
                                onClick={() => onRequestReminders({
                                    title: 'Send alert reminder?',
                                    description: 'This will send reminders only to the pending evaluator assignments that match this alert scope.',
                                    request: scopedReminderFromAlert(alert),
                                })}
                                disabled={!canSendReminders}
                                title={canSendReminders ? 'Send reminders for this alert scope.' : 'Reminders are only available while the campaign is active.'}
                                className="rounded-full bg-slate-100 px-2.5 py-1 text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                            >
                                Send reminder
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}


function EvaluatorWorkloadSection({
                                      sectionRef,
                                      filterPreset,
                                      monitoring,
                                      reminderHistory,
                                      reminderSending,
                                      reminderMessage,
                                      reminderError,
                                      lastReminderResult,
                                      onSendReminders,
                                      onRefreshHistory,
                                      onRequestEvaluatorReminder,
                                  }: {
    sectionRef?: RefObject<HTMLElement | null>;
    filterPreset?: EvaluatorFilterPreset | null;
    monitoring: FeedbackCampaignMonitoringResponse;
    reminderHistory: FeedbackReminderHistoryItem[];
    reminderSending: boolean;
    reminderMessage: string;
    reminderError: string;
    lastReminderResult: FeedbackReminderResponse | null;
    onSendReminders: () => void;
    onRefreshHistory: () => void;
    onRequestEvaluatorReminder: (evaluator: EvaluatorWorkload) => void;
}) {
    const [search, setSearch] = useState('');
    const [workloadFilter, setWorkloadFilter] = useState<EvaluatorWorkloadFilter>('ALL');
    const [relationshipFilter, setRelationshipFilter] = useState<EvaluatorRelationshipFilter>('ALL');

    const evaluators = monitoring.evaluators ?? [];
    const campaignStatus = String(monitoring.campaignStatus ?? '').toUpperCase();
    const canSendReminders = campaignStatus === 'ACTIVE' && Number(monitoring.overview.pendingCount ?? 0) > 0;
    const heavyCount = evaluators.filter((item) => ['HEAVY', 'OVERLOADED'].includes(String(item.workloadStatus ?? '').toUpperCase())).length;
    const overloadedCount = evaluators.filter((item) => String(item.workloadStatus ?? '').toUpperCase() === 'OVERLOADED').length;
    const pendingEvaluatorCount = evaluators.filter((item) => Number(item.pendingCount ?? 0) > 0).length;
    const overdueEvaluatorCount = evaluators.filter((item) => Number(item.overdueCount ?? 0) > 0).length;

    const filteredEvaluators = useMemo(
        () =>
            evaluators.filter((evaluator) => {
                if (!hasEvaluatorSearchMatch(evaluator, search)) return false;
                if (!hasEvaluatorWorkloadFilterMatch(evaluator, workloadFilter)) return false;
                return hasEvaluatorRelationshipFilterMatch(evaluator, relationshipFilter);
            }),
        [evaluators, relationshipFilter, search, workloadFilter],
    );

    const activeFilterCount = [search.trim(), workloadFilter !== 'ALL', relationshipFilter !== 'ALL'].filter(Boolean).length;
    const clearFilters = () => {
        setSearch('');
        setWorkloadFilter('ALL');
        setRelationshipFilter('ALL');
    };
    const disabledReason = campaignStatus !== 'ACTIVE'
        ? 'Reminders are available only while the campaign is active.'
        : Number(monitoring.overview.pendingCount ?? 0) <= 0
            ? 'No pending evaluator assignments need reminders.'
            : '';

    useEffect(() => {
        if (!filterPreset) return;
        setSearch(filterPreset.search ?? '');
        setWorkloadFilter(filterPreset.workloadFilter ?? 'ALL');
        setRelationshipFilter(filterPreset.relationshipFilter ?? 'ALL');
    }, [filterPreset?.token]);

    return (
        <article ref={sectionRef} className="min-w-0 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Evaluator workload</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">Pending evaluators and reminders</h2>
                    <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-500">
                        Track evaluator workload, pending assignments, overdue items, and reminder history without exposing scores or comments.
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 xl:justify-end">
                    <Badge label={`${formatCount(filteredEvaluators.length)} shown`} tone="blue" />
                    <Badge label={`${formatCount(evaluators.length)} evaluators`} tone="slate" />
                    {heavyCount > 0 && <Badge label={`${formatCount(heavyCount)} heavy`} tone={overloadedCount > 0 ? 'red' : 'amber'} />}
                    <button
                        type="button"
                        onClick={onSendReminders}
                        disabled={!canSendReminders || reminderSending}
                        className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                        title={disabledReason || 'Send reminders to pending evaluators'}
                    >
                        {reminderSending ? <i className="bi bi-arrow-repeat f360-monitoring-spin" /> : <i className="bi bi-send" />}
                        {reminderSending ? 'Sending...' : 'Send reminders'}
                    </button>
                    <button
                        type="button"
                        onClick={onRefreshHistory}
                        className="inline-flex h-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                    >
                        Refresh
                    </button>
                </div>
            </div>

            <div className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-4">
                <EvaluatorMiniMetric label="Pending evaluators" value={pendingEvaluatorCount} tone={pendingEvaluatorCount > 0 ? 'amber' : 'emerald'} />
                <EvaluatorMiniMetric label="Overdue evaluators" value={overdueEvaluatorCount} tone={overdueEvaluatorCount > 0 ? 'red' : 'slate'} />
                <EvaluatorMiniMetric label="Heavy workload" value={heavyCount} tone={heavyCount > 0 ? 'amber' : 'emerald'} />
                <EvaluatorMiniMetric label="Overloaded" value={overloadedCount} tone={overloadedCount > 0 ? 'red' : 'slate'} />
            </div>

            {heavyCount > 0 && (
                <div className="mt-3 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-bold leading-5 text-amber-800">
                    <i className="bi bi-exclamation-triangle mr-2" />
                    {overloadedCount > 0
                        ? `${formatCount(overloadedCount)} evaluator${overloadedCount === 1 ? '' : 's'} are overloaded.`
                        : `${formatCount(heavyCount)} evaluator${heavyCount === 1 ? '' : 's'} have a heavy pending workload.`}
                </div>
            )}

            <EvaluatorFilters
                search={search}
                onSearchChange={setSearch}
                workloadFilter={workloadFilter}
                onWorkloadFilterChange={setWorkloadFilter}
                relationshipFilter={relationshipFilter}
                onRelationshipFilterChange={setRelationshipFilter}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
            />

            {evaluators.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
                    Evaluator workload will appear after assignments are generated.
                </div>
            ) : filteredEvaluators.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
                    No evaluators match the selected workload filters.
                </div>
            ) : (
                <div className="f360-monitoring-target-table mt-3 max-w-full overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-[1040px] border-separate border-spacing-0 text-left">
                        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                            <th className="px-3 py-2">Evaluator</th>
                            <th className="px-3 py-2">Relationships</th>
                            <th className="px-3 py-2">Targets</th>
                            <th className="px-3 py-2">Progress</th>
                            <th className="px-3 py-2">Pending</th>
                            <th className="px-3 py-2">Overdue</th>
                            <th className="px-3 py-2">Workload</th>
                            <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredEvaluators.map((evaluator) => (
                            <EvaluatorWorkloadRow
                                key={`${evaluator.evaluatorEmployeeId}-${evaluator.evaluatorEmployeeName}`}
                                evaluator={evaluator}
                                canSendReminders={canSendReminders}
                                onRequestReminder={onRequestEvaluatorReminder}
                            />
                        ))}
                        </tbody>
                    </table>
                </div>
            )}

            {(disabledReason || reminderMessage || reminderError || lastReminderResult || reminderHistory.length > 0) && (
                <div className="mt-3 grid gap-2">
                    {disabledReason && <p className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold leading-5 text-slate-500">{disabledReason}</p>}
                    {reminderMessage && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-700">{reminderMessage}</p>}
                    {reminderError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">{reminderError}</p>}
                    {lastReminderResult && (
                        <p className="rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-xs font-bold leading-5 text-blue-700">
                            Pending {formatCount(lastReminderResult.pendingAssignmentCount)} · Notified {formatCount(lastReminderResult.notifiedEvaluatorCount)} · Skipped {formatCount(lastReminderResult.skippedAssignmentCount)}
                        </p>
                    )}
                    {reminderHistory.length > 0 && (
                        <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                            <div className="mb-2 flex items-center justify-between gap-3">
                                <span className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Reminder history</span>
                                <Badge label={`${formatCount(reminderHistory.length)} record${reminderHistory.length === 1 ? '' : 's'}`} tone="slate" />
                            </div>
                            <div className="grid gap-2 lg:grid-cols-2">
                                {reminderHistory.slice(0, 4).map((item) => (
                                    <ReminderHistoryRow key={item.id} item={item} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </article>
    );
}

function EvaluatorMiniMetric({ label, value, tone }: { label: string; value: number; tone: Tone }) {
    return (
        <div className={`rounded-xl border ${toneClasses[tone].border} bg-slate-50 px-3 py-2`}>
            <span className="block truncate text-[10px] font-black uppercase tracking-wide text-slate-500">{label}</span>
            <strong className={`mt-0.5 block text-sm font-black ${toneClasses[tone].text}`}>{formatCount(value)}</strong>
        </div>
    );
}

function EvaluatorFilters({
                              search,
                              onSearchChange,
                              workloadFilter,
                              onWorkloadFilterChange,
                              relationshipFilter,
                              onRelationshipFilterChange,
                              activeFilterCount,
                              onClearFilters,
                          }: {
    search: string;
    onSearchChange: (value: string) => void;
    workloadFilter: EvaluatorWorkloadFilter;
    onWorkloadFilterChange: (value: EvaluatorWorkloadFilter) => void;
    relationshipFilter: EvaluatorRelationshipFilter;
    onRelationshipFilterChange: (value: EvaluatorRelationshipFilter) => void;
    activeFilterCount: number;
    onClearFilters: () => void;
}) {
    return (
        <div className="mt-3 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="f360-monitoring-evaluator-filter-grid">
                <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">Search</span>
                    <div className="relative min-w-0">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Evaluator, code, target..."
                            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                    </div>
                </label>
                <TargetFilterSelect label="Workload" value={workloadFilter} onChange={(value) => onWorkloadFilterChange(value as EvaluatorWorkloadFilter)}>
                    {EVALUATOR_WORKLOAD_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </TargetFilterSelect>
                <TargetFilterSelect label="Relationship" value={relationshipFilter} onChange={(value) => onRelationshipFilterChange(value as EvaluatorRelationshipFilter)}>
                    {EVALUATOR_RELATIONSHIP_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </TargetFilterSelect>
                <div className="flex min-w-0 items-end">
                    <button
                        type="button"
                        onClick={onClearFilters}
                        disabled={activeFilterCount === 0}
                        className="h-[38px] w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}

function EvaluatorWorkloadRow({
                                  evaluator,
                                  canSendReminders,
                                  onRequestReminder,
                              }: {
    evaluator: EvaluatorWorkload;
    canSendReminders: boolean;
    onRequestReminder: (evaluator: EvaluatorWorkload) => void;
}) {
    const workload = String(evaluator.workloadStatus ?? 'NORMAL').toUpperCase();
    const tone = resolveTone(workload, workloadTone, 'slate');
    const percent = clampPercent(evaluator.completionPercent);
    const relationshipEntries = RELATIONSHIP_ORDER
        .map((relationship) => ({ relationship, count: Number((evaluator.relationshipCounts ?? {})[relationship] ?? 0) }))
        .filter((item) => item.count > 0);
    const shownTargets = (evaluator.targetNames ?? []).slice(0, 2);
    const extraTargets = Math.max(0, (evaluator.targetNames ?? []).length - shownTargets.length);

    return (
        <tr className="align-middle text-sm text-slate-700 hover:bg-slate-50/70">
            <td className="px-3 py-2.5">
                <div className="min-w-0">
                    <strong className="block max-w-[190px] truncate font-black text-slate-950">{evaluator.evaluatorEmployeeName || 'Unnamed evaluator'}</strong>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-black text-slate-500">
                        {evaluator.evaluatorEmployeeCode && <span className="rounded-full bg-slate-100 px-2 py-0.5">{evaluator.evaluatorEmployeeCode}</span>}
                        {evaluator.positionName && <span className="rounded-full bg-slate-100 px-2 py-0.5">{evaluator.positionName}</span>}
                    </div>
                </div>
            </td>
            <td className="px-3 py-2.5">
                <div className="flex max-w-[200px] flex-wrap gap-1">
                    {relationshipEntries.length === 0 ? (
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">None</span>
                    ) : relationshipEntries.map((item) => (
                        <span key={item.relationship} className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-600">
                            {relationshipLabelFromKey(item.relationship)} {item.count}
                        </span>
                    ))}
                </div>
            </td>
            <td className="px-3 py-2.5">
                <p className="max-w-[220px] truncate text-xs font-semibold text-slate-600" title={(evaluator.targetNames ?? []).join(', ')}>
                    {shownTargets.length ? shownTargets.join(', ') : 'No targets'}{extraTargets > 0 ? ` +${extraTargets} more` : ''}
                </p>
                <p className="mt-1 text-[10px] font-bold text-slate-400">Last: {formatDateTime(evaluator.lastActivityAt)}</p>
            </td>
            <td className="px-3 py-2.5">
                <div className="flex min-w-[130px] items-center gap-2">
                    <div className="h-2 w-24 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                        <div className={`h-full rounded-full ${toneClasses[tone].bar}`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={`text-xs font-black ${toneClasses[tone].text}`}>{formatPercent(percent)}</span>
                </div>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{formatCount(evaluator.submittedCount)} / {formatCount(evaluator.assignedCount)} submitted</p>
            </td>
            <td className="px-3 py-2.5 font-black text-slate-700">{formatCount(evaluator.pendingCount)}</td>
            <td className={`px-3 py-2.5 font-black ${Number(evaluator.overdueCount ?? 0) > 0 ? 'text-red-700' : 'text-slate-500'}`}>{formatCount(evaluator.overdueCount)}</td>
            <td className="px-3 py-2.5"><Badge label={workloadBadgeLabel(workload)} tone={tone} /></td>
            <td className="px-3 py-2.5 text-right">
                {Number(evaluator.pendingCount ?? 0) > 0 ? (
                    <button
                        type="button"
                        onClick={() => onRequestReminder(evaluator)}
                        disabled={!canSendReminders}
                        title={canSendReminders ? 'Send a reminder only to this evaluator.' : 'Evaluator reminders are only available while this campaign is active.'}
                        className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400 disabled:ring-slate-200"
                    >
                        Remind
                    </button>
                ) : (
                    <span className="text-xs font-black text-slate-400">Done</span>
                )}
            </td>
        </tr>
    );
}

function ReminderHistoryRow({ item }: { item: FeedbackReminderHistoryItem }) {
    const action = String(item.action ?? '').toUpperCase();
    const title = reminderActionLabels[action] ?? labelFromValue(action);
    const pending = parseReminderMetric(item.newValue, 'pendingAssignments');
    const notified = parseReminderMetric(item.newValue, 'notifiedUsers') ?? parseReminderMetric(item.newValue, 'notifiedAssignments');
    const skipped = parseReminderMetric(item.newValue, 'skippedAssignments');
    const scope = parseReminderText(item.newValue, 'scope');
    const relationship = parseReminderText(item.newValue, 'relationshipType');
    const tone: Tone = action.includes('OVERDUE') ? 'red' : 'blue';

    return (
        <div className="rounded-xl border border-slate-200 bg-white p-2 text-xs shadow-sm">
            <div className="flex min-w-0 items-start justify-between gap-2">
                <div className="min-w-0">
                    <strong className="block truncate text-sm font-black text-slate-900">{title}</strong>
                    <span className="mt-0.5 block font-semibold text-slate-500">{formatDateTime(item.timestamp)}</span>
                </div>
                <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-black uppercase tracking-wide ${toneClasses[tone].soft}`}>
                    {action.includes('OVERDUE') ? 'Overdue' : 'Pending'}
                </span>
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5 font-black text-slate-500">
                {scope && <span className="rounded-full bg-blue-50 px-2 py-1 text-blue-700">Scope: {labelFromValue(scope)}</span>}
                {relationship && <span className="rounded-full bg-slate-100 px-2 py-1">{relationshipLabelFromKey(relationship)}</span>}
                {pending !== null && <span className="rounded-full bg-slate-100 px-2 py-1">Pending: {formatCount(pending)}</span>}
                {notified !== null && <span className="rounded-full bg-slate-100 px-2 py-1">Notified: {formatCount(notified)}</span>}
                {skipped !== null && <span className="rounded-full bg-slate-100 px-2 py-1">Skipped: {formatCount(skipped)}</span>}
            </div>
            {item.reason && <p className="mt-2 font-semibold leading-5 text-slate-500">{item.reason}</p>}
        </div>
    );
}

function ReminderConfirmDialog({
                                   open,
                                   pendingCount,
                                   sending,
                                   title,
                                   description,
                                   onCancel,
                                   onConfirm,
                               }: {
    open: boolean;
    pendingCount: number;
    sending: boolean;
    title?: string;
    description?: string;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/35 p-4" role="dialog" aria-modal="true">
            <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-5 shadow-2xl">
                <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-blue-50 text-blue-600 ring-1 ring-blue-100">
                        <i className="bi bi-send" />
                    </span>
                    <div className="min-w-0">
                        <h3 className="text-lg font-black text-slate-950">{title || 'Send campaign reminder?'}</h3>
                        <p className="mt-1 text-sm font-semibold leading-6 text-slate-500">
                            {description || 'This will send one campaign-level reminder to all pending evaluators in this campaign.'}
                        </p>
                        <p className="mt-2 rounded-2xl bg-slate-50 px-3 py-2 text-sm font-black text-slate-700">
                            Pending assignments: {formatCount(pendingCount)}
                        </p>
                    </div>
                </div>
                <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onCancel}
                        disabled={sending}
                        className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={sending}
                        className="rounded-2xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white transition hover:bg-blue-700 disabled:bg-slate-300"
                    >
                        {sending ? 'Sending...' : 'Send reminder'}
                    </button>
                </div>
            </div>
        </div>
    );
}

function CloseCampaignConfirmDialog({
                                        open,
                                        monitoring,
                                        closing,
                                        acknowledged,
                                        reason,
                                        onAcknowledgedChange,
                                        onReasonChange,
                                        onCancel,
                                        onConfirm,
                                    }: {
    open: boolean;
    monitoring: FeedbackCampaignMonitoringResponse;
    closing: boolean;
    acknowledged: boolean;
    reason: string;
    onAcknowledgedChange: (value: boolean) => void;
    onReasonChange: (value: string) => void;
    onCancel: () => void;
    onConfirm: () => void;
}) {
    if (!open) return null;

    const readiness = monitoring.closeReadiness;
    const withWarnings = Boolean(readiness?.requiresAcknowledgement || readiness?.canCloseWithWarnings);
    const warningItems = (readiness?.checklist ?? []).filter((item) => String(item.status).toUpperCase() === 'WARNING').slice(0, 4);
    const confirmDisabled = closing || (withWarnings && !acknowledged);

    return (
        <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-950/40 px-3 py-4 sm:px-4" role="dialog" aria-modal="true">
            <div className="mx-auto flex min-h-full w-full max-w-2xl items-center justify-center">
                <div className="flex max-h-[calc(100vh-2rem)] w-full flex-col overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
                    <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-5">
                        <div className="flex items-start gap-3">
                            <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-2xl ${withWarnings ? 'bg-amber-50 text-amber-600 ring-amber-100' : 'bg-emerald-50 text-emerald-600 ring-emerald-100'} ring-1`}>
                                <i className={`bi ${withWarnings ? 'bi-exclamation-triangle-fill' : 'bi-check2-circle'}`} />
                            </span>
                            <div className="min-w-0 flex-1">
                                <div className="flex min-w-0 items-start justify-between gap-3">
                                    <div className="min-w-0">
                                        <h3 className="text-lg font-black text-slate-950">
                                            {withWarnings ? 'Close campaign with warnings?' : 'Close campaign?'}
                                        </h3>
                                        <p className="mt-1 text-sm font-semibold leading-5 text-slate-500">
                                            Closing locks feedback collection. Pending evaluators cannot submit after the campaign is closed. Results are not published.
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={onCancel}
                                        disabled={closing}
                                        className="grid h-9 w-9 shrink-0 place-items-center rounded-full border border-slate-200 bg-white text-slate-500 transition hover:bg-slate-50 hover:text-slate-800 disabled:opacity-50"
                                        aria-label="Close dialog"
                                    >
                                        <i className="bi bi-x-lg" />
                                    </button>
                                </div>
                                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                                    <CloseReadinessMetric label="Pending" value={readiness?.pendingAssignments ?? 0} tone={(readiness?.pendingAssignments ?? 0) > 0 ? 'amber' : 'emerald'} />
                                    <CloseReadinessMetric label="Overdue" value={readiness?.overdueAssignments ?? 0} tone={(readiness?.overdueAssignments ?? 0) > 0 ? 'red' : 'emerald'} />
                                    <CloseReadinessMetric label="Privacy risks" value={readiness?.privacyRiskTargets ?? 0} tone={(readiness?.privacyRiskTargets ?? 0) > 0 ? 'amber' : 'emerald'} />
                                </div>
                            </div>
                        </div>

                        {warningItems.length > 0 && (
                            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-3">
                                <p className="text-xs font-black uppercase tracking-[0.14em] text-amber-700">Warnings to acknowledge</p>
                                <ul className="mt-2 grid gap-1.5">
                                    {warningItems.map((item) => (
                                        <li key={item.key || item.title} className="flex gap-2 text-xs font-bold leading-5 text-amber-800">
                                            <i className="bi bi-dot shrink-0" />
                                            <span>{item.message}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}

                        <label className="mt-4 block">
                            <span className="mb-1.5 block text-xs font-black uppercase tracking-[0.14em] text-slate-500">Close note optional</span>
                            <textarea
                                value={reason}
                                onChange={(event) => onReasonChange(event.target.value)}
                                rows={2}
                                maxLength={1000}
                                placeholder="Example: HR reviewed remaining pending assignments before closing."
                                className="w-full resize-none rounded-2xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                            />
                        </label>

                        {withWarnings && (
                            <label className="mt-4 flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm font-bold leading-5 text-slate-600">
                                <input
                                    type="checkbox"
                                    checked={acknowledged}
                                    onChange={(event) => onAcknowledgedChange(event.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                />
                                <span>I understand that pending evaluators can no longer submit feedback after this campaign is closed.</span>
                            </label>
                        )}
                    </div>

                    <div className="shrink-0 border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_24px_rgba(15,23,42,0.06)] sm:p-4">
                        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                            <button
                                type="button"
                                onClick={onCancel}
                                disabled={closing}
                                className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                disabled={confirmDisabled}
                                className={`rounded-2xl px-4 py-2.5 text-sm font-black text-white transition disabled:bg-slate-300 ${withWarnings ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-950 hover:bg-slate-800'}`}
                            >
                                {closing ? 'Closing...' : withWarnings ? 'Close with warnings' : 'Close campaign'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function ActivityTimelineExportSection({
                                           activity,
                                           onRefresh,
                                       }: {
    activity: MonitoringActivityItem[];
    onRefresh: () => void;
}) {
    const [expanded, setExpanded] = useState(false);
    const rows = expanded ? activity : activity.slice(0, 5);
    const hiddenCount = Math.max(0, activity.length - rows.length);

    return (
        <article className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Activity timeline</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">Operational campaign history</h2>
                    <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-500">
                        Tracks setup, assignment, reminder, close, publish, and export events. Ratings and comments are never shown here.
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onRefresh}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                    Refresh
                </button>
            </div>

            {activity.length === 0 ? (
                <div className="mt-4 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
                    No operational activity has been recorded for this campaign yet.
                </div>
            ) : (
                <div className="mt-4 grid gap-2">
                    {rows.map((item, index) => (
                        <ActivityTimelineRow key={`${item.id ?? index}-${item.activityType}-${item.occurredAt ?? index}`} activity={item} />
                    ))}
                </div>
            )}

            {activity.length > 5 && (
                <button
                    type="button"
                    onClick={() => setExpanded((current) => !current)}
                    className="mt-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
                >
                    {expanded ? 'Show fewer activity records' : `Show ${hiddenCount} more activity record${hiddenCount === 1 ? '' : 's'}`}
                </button>
            )}
        </article>
    );
}

function ActivityTimelineRow({ activity }: { activity: MonitoringActivityItem }) {
    const tone = activityTone(activity);
    return (
        <div className="grid min-w-0 grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-xl border border-slate-200 bg-slate-50/80 p-3">
            <span className={`mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl ring-1 ${toneClasses[tone].icon}`}>
                <i className={`bi ${activityIcon(activity.activityType)}`} />
            </span>
            <div className="min-w-0">
                <div className="flex min-w-0 flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                        <strong className="block truncate text-sm font-black text-slate-950">{activity.title || labelFromValue(activity.activityType)}</strong>
                        <span className="mt-0.5 block text-xs font-bold text-slate-500">{formatDateTime(activity.occurredAt)}</span>
                    </div>
                    <Badge label={labelFromValue(String(activity.severity ?? 'INFO'))} tone={tone} />
                </div>
                <p className="mt-1 line-clamp-2 text-xs font-semibold leading-5 text-slate-600">{activity.message || 'Campaign activity was recorded.'}</p>
                <div className="mt-2 flex flex-wrap gap-1.5 text-[10px] font-black uppercase tracking-wide text-slate-500">
                    {activity.actorName && <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">By {activity.actorName}</span>}
                    {activity.actorRole && <span className="rounded-full bg-white px-2 py-1 ring-1 ring-slate-200">{activity.actorRole}</span>}
                    {activity.metadata && <span className="max-w-full truncate rounded-full bg-white px-2 py-1 normal-case tracking-normal ring-1 ring-slate-200" title={activity.metadata}>{activity.metadata}</span>}
                </div>
            </div>
        </div>
    );
}

function TargetHealthTable({
                               targets,
                               sectionRef,
                               filterPreset,
                               canSendReminders,
                               onViewEvaluators,
                               onRequestReminders,
                           }: {
    targets: TargetHealth[];
    sectionRef?: RefObject<HTMLElement | null>;
    filterPreset?: TargetFilterPreset | null;
    canSendReminders: boolean;
    onViewEvaluators: (target: TargetHealth) => void;
    onRequestReminders: (intent?: ReminderIntent) => void;
}) {
    const [search, setSearch] = useState('');
    const [department, setDepartment] = useState('ALL');
    const [health, setHealth] = useState('ALL');
    const [relationshipFilter, setRelationshipFilter] = useState<TargetRelationshipFilter>('ALL');
    const [readyFilter, setReadyFilter] = useState<TargetReadyFilter>('ALL');

    const departmentOptions = useMemo(() => sortTargetOptions(targets.map((target) => target.departmentName)), [targets]);
    const healthOptions = useMemo(() => sortTargetOptions(targets.map((target) => target.healthStatus)), [targets]);
    const filteredTargets = useMemo(
        () =>
            targets.filter((target) => {
                if (!hasSearchMatch(target, search)) return false;
                if (department !== 'ALL' && target.departmentName !== department) return false;
                if (health !== 'ALL' && String(target.healthStatus).toUpperCase() !== health) return false;
                if (readyFilter === 'READY' && !target.readyToClose) return false;
                if (readyFilter === 'NOT_READY' && target.readyToClose) return false;
                return hasTargetRelationshipFilterMatch(target, relationshipFilter);
            }),
        [department, health, readyFilter, relationshipFilter, search, targets],
    );
    const activeFilterCount = [search.trim(), department !== 'ALL', health !== 'ALL', relationshipFilter !== 'ALL', readyFilter !== 'ALL'].filter(Boolean).length;
    const clearFilters = () => {
        setSearch('');
        setDepartment('ALL');
        setHealth('ALL');
        setRelationshipFilter('ALL');
        setReadyFilter('ALL');
    };

    useEffect(() => {
        if (!filterPreset) return;
        setSearch(filterPreset.search ?? '');
        setDepartment(filterPreset.department ?? 'ALL');
        setHealth(filterPreset.health ?? 'ALL');
        setRelationshipFilter(filterPreset.relationshipFilter ?? 'ALL');
        setReadyFilter(filterPreset.readyFilter ?? 'ALL');
    }, [filterPreset?.token]);

    return (
        <article ref={sectionRef} className="min-w-0 scroll-mt-24 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex min-w-0 flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
                <div className="min-w-0">
                    <p className="text-xs font-black uppercase tracking-[0.14em] text-slate-500">Target health</p>
                    <h2 className="mt-1 text-lg font-black text-slate-950">Target-by-target monitoring</h2>
                    <p className="mt-1 max-w-3xl text-xs font-semibold leading-5 text-slate-500">
                        Review each target by relationship completion, required coverage, anonymity readiness, and next HR action.
                    </p>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                    <Badge label={`${formatCount(filteredTargets.length)} shown`} tone="blue" />
                    <Badge label={`${formatCount(targets.length)} total`} tone="slate" />
                </div>
            </div>

            <TargetHealthFilters
                search={search}
                onSearchChange={setSearch}
                department={department}
                onDepartmentChange={setDepartment}
                departmentOptions={departmentOptions}
                health={health}
                onHealthChange={setHealth}
                healthOptions={healthOptions}
                relationshipFilter={relationshipFilter}
                onRelationshipFilterChange={setRelationshipFilter}
                readyFilter={readyFilter}
                onReadyFilterChange={setReadyFilter}
                activeFilterCount={activeFilterCount}
                onClearFilters={clearFilters}
            />

            {targets.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
                    Target health will appear after campaign targets and evaluator assignments are available.
                </div>
            ) : filteredTargets.length === 0 ? (
                <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 p-4 text-sm font-semibold leading-6 text-slate-500">
                    No targets match the selected filters. Clear filters or choose a different status.
                </div>
            ) : (
                <div className="f360-monitoring-target-table mt-3 max-w-full overflow-x-auto rounded-2xl border border-slate-200">
                    <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left">
                        <thead className="bg-slate-50 text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
                        <tr>
                            <th className="px-3 py-2">Employee</th>
                            <th className="px-3 py-2">Department</th>
                            <th className="px-3 py-2">Reports to</th>
                            <th className="px-3 py-2">Manager review</th>
                            <th className="px-3 py-2">Peer</th>
                            <th className="px-3 py-2">Subordinate</th>
                            <th className="px-3 py-2">Self</th>
                            <th className="px-3 py-2">Coverage</th>
                            <th className="px-3 py-2">Health</th>
                            <th className="px-3 py-2 text-right">Action</th>
                        </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 bg-white">
                        {filteredTargets.map((target) => (
                            <TargetHealthCard
                                key={`${target.feedbackRequestId ?? target.targetEmployeeId}-${target.targetEmployeeName}`}
                                target={target}
                                canSendReminders={canSendReminders}
                                onViewEvaluators={onViewEvaluators}
                                onRequestReminders={onRequestReminders}
                            />
                        ))}
                        </tbody>
                    </table>
                </div>
            )}
        </article>
    );
}

function TargetHealthFilters({
                                 search,
                                 onSearchChange,
                                 department,
                                 onDepartmentChange,
                                 departmentOptions,
                                 health,
                                 onHealthChange,
                                 healthOptions,
                                 relationshipFilter,
                                 onRelationshipFilterChange,
                                 readyFilter,
                                 onReadyFilterChange,
                                 activeFilterCount,
                                 onClearFilters,
                             }: {
    search: string;
    onSearchChange: (value: string) => void;
    department: string;
    onDepartmentChange: (value: string) => void;
    departmentOptions: string[];
    health: string;
    onHealthChange: (value: string) => void;
    healthOptions: string[];
    relationshipFilter: TargetRelationshipFilter;
    onRelationshipFilterChange: (value: TargetRelationshipFilter) => void;
    readyFilter: TargetReadyFilter;
    onReadyFilterChange: (value: TargetReadyFilter) => void;
    activeFilterCount: number;
    onClearFilters: () => void;
}) {
    return (
        <div className="mt-3 min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <div className="f360-monitoring-filter-grid">
                <label className="min-w-0">
                    <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">Search</span>
                    <div className="relative min-w-0">
                        <i className="bi bi-search absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                            value={search}
                            onChange={(event) => onSearchChange(event.target.value)}
                            placeholder="Employee, department, manager..."
                            className="w-full min-w-0 rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                        />
                    </div>
                </label>
                <TargetFilterSelect label="Department" value={department} onChange={onDepartmentChange}>
                    <option value="ALL">All departments</option>
                    {departmentOptions.map((option) => (
                        <option key={option} value={option}>{option}</option>
                    ))}
                </TargetFilterSelect>
                <TargetFilterSelect label="Health" value={health} onChange={onHealthChange}>
                    <option value="ALL">All health statuses</option>
                    {healthOptions.map((option) => (
                        <option key={option} value={option}>{healthLabels[option] ?? labelFromValue(option)}</option>
                    ))}
                </TargetFilterSelect>
                <TargetFilterSelect label="Relationship" value={relationshipFilter} onChange={(value) => onRelationshipFilterChange(value as TargetRelationshipFilter)}>
                    {TARGET_RELATIONSHIP_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </TargetFilterSelect>
                <TargetFilterSelect label="Readiness" value={readyFilter} onChange={(value) => onReadyFilterChange(value as TargetReadyFilter)}>
                    {TARGET_READY_FILTERS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                </TargetFilterSelect>
                <div className="flex min-w-0 items-end">
                    <button
                        type="button"
                        onClick={onClearFilters}
                        disabled={activeFilterCount === 0}
                        className="h-[38px] w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-black text-slate-600 transition hover:border-slate-300 hover:bg-slate-100 disabled:cursor-not-allowed disabled:text-slate-400"
                    >
                        Clear
                    </button>
                </div>
            </div>
        </div>
    );
}

function TargetFilterSelect({
                                label,
                                value,
                                onChange,
                                children,
                            }: {
    label: string;
    value: string;
    onChange: (value: string) => void;
    children: ReactNode;
}) {
    return (
        <label className="min-w-0">
            <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.13em] text-slate-500">{label}</span>
            <select
                value={value}
                onChange={(event) => onChange(event.target.value)}
                className="w-full min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
            >
                {children}
            </select>
        </label>
    );
}

function TargetHealthCard({
                              target,
                              canSendReminders,
                              onViewEvaluators,
                              onRequestReminders,
                          }: {
    target: TargetHealth;
    canSendReminders: boolean;
    onViewEvaluators: (target: TargetHealth) => void;
    onRequestReminders: (intent?: ReminderIntent) => void;
}) {
    const health = String(target.healthStatus ?? 'ON_TRACK').toUpperCase();
    const healthBadgeTone = resolveTone(health, healthTone);
    const percent = clampPercent(target.requiredCoveragePercent);
    const coverageTone: Tone = percent >= 100 ? 'emerald' : percent >= 67 ? 'blue' : percent > 0 ? 'amber' : 'red';
    const hasPending = Number(target.pendingCount ?? 0) > 0;

    return (
        <tr className="align-middle text-sm text-slate-700 hover:bg-slate-50/70">
            <td className="px-3 py-2.5">
                <div className="min-w-0">
                    <strong className="block max-w-[190px] truncate font-black text-slate-950">{target.targetEmployeeName || 'Unnamed employee'}</strong>
                    <div className="mt-1 flex flex-wrap gap-1 text-[10px] font-black text-slate-500">
                        {target.targetEmployeeCode && <span className="rounded-full bg-slate-100 px-2 py-0.5">{target.targetEmployeeCode}</span>}
                        <span className="rounded-full bg-slate-100 px-2 py-0.5">Last: {formatDateTime(target.lastActivityAt)}</span>
                    </div>
                </div>
            </td>
            <td className="px-3 py-2.5">
                <span className="block max-w-[140px] truncate text-xs font-bold text-slate-600" title={target.departmentName || ''}>{target.departmentName || '-'}</span>
                <span className="mt-1 block max-w-[140px] truncate text-[10px] font-bold text-slate-400" title={target.positionName || ''}>{target.positionName || 'Position not set'}</span>
            </td>
            <td className="px-3 py-2.5">
                <span className="block max-w-[140px] truncate text-xs font-bold text-slate-600" title={target.managerName || ''}>{target.managerName || '-'}</span>
            </td>
            {RELATIONSHIP_ORDER.map((relationshipType) => (
                <td key={relationshipType} className="px-3 py-2.5">
                    <TargetRelationshipStatusCell relationshipType={relationshipType} relationship={getTargetRelationship(target, relationshipType)} />
                </td>
            ))}
            <td className="px-3 py-2.5">
                <div className="flex min-w-[125px] items-center gap-2">
                    <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100 ring-1 ring-slate-200">
                        <div className={`h-full rounded-full ${toneClasses[coverageTone].bar}`} style={{ width: `${percent}%` }} />
                    </div>
                    <span className={`text-xs font-black ${toneClasses[coverageTone].text}`}>{formatPercent(percent)}</span>
                </div>
                <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-slate-500">{formatCount(target.submittedCount)} / {formatCount(target.assignedCount)} submitted</p>
            </td>
            <td className="px-3 py-2.5">
                <Badge label={healthLabels[health] ?? labelFromValue(health)} tone={healthBadgeTone} />
                {!target.privacyCoveragePassed && <p className="mt-1 text-[10px] font-black uppercase tracking-wide text-amber-700">Anonymity risk</p>}
            </td>
            <td className="px-3 py-2.5 text-right">
                <div className="flex justify-end gap-1.5">
                    <button type="button" onClick={() => onViewEvaluators(target)} className="rounded-xl bg-blue-50 px-3 py-1.5 text-xs font-black text-blue-700 ring-1 ring-blue-100 transition hover:bg-blue-100">
                        Evaluators
                    </button>
                    {hasPending && (
                        <button
                            type="button"
                            onClick={() => onRequestReminders({
                                title: 'Send target reminder?',
                                description: `This will send reminders only to pending evaluators assigned to ${target.targetEmployeeName || 'this target'}.`,
                                request: {
                                    scope: 'TARGET',
                                    targetEmployeeId: target.targetEmployeeId,
                                    onlyOverdue: false,
                                },
                            })}
                            disabled={!canSendReminders}
                            title={canSendReminders ? 'Send reminders only for this target.' : 'Target reminders are only available while this campaign is active.'}
                            className="rounded-xl bg-slate-100 px-3 py-1.5 text-xs font-black text-slate-700 ring-1 ring-slate-200 transition hover:bg-slate-200 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            Remind
                        </button>
                    )}
                </div>
            </td>
        </tr>
    );
}

function TargetRelationshipStatusCell({
                                          relationshipType,
                                          relationship,
                                      }: {
    relationshipType: string;
    relationship?: TargetRelationshipStatus;
}) {
    const label = relationshipType === 'SUBORDINATE' ? 'Sub' : labelFromValue(relationshipType);
    if (!relationship) {
        return <span className="rounded-full bg-slate-100 px-2 py-1 text-[10px] font-black text-slate-500">Not assigned</span>;
    }

    const status = String(relationship.status ?? 'PENDING').toUpperCase();
    const tone = resolveTone(status, targetRelationshipStatusTone, 'slate');
    const statusLabel = targetRelationshipStatusLabels[status] ?? labelFromValue(status);
    const minimum = Number(relationship.minimumResponses ?? 1);
    const protectedText = relationship.protectedRelationship ? ` · min ${minimum}` : '';

    return (
        <div className="min-w-[96px]">
            <span
                className={`inline-flex rounded-full px-2 py-1 text-[10px] font-black uppercase tracking-wide ${toneClasses[tone].soft}`}
                title={`${label}: ${statusLabel}`}
            >
                {label} {formatCount(relationship.submittedCount)}/{formatCount(relationship.assignedCount)}
            </span>
            <p className="mt-1 text-[10px] font-bold text-slate-500">
                {formatCount(relationship.pendingCount)} pending{relationship.overdueCount > 0 ? ` · ${formatCount(relationship.overdueCount)} overdue` : ''}{protectedText}
            </p>
        </div>
    );
}

function Header({
                    campaigns,
                    selectedCampaignId,
                    onChangeCampaign,
                    monitoring,
                    loading,
                    exporting,
                    exportMessage,
                    exportError,
                    onExport,
                    onRefresh,
                }: {
    campaigns: FeedbackCampaign[];
    selectedCampaignId: number | '';
    onChangeCampaign: (campaignId: number | '') => void;
    monitoring: FeedbackCampaignMonitoringResponse;
    loading: boolean;
    exporting: boolean;
    exportMessage: string;
    exportError: string;
    onExport: () => void;
    onRefresh: () => void;
}) {
    const status = String(monitoring.campaignStatus ?? 'DRAFT').toUpperCase();
    const health = String(monitoring.campaignHealthStatus ?? 'BLOCKED').toUpperCase();
    const statusBadgeTone = resolveTone(status, statusTone);
    const healthBadgeTone = monitoringHealthTone(status, health);
    const dayTone = daysRemainingTone(monitoring.daysRemaining);

    return (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                        <Badge label="360 monitoring" tone="blue" />
                        <Badge label={statusLabels[status] ?? labelFromValue(status)} tone={statusBadgeTone} />
                        <Badge label={monitoringHealthLabel(status, health)} tone={healthBadgeTone} />
                    </div>
                    <h1 className="mt-2 text-2xl font-black tracking-tight text-slate-950">
                        {monitoring.campaignName || 'Campaign monitoring'}
                    </h1>
                    <div className="mt-2 flex flex-wrap gap-2 text-xs font-black text-slate-500">
                        <span className="rounded-full bg-slate-100 px-3 py-1">Review year: {monitoring.reviewYear ?? '-'}</span>
                        <span className="rounded-full bg-slate-100 px-3 py-1">{formatCampaignWindow(monitoring)}</span>
                        <span className={`rounded-full px-3 py-1 ${toneClasses[dayTone].soft}`}>{daysRemainingDisplay(monitoring)}</span>
                    </div>
                </div>

                <div className="grid w-full min-w-0 gap-2 md:w-[340px] md:shrink-0">
                    <div className="flex flex-wrap justify-start gap-2 md:justify-end">
                        <button
                            type="button"
                            onClick={onExport}
                            disabled={exporting || !selectedCampaignId}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl bg-blue-600 px-3.5 text-xs font-black text-white shadow-sm transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-500 disabled:shadow-none"
                        >
                            {exporting ? <i className="bi bi-arrow-repeat f360-monitoring-spin" /> : <i className="bi bi-filetype-csv" />}
                            {exporting ? 'Exporting...' : 'Export CSV'}
                        </button>
                        <button
                            type="button"
                            onClick={onRefresh}
                            disabled={!selectedCampaignId}
                            className="inline-flex h-9 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3.5 text-xs font-black text-slate-600 transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
                        >
                            <i className="bi bi-arrow-clockwise" />
                            Refresh
                        </button>
                    </div>
                    <label className="min-w-0">
                        <span className="mb-1 block text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">Campaign</span>
                        <select
                            value={selectedCampaignId}
                            disabled={loading || campaigns.length === 0}
                            onChange={(event) => onChangeCampaign(event.target.value ? Number(event.target.value) : '')}
                            className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-700 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                        >
                            <option value="">Select campaign</option>
                            {campaigns.map((campaign) => (
                                <option key={campaign.id} value={campaign.id}>
                                    {campaign.name} · {statusLabels[campaign.status] ?? campaign.status}
                                </option>
                            ))}
                        </select>
                    </label>
                    {exportMessage && <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-bold leading-5 text-emerald-700">{exportMessage}</p>}
                    {exportError && <p className="rounded-xl border border-red-200 bg-red-50 px-3 py-2 text-xs font-bold leading-5 text-red-700">{exportError}</p>}
                </div>
            </div>
        </section>
    );
}

function buildSummaryCards(overview: MonitoringOverview) {
    return [
        {
            icon: 'bi-people-fill',
            label: 'Total Targets',
            value: formatCount(overview.totalTargets),
            detail: 'Employees included in this campaign.',
            tone: 'blue' as Tone,
        },
        {
            icon: 'bi-ui-checks-grid',
            label: 'Assignments',
            value: formatCount(overview.totalAssignments),
            detail: 'Evaluator forms generated for tracking.',
            tone: 'violet' as Tone,
        },
        {
            icon: 'bi-check2-circle',
            label: 'Submitted',
            value: formatCount(overview.submittedCount),
            detail: `${formatPercent(overview.completionPercent)} of assignments completed.`,
            tone: 'emerald' as Tone,
        },
        {
            icon: 'bi-hourglass-split',
            label: 'Pending',
            value: formatCount(overview.pendingCount),
            detail: `${formatCount(overview.overdueCount)} overdue follow-up(s).`,
            tone: overview.overdueCount > 0 ? ('red' as Tone) : ('amber' as Tone),
        },
    ];
}

interface MonitoringOverviewTabProps {
    activeCampaign?: FeedbackCampaign | null;
}

export default function MonitoringOverviewTab({ activeCampaign = null }: MonitoringOverviewTabProps) {
    const [campaigns, setCampaigns] = useState<FeedbackCampaign[]>([]);
    const [campaignLoadState, setCampaignLoadState] = useState<LoadState>('idle');
    const [monitoringLoadState, setMonitoringLoadState] = useState<LoadState>('idle');
    const [selectedCampaignId, setSelectedCampaignId] = useState<number | ''>(activeCampaign?.id ?? '');
    const [monitoring, setMonitoring] = useState<FeedbackCampaignMonitoringResponse>(emptyMonitoringResponse());
    const [reminderHistory, setReminderHistory] = useState<FeedbackReminderHistoryItem[]>([]);
    const [reminderSending, setReminderSending] = useState(false);
    const [reminderMessage, setReminderMessage] = useState('');
    const [reminderError, setReminderError] = useState('');
    const [lastReminderResult, setLastReminderResult] = useState<FeedbackReminderResponse | null>(null);
    const [reminderConfirmOpen, setReminderConfirmOpen] = useState(false);
    const [reminderIntent, setReminderIntent] = useState<ReminderIntent | null>(null);
    const [closeConfirm, setCloseConfirm] = useState<CloseConfirmState>({ open: false, acknowledged: false, reason: '' });
    const [closeSubmitting, setCloseSubmitting] = useState(false);
    const [closeMessage, setCloseMessage] = useState('');
    const [closeError, setCloseError] = useState('');
    const [exporting, setExporting] = useState(false);
    const [exportMessage, setExportMessage] = useState('');
    const [exportError, setExportError] = useState('');
    const [targetFilterPreset, setTargetFilterPreset] = useState<TargetFilterPreset | null>(null);
    const [evaluatorFilterPreset, setEvaluatorFilterPreset] = useState<EvaluatorFilterPreset | null>(null);
    const [error, setError] = useState('');
    const targetHealthRef = useRef<HTMLElement | null>(null);
    const evaluatorWorkloadRef = useRef<HTMLElement | null>(null);

    const loading = campaignLoadState === 'loading' || monitoringLoadState === 'loading';
    const overview = monitoring.overview;
    const summaryCards = useMemo(() => buildSummaryCards(overview), [overview]);
    const hasAssignments = overview.totalAssignments > 0;
    const canSendCampaignReminders = String(monitoring.campaignStatus ?? '').toUpperCase() === 'ACTIVE' && Number(overview.pendingCount ?? 0) > 0;

    const loadCampaigns = async () => {
        setCampaignLoadState('loading');
        setError('');
        try {
            const data = await hrFeedbackApi.getAllCampaigns();
            setCampaigns(data);
            setSelectedCampaignId((current) => {
                if (activeCampaign?.id && data.some((campaign) => campaign.id === activeCampaign.id)) {
                    return activeCampaign.id;
                }
                return current || pickDefaultCampaignId(data);
            });
            setCampaignLoadState('success');
        } catch (loadError) {
            setCampaignLoadState('error');
            setError(extractErrorMessage(loadError, 'Monitoring campaigns could not be loaded.'));
        }
    };

    const loadMonitoring = async (campaignId: number) => {
        setMonitoringLoadState('loading');
        setError('');
        try {
            const data = await feedbackMonitoringService.getCampaignMonitoring(campaignId);
            setMonitoring(data);
            setMonitoringLoadState('success');
        } catch (loadError) {
            setMonitoringLoadState('error');
            setMonitoring(emptyMonitoringResponse(campaignId));
            setError(extractErrorMessage(loadError, 'Monitoring data could not be loaded.'));
        }
    };

    const loadReminderHistory = async (campaignId: number) => {
        try {
            const rows = await feedbackMonitoringService.getReminderHistory(campaignId);
            setReminderHistory(rows);
        } catch {
            setReminderHistory([]);
        }
    };

    const sendReminders = async (request?: FeedbackScopedReminderRequest) => {
        if (!selectedCampaignId || reminderSending) return;
        setReminderSending(true);
        setReminderMessage('');
        setReminderError('');
        setLastReminderResult(null);
        try {
            const result = request
                ? await feedbackMonitoringService.sendScopedReminders(Number(selectedCampaignId), request)
                : await feedbackMonitoringService.sendCampaignReminders(Number(selectedCampaignId));
            setLastReminderResult(result);
            setReminderMessage(
                `${formatCount(result.notifiedEvaluatorCount)} evaluator${result.notifiedEvaluatorCount === 1 ? '' : 's'} notified. ${formatCount(result.skippedAssignmentCount)} assignment${result.skippedAssignmentCount === 1 ? '' : 's'} skipped.`,
            );
            await loadMonitoring(Number(selectedCampaignId));
            await loadReminderHistory(Number(selectedCampaignId));
        } catch (sendError) {
            setReminderError(extractErrorMessage(sendError, 'Reminders could not be sent.'));
        } finally {
            setReminderSending(false);
        }
    };

    const requestSendReminders = (intent?: ReminderIntent) => {
        setReminderMessage('');
        setReminderError('');
        if (!canSendCampaignReminders) {
            const status = String(monitoring.campaignStatus ?? '').toUpperCase();
            setReminderError(
                status === 'ACTIVE'
                    ? 'No pending evaluator assignments need reminders.'
                    : 'Reminders can only be sent while the campaign is active.',
            );
            scrollIntoMonitoringView(evaluatorWorkloadRef.current);
            return;
        }
        setReminderIntent(intent ?? {
            title: 'Send campaign reminder?',
            description: 'This will send one campaign-level reminder to all pending evaluators in this campaign.',
        });
        setReminderConfirmOpen(true);
    };

    const requestEvaluatorReminder = (evaluator: EvaluatorWorkload) => {
        requestSendReminders({
            title: 'Send evaluator reminder?',
            description: `This will send reminders only to pending assignments for ${evaluator.evaluatorEmployeeName || 'this evaluator'}.`,
            request: {
                scope: 'EVALUATOR',
                evaluatorEmployeeId: evaluator.evaluatorEmployeeId,
                onlyOverdue: false,
            },
        });
    };

    const confirmSendReminders = async () => {
        const request = reminderIntent?.request;
        setReminderConfirmOpen(false);
        await sendReminders(request);
        setReminderIntent(null);
    };


    const openCloseConfirm = () => {
        setCloseMessage('');
        setCloseError('');
        if (!monitoring.closeReadiness?.canClose) {
            setCloseError(monitoring.closeReadiness?.summary || 'This campaign is not ready to close.');
            return;
        }
        setCloseConfirm({ open: true, acknowledged: false, reason: '' });
    };

    const confirmCloseCampaign = async () => {
        if (!selectedCampaignId || closeSubmitting) return;
        const readiness = monitoring.closeReadiness;
        const withWarnings = Boolean(readiness?.canCloseWithWarnings || readiness?.requiresAcknowledgement);
        if (withWarnings && !closeConfirm.acknowledged) {
            setCloseError('Acknowledge the warnings before closing this campaign.');
            return;
        }
        setCloseSubmitting(true);
        setCloseError('');
        setCloseMessage('');
        try {
            await feedbackMonitoringService.closeCampaign(Number(selectedCampaignId), {
                closeMode: withWarnings ? 'WITH_WARNINGS' : 'STANDARD',
                acknowledgedWarnings: withWarnings ? closeConfirm.acknowledged : true,
                reason: closeConfirm.reason.trim() || undefined,
            });
            setCloseConfirm({ open: false, acknowledged: false, reason: '' });
            setCloseMessage(withWarnings ? 'Campaign closed with warnings.' : 'Campaign closed successfully.');
            await loadCampaigns();
            await loadMonitoring(Number(selectedCampaignId));
            await loadReminderHistory(Number(selectedCampaignId));
        } catch (closeFailure) {
            setCloseError(extractErrorMessage(closeFailure, 'Campaign could not be closed.'));
        } finally {
            setCloseSubmitting(false);
        }
    };

    const applyTargetFilter = (preset: Omit<TargetFilterPreset, 'token'>) => {
        setTargetFilterPreset({ ...preset, token: Date.now() });
        window.setTimeout(() => scrollIntoMonitoringView(targetHealthRef.current), 0);
    };

    const applyEvaluatorFilter = (preset: Omit<EvaluatorFilterPreset, 'token'>) => {
        setEvaluatorFilterPreset({ ...preset, token: Date.now() });
        window.setTimeout(() => scrollIntoMonitoringView(evaluatorWorkloadRef.current), 0);
    };

    const handleAlertAction = (alert: MonitoringAlert) => {
        if (alertTargetsEvaluatorWorkload(alert)) {
            applyEvaluatorFilter({ workloadFilter: workloadFilterFromAlert(alert) });
            return;
        }

        const relationshipFilter = relationshipFromAlert(alert);
        const key = `${alert.alertType ?? ''} ${alert.actionType ?? ''} ${alert.filterKey ?? ''}`.toUpperCase();
        applyTargetFilter({
            relationshipFilter,
            health: key.includes('AT_RISK') ? 'AT_RISK' : key.includes('BLOCKED') ? 'BLOCKED' : 'ALL',
            readyFilter: key.includes('READY_TO_CLOSE') || key.includes('NOT_READY_TO_CLOSE') ? 'NOT_READY' : 'ALL',
        });
    };

    const handleViewTargetEvaluators = (target: TargetHealth) => {
        applyEvaluatorFilter({
            search: target.targetEmployeeName ?? '',
            workloadFilter: Number(target.overdueCount ?? 0) > 0 ? 'OVERDUE' : Number(target.pendingCount ?? 0) > 0 ? 'PENDING' : 'ALL',
        });
    };

    const handleExportCsv = async () => {
        if (!selectedCampaignId || exporting) return;
        setExporting(true);
        setExportMessage('');
        setExportError('');
        try {
            await feedbackMonitoringService.exportMonitoringCsv(Number(selectedCampaignId));
            setExportMessage('Monitoring CSV report downloaded.');
            await loadMonitoring(Number(selectedCampaignId));
        } catch (exportFailure) {
            setExportError(extractErrorMessage(exportFailure, 'Monitoring report could not be exported.'));
        } finally {
            setExporting(false);
        }
    };

    useEffect(() => {
        void loadCampaigns();
    }, []);

    useEffect(() => {
        if (activeCampaign?.id) {
            setSelectedCampaignId(activeCampaign.id);
        }
    }, [activeCampaign?.id]);

    useEffect(() => {
        setReminderMessage('');
        setReminderError('');
        setLastReminderResult(null);
        setReminderIntent(null);
        setCloseConfirm({ open: false, acknowledged: false, reason: '' });
        setCloseMessage('');
        setCloseError('');
        setExportMessage('');
        setExportError('');

        if (!selectedCampaignId) {
            setMonitoring(emptyMonitoringResponse());
            setReminderHistory([]);
            setMonitoringLoadState('idle');
            return;
        }

        void loadMonitoring(Number(selectedCampaignId));
        void loadReminderHistory(Number(selectedCampaignId));
    }, [selectedCampaignId]);

    return (
        <div className="f360-monitoring-root min-w-0 max-w-full space-y-4 overflow-x-hidden bg-slate-50/60 p-1 text-slate-900 md:p-2">
            <Header
                campaigns={campaigns}
                selectedCampaignId={selectedCampaignId}
                onChangeCampaign={setSelectedCampaignId}
                monitoring={monitoring}
                loading={campaignLoadState === 'loading'}
                exporting={exporting}
                exportMessage={exportMessage}
                exportError={exportError}
                onExport={handleExportCsv}
                onRefresh={() => selectedCampaignId && void loadMonitoring(Number(selectedCampaignId))}
            />

            {error && (
                <div className="rounded-3xl border border-red-200 bg-red-50 p-5 text-sm font-bold leading-6 text-red-700 shadow-sm">
                    <i className="bi bi-exclamation-octagon mr-2" />
                    {error}
                </div>
            )}

            {loading && <LoadingSkeleton />}

            {!loading && campaigns.length === 0 && campaignLoadState === 'success' && (
                <EmptyState
                    icon="bi-megaphone"
                    title="No feedback campaigns found"
                    description="Create a 360 feedback campaign first. Monitoring will become available after a campaign exists."
                />
            )}

            {!loading && campaigns.length > 0 && !selectedCampaignId && (
                <EmptyState
                    icon="bi-search"
                    title="Select a campaign"
                    description="Choose a feedback campaign to view live submission progress, relationship coverage, and alerts."
                />
            )}

            {!loading && selectedCampaignId && monitoringLoadState === 'success' && (
                <>
                    <section className="f360-monitoring-summary-grid">
                        {summaryCards.map((card) => (
                            <SummaryCard key={card.label} {...card} />
                        ))}
                    </section>

                    {!hasAssignments && (
                        <EmptyState
                            icon="bi-diagram-3"
                            title="No evaluator assignments yet"
                            description="Generate evaluator assignments before using monitoring. After assignments exist, progress charts and alerts will appear here."
                        />
                    )}

                    {hasAssignments && (
                        <>
                            <section className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-stretch">
                                <RiskPanel monitoring={monitoring} />
                                <RelationshipProgressCard relationships={monitoring.relationships ?? []} />
                            </section>

                            <section className="grid min-w-0 grid-cols-1 gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] md:items-stretch">
                                <OverallProgressCard monitoring={monitoring} />
                                <AlertsPanel
                                    alerts={monitoring.alerts ?? []}
                                    canSendReminders={canSendCampaignReminders}
                                    onAlertAction={handleAlertAction}
                                    onRequestReminders={requestSendReminders}
                                />
                            </section>

                            <CloseReadinessSection
                                monitoring={monitoring}
                                closing={closeSubmitting}
                                closeMessage={closeMessage}
                                closeError={closeError}
                                onOpenCloseConfirm={openCloseConfirm}
                            />

                            <TargetHealthTable
                                targets={monitoring.targets ?? []}
                                sectionRef={targetHealthRef}
                                filterPreset={targetFilterPreset}
                                canSendReminders={canSendCampaignReminders}
                                onViewEvaluators={handleViewTargetEvaluators}
                                onRequestReminders={requestSendReminders}
                            />

                            <EvaluatorWorkloadSection
                                sectionRef={evaluatorWorkloadRef}
                                filterPreset={evaluatorFilterPreset}
                                monitoring={monitoring}
                                reminderHistory={reminderHistory}
                                reminderSending={reminderSending}
                                reminderMessage={reminderMessage}
                                reminderError={reminderError}
                                lastReminderResult={lastReminderResult}
                                onSendReminders={requestSendReminders}
                                onRefreshHistory={() => selectedCampaignId && void loadReminderHistory(Number(selectedCampaignId))}
                                onRequestEvaluatorReminder={requestEvaluatorReminder}
                            />

                            <ActivityTimelineExportSection
                                activity={monitoring.activity ?? []}
                                onRefresh={() => selectedCampaignId && void loadMonitoring(Number(selectedCampaignId))}
                            />
                        </>
                    )}
                </>
            )}

            <CloseCampaignConfirmDialog
                open={closeConfirm.open}
                monitoring={monitoring}
                closing={closeSubmitting}
                acknowledged={closeConfirm.acknowledged}
                reason={closeConfirm.reason}
                onAcknowledgedChange={(acknowledged) => setCloseConfirm((current) => ({ ...current, acknowledged }))}
                onReasonChange={(reason) => setCloseConfirm((current) => ({ ...current, reason }))}
                onCancel={() => setCloseConfirm({ open: false, acknowledged: false, reason: '' })}
                onConfirm={confirmCloseCampaign}
            />

            <ReminderConfirmDialog
                open={reminderConfirmOpen}
                pendingCount={overview.pendingCount}
                sending={reminderSending}
                title={reminderIntent?.title}
                description={reminderIntent?.description}
                onCancel={() => {
                    setReminderConfirmOpen(false);
                    setReminderIntent(null);
                }}
                onConfirm={confirmSendReminders}
            />
        </div>
    );
}
