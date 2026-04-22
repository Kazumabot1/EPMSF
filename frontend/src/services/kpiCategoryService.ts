import api from './api';
import { extractApiErrorMessage } from './apiError';
import type { KpiCategory, KpiCategoryRequest } from '../types/kpiCategory';

const KPI_CATEGORY_ENDPOINT = '/api/kpi-categories';

export const kpiCategoryService = {
  async getAll(): Promise<KpiCategory[]> {
    try {
      const response = await api.get<KpiCategory[]>(KPI_CATEGORY_ENDPOINT);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI categories.'));
    }
  },

  async create(payload: KpiCategoryRequest): Promise<KpiCategory> {
    try {
      const response = await api.post<KpiCategory>(KPI_CATEGORY_ENDPOINT, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create KPI category.'));
    }
  },

  async update(id: number, payload: KpiCategoryRequest): Promise<KpiCategory> {
    try {
      const response = await api.put<KpiCategory>(`${KPI_CATEGORY_ENDPOINT}/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update KPI category.'));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`${KPI_CATEGORY_ENDPOINT}/${id}`);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to delete KPI category.'));
    }
  },
};
