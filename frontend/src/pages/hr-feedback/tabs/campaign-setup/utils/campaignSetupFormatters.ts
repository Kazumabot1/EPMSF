import type {
    FeedbackAssignmentDetailItem,
    FeedbackCampaign,
    FeedbackCampaignStatus,
    FeedbackRelationshipType,
    FeedbackTargetCandidate,
} from '../../../../../types/feedbackCampaign';

export const formatTimeLabel = (time: string) => {
    const [hourRaw, minuteRaw] = time.split(':').map(Number);
    const date = new Date();
    date.setHours(hourRaw, minuteRaw, 0, 0);
    return new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);
};

export const formatDateTime = (value?: string | null) => {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value.replace('T', ' ');
    return new Intl.DateTimeFormat(undefined, {
        year: 'numeric', month: 'short', day: '2-digit',
        hour: '2-digit', minute: '2-digit', hour12: true,
    }).format(date);
};

export const formatWindow = (campaign: FeedbackCampaign) => `${formatDateTime(campaign.startAt ?? campaign.startDate)} - ${formatDateTime(campaign.endAt ?? campaign.endDate)}`;
export const statusClass = (status: FeedbackCampaignStatus | string) => `hfd-status-badge ${String(status).replace(/_/g, '-')}`;

export const completionLabel = (campaign: FeedbackCampaign) => {
    if (!campaign.assignmentCount || campaign.assignmentCount <= 0) return 'Not generated';
    return `${campaign.assignmentCount} assignment${campaign.assignmentCount === 1 ? '' : 's'}`;
};

export const readinessLabel = (item: FeedbackTargetCandidate) => {
    if (!item.eligible) return 'Not available';
    if (item.warnings.length > 0) return 'Needs review';
    return 'Ready';
};

export const readinessClass = (item: FeedbackTargetCandidate) => {
    if (!item.eligible) return 'blocked';
    if (item.warnings.length > 0) return 'warning';
    return 'ready';
};

export const recipientDetailItems = (item: FeedbackTargetCandidate) => [
    { label: 'Manager', value: item.managerName ?? 'Not set' },
    { label: 'Possible peers', value: String(item.peerCandidateCount ?? 0) },
    { label: 'Direct reports', value: String(item.subordinateCandidateCount ?? 0) },
    { label: 'Teams', value: item.activeTeamNames.length > 0 ? item.activeTeamNames.join(', ') : 'Not set' },
];

export const assignmentReadinessClass = (item: { warnings: string[]; totalAssignments: number }) => {
    if (item.totalAssignments <= 0) return 'blocked';
    if (item.warnings.length > 0) return 'warning';
    return 'ready';
};

export const personSubtitle = (item: FeedbackTargetCandidate) => [
    item.employeeCode,
    item.email,
].filter(Boolean).join(' · ') || `Employee #${item.employeeId}`;

export const initials = (name?: string | null) =>
    (name ?? '?').split(' ').filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase() ?? '').join('') || '?';

export const relationshipLabel = (type: FeedbackRelationshipType | string) => {
    switch (type) {
        case 'MANAGER':
            return 'Manager';
        case 'PEER':
            return 'Peer';
        case 'SUBORDINATE':
            return 'Direct Report';
        case 'SELF':
            return 'Self';
        default:
            return String(type).replace(/_/g, ' ');
    }
};

export const relationshipIcon = (type: FeedbackRelationshipType | string) => {
    switch (type) {
        case 'MANAGER':
            return 'bi-person-workspace';
        case 'PEER':
            return 'bi-people';
        case 'SUBORDINATE':
            return 'bi-person-lines-fill';
        case 'SELF':
            return 'bi-person-check';
        default:
            return 'bi-person';
    }
};

export const assignmentSourceLabel = (assignment: FeedbackAssignmentDetailItem) => {
    if (assignment.selectionMethod === 'MANUAL') return 'Added by HR';
    if (assignment.relationshipType === 'PEER') return 'Suggested';
    return 'Included';
};

export const assignmentStatusLabel = (status?: string | null) => {
    switch (status) {
        case 'SUBMITTED':
            return 'Submitted';
        case 'IN_PROGRESS':
            return 'In progress';
        case 'CANCELLED':
            return 'Cancelled';
        case 'DECLINED':
            return 'Declined';
        default:
            return 'Pending';
    }
};


export const assignmentKey = (assignment: Pick<FeedbackAssignmentDetailItem, 'targetEmployeeId' | 'evaluatorEmployeeId' | 'relationshipType'>) =>
    `${assignment.targetEmployeeId}:${assignment.evaluatorEmployeeId}:${assignment.relationshipType}`;
