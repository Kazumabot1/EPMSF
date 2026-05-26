import type { CreateFeedbackCampaignInput, FeedbackCampaign } from '../../../../../types/feedbackCampaign';
import type { CampaignInfoForm, FieldErrors } from '../types/campaignSetupTypes';
import { DEFAULT_CAMPAIGN_TYPE, DESCRIPTION_LIMIT, INSTRUCTIONS_LIMIT, defaultForm } from './campaignSetupConstants';

export const buildLocalDateTime = (date: string, time: string) => date && time ? `${date}T${time}` : '';
export const normalizeDateTimeForApi = (value: string) => value.length === 16 ? `${value}:00` : value;

export const campaignToForm = (campaign: FeedbackCampaign): CampaignInfoForm => ({
    ...defaultForm(),
    name: campaign.name,
    reviewYear: campaign.reviewYear ?? '',
    startDate: (campaign.startAt ?? campaign.startDate ?? '').slice(0, 10),
    startTime: (campaign.startAt ?? '').slice(11, 16),
    endDate: (campaign.endAt ?? campaign.endDate ?? '').slice(0, 10),
    endTime: (campaign.endAt ?? '').slice(11, 16),
    description: campaign.description ?? '',
    instructions: campaign.instructions ?? '',
    autoSubmitCompletedDraftsOnClose: Boolean(campaign.autoSubmitCompletedDraftsOnClose),
    managerFeedbackAnonymous: Boolean(campaign.managerFeedbackAnonymous),
    peerFeedbackAnonymous: campaign.peerFeedbackAnonymous !== false,
    subordinateFeedbackAnonymous: campaign.subordinateFeedbackAnonymous !== false,
    selfFeedbackAnonymous: Boolean(campaign.selfFeedbackAnonymous),
    redistributeMissingRelationshipWeight: campaign.redistributeMissingRelationshipWeight !== false,
});

export const validateCampaignInfoForm = (form: CampaignInfoForm): FieldErrors => {
    const nextErrors: FieldErrors = {};
    if (!form.name.trim()) nextErrors.name = 'Campaign name is required.';
    if (form.name.trim().length > 255) nextErrors.name = 'Campaign name cannot exceed 255 characters.';

    const reviewYear = Number(form.reviewYear);
    if (!form.reviewYear || !Number.isFinite(reviewYear) || reviewYear < 2000 || reviewYear > 2100) {
        nextErrors.reviewYear = 'Enter a review year between 2000 and 2100.';
    }

    if (!form.startDate) nextErrors.startAt = 'Choose a start date.';
    if (!form.startTime) nextErrors.startAt = nextErrors.startAt ?? 'Choose a start time.';
    if (!form.endDate) nextErrors.endAt = 'Choose an end date.';
    if (!form.endTime) nextErrors.endAt = nextErrors.endAt ?? 'Choose an end time.';

    const startAt = buildLocalDateTime(form.startDate, form.startTime);
    const endAt = buildLocalDateTime(form.endDate, form.endTime);
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
        nextErrors.endAt = 'End date/time must be after start date/time.';
    }

    if (form.description.length > DESCRIPTION_LIMIT) {
        nextErrors.description = `Announcement cannot exceed ${DESCRIPTION_LIMIT.toLocaleString()} characters.`;
    }
    if (form.instructions.length > INSTRUCTIONS_LIMIT) {
        nextErrors.instructions = `Instructions cannot exceed ${INSTRUCTIONS_LIMIT.toLocaleString()} characters.`;
    }

    return nextErrors;
};

export const buildCampaignPayload = (form: CampaignInfoForm): CreateFeedbackCampaignInput => ({
    name: form.name.trim(),
    campaignType: DEFAULT_CAMPAIGN_TYPE,
    reviewYear: Number(form.reviewYear),
    startAt: normalizeDateTimeForApi(buildLocalDateTime(form.startDate, form.startTime)),
    endAt: normalizeDateTimeForApi(buildLocalDateTime(form.endDate, form.endTime)),
    startDate: form.startDate,
    endDate: form.endDate,
    description: form.description.trim(),
    instructions: form.instructions.trim(),
    autoSubmitCompletedDraftsOnClose: form.autoSubmitCompletedDraftsOnClose,
    managerFeedbackAnonymous: form.managerFeedbackAnonymous,
    peerFeedbackAnonymous: form.peerFeedbackAnonymous,
    subordinateFeedbackAnonymous: form.subordinateFeedbackAnonymous,
    selfFeedbackAnonymous: form.selfFeedbackAnonymous,
    redistributeMissingRelationshipWeight: form.redistributeMissingRelationshipWeight,
});
