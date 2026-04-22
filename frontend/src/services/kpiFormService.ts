import api from './api';
import { extractApiErrorMessage } from './apiError';
import type { KpiForm, KpiFormRequest } from '../types/kpiForm';

const KPI_FORM_ENDPOINT = '/api/kpis';

export const kpiFormService = {
  async getAll(): Promise<KpiForm[]> {
    try {
      const response = await api.get<KpiForm[]>(KPI_FORM_ENDPOINT);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI forms.'));
    }
  },

  async getById(id: number): Promise<KpiForm> {
    try {
      const response = await api.get<KpiForm>(`${KPI_FORM_ENDPOINT}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI form details.'));
    }
  },

  async create(payload: KpiFormRequest): Promise<KpiForm> {
    try {
      const response = await api.post<KpiForm>(KPI_FORM_ENDPOINT, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create KPI form.'));
    }
  },

  async update(id: number, payload: KpiFormRequest): Promise<KpiForm> {
    try {
      const response = await api.put<KpiForm>(`${KPI_FORM_ENDPOINT}/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update KPI form.'));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`${KPI_FORM_ENDPOINT}/${id}`);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to delete KPI form.'));
    }
  },
};
