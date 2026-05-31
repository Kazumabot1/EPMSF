import type { FeedbackCampaignStatus } from '../../../../../types/feedbackCampaign';
import type { CampaignInfoForm, RelationshipOption } from '../types/campaignSetupTypes';

export const DEFAULT_CAMPAIGN_TYPE = '360 Feedback';
export const DESCRIPTION_LIMIT = 2000;

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
    { value: 'SUBORDINATE', label: 'Subordinate' },
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
