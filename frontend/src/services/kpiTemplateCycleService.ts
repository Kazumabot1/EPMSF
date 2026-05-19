import api from './api';
import { extractApiErrorMessage } from './apiError';
import type { KpiTemplateCycleRequest, KpiTemplateCycleResponse } from '../types/kpiTemplateCycle';

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

  async updateStatus(id: number, active: boolean): Promise<KpiTemplateCycleResponse> {
    try {
      const response = await api.patch<KpiTemplateCycleResponse>(`${BASE}/${id}/status`, { active });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update cycle status.'));
    }
  },
};
