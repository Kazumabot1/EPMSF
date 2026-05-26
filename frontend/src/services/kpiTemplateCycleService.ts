import api from './api';
import { extractApiErrorMessage } from './apiError';
import type {
  KpiTemplateCycleRequest,
  KpiTemplateCycleResponse,
  KpiTemplateCycleStatusRequest,
} from '../types/kpiTemplateCycle';

const BASE = '/hr/kpi-template-cycles';

export const kpiTemplateCycleService = {
  async list(): Promise<KpiTemplateCycleResponse[]> {
    try {
      const response = await api.get<KpiTemplateCycleResponse[]>(BASE);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI template cycles.'));
    }
  },

  async getById(id: number): Promise<KpiTemplateCycleResponse> {
    try {
      const response = await api.get<KpiTemplateCycleResponse>(`${BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI template cycle.'));
    }
  },

  async create(payload: KpiTemplateCycleRequest): Promise<KpiTemplateCycleResponse> {
    try {
      const response = await api.post<KpiTemplateCycleResponse>(BASE, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to save KPI template cycle.'));
    }
  },

  async update(id: number, payload: KpiTemplateCycleRequest): Promise<KpiTemplateCycleResponse> {
    try {
      const response = await api.put<KpiTemplateCycleResponse>(`${BASE}/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update KPI template cycle.'));
    }
  },

  async updateStatus(id: number, activeOrPayload: boolean | KpiTemplateCycleStatusRequest): Promise<KpiTemplateCycleResponse> {
    try {
      const payload = typeof activeOrPayload === 'boolean' ? { active: activeOrPayload } : activeOrPayload;
      const response = await api.patch<KpiTemplateCycleResponse>(`${BASE}/${id}/status`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update cycle status.'));
    }
  },

  async listPendingApprovals(): Promise<KpiTemplateCycleResponse[]> {
    try {
      const response = await api.get<KpiTemplateCycleResponse[]>('/executive/kpi-approvals');
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI approval requests.'));
    }
  },

  async approveEarlyClose(id: number, reviewReason?: string): Promise<KpiTemplateCycleResponse> {
    try {
      const response = await api.post<KpiTemplateCycleResponse>(`/executive/kpi-approvals/${id}/approve`, {
        reviewReason,
      });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to approve KPI close request.'));
    }
  },

  async rejectEarlyClose(id: number, reviewReason?: string): Promise<KpiTemplateCycleResponse> {
    try {
      const response = await api.post<KpiTemplateCycleResponse>(`/executive/kpi-approvals/${id}/reject`, {
        reviewReason,
      });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to reject KPI close request.'));
    }
  },
};
