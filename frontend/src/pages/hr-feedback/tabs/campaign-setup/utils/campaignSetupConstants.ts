import type { FeedbackCampaignStatus } from '../../../../../types/feedbackCampaign';
import type { CampaignInfoForm, RelationshipOption } from '../types/campaignSetupTypes';

const padTime = (value: number) => String(value).padStart(2, '0');

export const DEFAULT_CAMPAIGN_TYPE = '360 Feedback';
export const DESCRIPTION_LIMIT = 2000;
export const INSTRUCTIONS_LIMIT = 4000;
export const INSTRUCTION_TEMPLATE = 'Rate recent, observable work behavior. Use specific examples where possible, keep comments constructive, and avoid personal or unrelated remarks.';

export const TIME_OPTIONS = Array.from({ length: 48 }, (_, index) => {
    const hours = Math.floor(index / 2);
    const minutes = index % 2 === 0 ? 0 : 30;
    return `${padTime(hours)}:${padTime(minutes)}`;
});

export const statusLabels: Record<FeedbackCampaignStatus, string> = {
    DRAFT: 'Draft',
    READY_TO_ACTIVATE: 'Ready to activate',
    ACTIVE: 'Active',
    CLOSED: 'Closed',
    PUBLISHED: 'Published',
};

export const statusDescriptions: Record<FeedbackCampaignStatus, string> = {
    DRAFT: 'Editable setup draft',
    READY_TO_ACTIVATE: 'Setup passed validation',
    ACTIVE: 'Collecting feedback',
    CLOSED: 'Submission closed',
    PUBLISHED: 'Reports published',
};

export const RELATIONSHIP_ORDER = ['MANAGER', 'PEER', 'SUBORDINATE', 'SELF'] as const;

export const relationshipOptions: RelationshipOption[] = [
    { value: 'MANAGER', label: 'Manager' },
    { value: 'PEER', label: 'Peer' },
    { value: 'SUBORDINATE', label: 'Direct Report' },
];

export const defaultForm = (): CampaignInfoForm => ({
    name: '',
    reviewYear: '',
    startDate: '',
    startTime: '',
    endDate: '',
    endTime: '',
    description: '',
    instructions: '',
    autoSubmitCompletedDraftsOnClose: false,
    managerFeedbackAnonymous: false,
    peerFeedbackAnonymous: true,
    subordinateFeedbackAnonymous: true,
    selfFeedbackAnonymous: false,
    redistributeMissingRelationshipWeight: true,
});
