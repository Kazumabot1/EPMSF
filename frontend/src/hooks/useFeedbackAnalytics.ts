import { useQuery } from '@tanstack/react-query';
import { feedbackAnalyticsApi } from '../api/feedbackAnalyticsApi';
import { feedbackService } from '../services/feedbackService';

export const feedbackAnalyticsKeys = {
    all: ['feedback-analytics'] as const,
    campaigns: () => [...feedbackAnalyticsKeys.all, 'campaigns'] as const,
    campaignSummary: (campaignId: number) => [...feedbackAnalyticsKeys.all, 'campaign', campaignId] as const,
    myResult: () => [...feedbackAnalyticsKeys.all, 'my-result'] as const,
    managedSummary: () => [...feedbackAnalyticsKeys.all, 'managed-summary'] as const,
};

export const useFeedbackAnalyticsCampaigns = () =>
    useQuery({
        queryKey: feedbackAnalyticsKeys.campaigns(),
        queryFn: feedbackService.getCampaigns,
    });

export const useFeedbackCampaignSummary = (campaignId: number | null) =>
    useQuery({
        queryKey: campaignId != null ? feedbackAnalyticsKeys.campaignSummary(campaignId) : feedbackAnalyticsKeys.all,
        queryFn: () => feedbackAnalyticsApi.getCampaignSummary(campaignId as number),
        enabled: campaignId != null,
    });

export const useMyFeedbackResult = () =>
    useQuery({
        queryKey: feedbackAnalyticsKeys.myResult(),
        queryFn: feedbackAnalyticsApi.getMyResult,
    });

export const useFeedbackTeamSummary = () =>
    useQuery({
        queryKey: feedbackAnalyticsKeys.managedSummary(),
        queryFn: feedbackAnalyticsApi.getTeamSummary,
    });
