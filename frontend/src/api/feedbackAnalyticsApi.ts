import api from '../services/api';
import { extractApiErrorMessage } from '../services/apiError';
import type {
  ApiEnvelope,
  FeedbackCampaignSummary,
  FeedbackSummaryPublishRequest,
  FeedbackIntegrationScore,
  FeedbackMyResult,
  FeedbackTeamSummary,
} from '../types/feedbackAnalytics';

const FEEDBACK_BASE = '/v1/feedback';

const unwrap = <T>(response: { data: ApiEnvelope<T> }): T => response.data.data;

export const feedbackAnalyticsApi = {
  async getCampaignSummary(campaignId: number): Promise<FeedbackCampaignSummary> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackCampaignSummary>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/summary`,
      );
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load feedback campaign summary.'));
    }
  },

  async recalculateCampaignSummary(campaignId: number): Promise<FeedbackCampaignSummary> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaignSummary>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/summary/recalculate`,
      );
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to recalculate feedback campaign summary.'));
    }
  },

  async publishCampaignSummary(campaignId: number, payload: FeedbackSummaryPublishRequest): Promise<FeedbackCampaignSummary> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaignSummary>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/summary/publish`,
          payload,
      );
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to publish feedback campaign summary.'));
    }
  },

  async unpublishCampaignSummary(campaignId: number): Promise<FeedbackCampaignSummary> {
    try {
      const response = await api.post<ApiEnvelope<FeedbackCampaignSummary>>(
          `${FEEDBACK_BASE}/campaigns/${campaignId}/summary/unpublish`,
      );
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to unpublish feedback campaign summary.'));
    }
  },

  async getIntegrationScores(campaignId: number): Promise<FeedbackIntegrationScore[]> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackIntegrationScore[]>>(
          `${FEEDBACK_BASE}/integration/scores`,
          { params: { campaignId } },
      );
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load 360 feedback integration scores.'));
    }
  },

  async getIntegrationScoresForEmployee(employeeId: number): Promise<FeedbackIntegrationScore[]> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackIntegrationScore[]>>(
          `${FEEDBACK_BASE}/integration/scores/employee/${employeeId}`,
      );
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load employee 360 feedback integration scores.'));
    }
  },

  async getMyResult(): Promise<FeedbackMyResult> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackMyResult>>(`${FEEDBACK_BASE}/my-result`);
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load your feedback results.'));
    }
  },

  async getTeamSummary(): Promise<FeedbackTeamSummary> {
    try {
      const response = await api.get<ApiEnvelope<FeedbackTeamSummary>>(`${FEEDBACK_BASE}/team-summary`);
      return unwrap(response);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load team feedback summary.'));
    }
  },
};
