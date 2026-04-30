import api from './api';
import { extractApiErrorMessage } from './apiError';
import type { KpiTemplateRequest, KpiTemplateResponse } from '../types/kpiTemplate';

const BASE = '/hr/kpi-templates';

export const kpiTemplateService = {
  async createTemplate(payload: KpiTemplateRequest): Promise<KpiTemplateResponse> {
    try {
      const response = await api.post<KpiTemplateResponse>(`${BASE}/create`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create KPI template.'));
    }
  },

  async updateTemplate(id: number, payload: KpiTemplateRequest): Promise<KpiTemplateResponse> {
    try {
      const response = await api.put<KpiTemplateResponse>(`${BASE}/update/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update KPI template.'));
    }
  },

  async deleteTemplate(id: number): Promise<void> {
    try {
      await api.delete(`${BASE}/delete/${id}`);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to delete KPI template.'));
    }
  },

  async getAllTemplates(): Promise<KpiTemplateResponse[]> {
    try {
      const response = await api.get<KpiTemplateResponse[]>(`${BASE}/list`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI templates.'));
    }
  },

  async getTemplateById(id: number): Promise<KpiTemplateResponse> {
    try {
      const response = await api.get<KpiTemplateResponse>(`${BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI template.'));
    }
  },
};
