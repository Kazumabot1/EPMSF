import type { CreateFeedbackCampaignInput, FeedbackCampaign } from '../../../../../types/feedbackCampaign';
import type { CampaignInfoForm, FieldErrors } from '../types/campaignSetupTypes';
import { DEFAULT_CAMPAIGN_TYPE, DESCRIPTION_LIMIT, defaultForm } from './campaignSetupConstants';

export const buildLocalDateTime = (date: string, time: string) => date && time ? `${date}T${time}` : '';
export const normalizeDateTimeForApi = (value: string) => value.length === 16 ? `${value}:00` : value;

const padDatePart = (value: number) => String(value).padStart(2, '0');

export const getTodayInputDate = (now: Date = new Date()) => (
    `${now.getFullYear()}-${padDatePart(now.getMonth() + 1)}-${padDatePart(now.getDate())}`
);

export const timeToMinutes = (value: string) => {
    const [hours, minutes] = value.split(':').map(Number);
    if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return Number.NaN;
    return (hours * 60) + minutes;
};

const parseLocalDateTime = (date: string, time: string) => {
    const value = buildLocalDateTime(date, time);
    if (!value) return null;
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
};

const currentMinute = (now: Date = new Date()) => {
    const normalized = new Date(now);
    normalized.setSeconds(0, 0);
    return normalized;
};

export const isLocalDateTimeInPast = (date: string, time: string, now: Date = new Date()) => {
    const parsed = parseLocalDateTime(date, time);
    return parsed ? parsed.getTime() < currentMinute(now).getTime() : false;
};

export const campaignToForm = (campaign: FeedbackCampaign): CampaignInfoForm => ({
    ...defaultForm(),
    name: campaign.name,
    reviewYear: campaign.reviewYear ?? '',
    startDate: (campaign.startAt ?? campaign.startDate ?? '').slice(0, 10),
    startTime: (campaign.startAt ?? '').slice(11, 16),
    endDate: (campaign.endAt ?? campaign.endDate ?? '').slice(0, 10),
    endTime: (campaign.endAt ?? '').slice(11, 16),
    description: campaign.description ?? '',
    instructions: '',
    autoSubmitCompletedDraftsOnClose: Boolean(campaign.autoSubmitCompletedDraftsOnClose),
    managerFeedbackAnonymous: false,
    peerFeedbackAnonymous: campaign.peerFeedbackAnonymous !== false,
    subordinateFeedbackAnonymous: campaign.subordinateFeedbackAnonymous !== false,
    selfFeedbackAnonymous: false,
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
    if (startAt && form.startDate && form.startTime && isLocalDateTimeInPast(form.startDate, form.startTime)) {
        nextErrors.startAt = 'Start date/time cannot be in the past.';
    }
    if (endAt && form.endDate && form.endTime && isLocalDateTimeInPast(form.endDate, form.endTime)) {
        nextErrors.endAt = 'End date/time cannot be in the past.';
    }
    if (startAt && endAt && new Date(startAt) >= new Date(endAt)) {
        nextErrors.endAt = 'End date/time must be after start date/time.';
    }

    if (form.description.length > DESCRIPTION_LIMIT) {
        nextErrors.description = `Announcement cannot exceed ${DESCRIPTION_LIMIT.toLocaleString()} characters.`;
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
    instructions: '',
    autoSubmitCompletedDraftsOnClose: form.autoSubmitCompletedDraftsOnClose,
    managerFeedbackAnonymous: false,
    peerFeedbackAnonymous: form.peerFeedbackAnonymous,
    subordinateFeedbackAnonymous: form.subordinateFeedbackAnonymous,
    selfFeedbackAnonymous: false,
    redistributeMissingRelationshipWeight: form.redistributeMissingRelationshipWeight,
});
