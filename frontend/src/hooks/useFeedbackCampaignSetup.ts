import {
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { feedbackCampaignApi } from '../api/feedbackCampaignApi';
import type {
  CreateFeedbackCampaignInput,
  EvaluatorConfigInput,
  FeedbackCampaignTargetsInput,
} from '../types/feedbackCampaign';

export const feedbackCampaignKeys = {
  all: ['feedback-campaign-setup'] as const,
  employees: () => [...feedbackCampaignKeys.all, 'employees'] as const,
  departments: () => [...feedbackCampaignKeys.all, 'departments'] as const,
  teams: () => [...feedbackCampaignKeys.all, 'teams'] as const,
  campaign: (campaignId: number) => [...feedbackCampaignKeys.all, 'campaign', campaignId] as const,
};

export const useFeedbackCampaignReferenceData = () => {
  const employeesQuery = useQuery({
    queryKey: feedbackCampaignKeys.employees(),
    queryFn: feedbackCampaignApi.getEmployees,
  });

  const departmentsQuery = useQuery({
    queryKey: feedbackCampaignKeys.departments(),
    queryFn: feedbackCampaignApi.getDepartments,
  });

  const teamsQuery = useQuery({
    queryKey: feedbackCampaignKeys.teams(),
    queryFn: feedbackCampaignApi.getTeams,
  });

  return {
    employeesQuery,
    departmentsQuery,
    teamsQuery,
  };
};

export const useFeedbackCampaign = (campaignId: number | null) =>
    useQuery({
      queryKey: campaignId ? feedbackCampaignKeys.campaign(campaignId) : feedbackCampaignKeys.all,
      queryFn: () => feedbackCampaignApi.getCampaign(campaignId as number),
      enabled: campaignId != null,
    });

export const useCreateFeedbackCampaign = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: CreateFeedbackCampaignInput) => feedbackCampaignApi.createCampaign(payload),
    onSuccess: (campaign) => {
      queryClient.setQueryData(feedbackCampaignKeys.campaign(campaign.id), campaign);
    },
  });
};

export const useAssignFeedbackTargets = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
                   campaignId,
                   payload,
                 }: {
      campaignId: number;
      payload: FeedbackCampaignTargetsInput;
    }) => feedbackCampaignApi.assignTargets(campaignId, payload),
    onSuccess: (campaign) => {
      queryClient.setQueryData(feedbackCampaignKeys.campaign(campaign.id), campaign);
    },
  });
};

export const usePreviewFeedbackAssignments = () =>
    useMutation({
      mutationFn: ({
                     campaignId,
                     payload,
                   }: {
        campaignId: number;
        payload: EvaluatorConfigInput;
      }) => feedbackCampaignApi.previewAssignments(campaignId, payload),
    });

export const useGenerateFeedbackAssignments = () =>
    useMutation({
      mutationFn: ({
                     campaignId,
                     payload,
                   }: {
        campaignId: number;
        payload: EvaluatorConfigInput;
      }) => feedbackCampaignApi.generateAssignments(campaignId, payload),
    });
