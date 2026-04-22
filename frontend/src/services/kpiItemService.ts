import api from './api';
import { extractApiErrorMessage } from './apiError';
import type { KpiItem, KpiItemRequest } from '../types/kpiItem';

const KPI_ITEM_ENDPOINT = '/api/kpi-items';

export const kpiItemService = {
  async getAll(): Promise<KpiItem[]> {
    try {
      const response = await api.get<KpiItem[]>(KPI_ITEM_ENDPOINT);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI items.'));
    }
  },

  async create(payload: KpiItemRequest): Promise<KpiItem> {
    try {
      const response = await api.post<KpiItem>(KPI_ITEM_ENDPOINT, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create KPI item.'));
    }
  },

  async update(id: number, payload: KpiItemRequest): Promise<KpiItem> {
    try {
      const response = await api.put<KpiItem>(`${KPI_ITEM_ENDPOINT}/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update KPI item.'));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`${KPI_ITEM_ENDPOINT}/${id}`);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to delete KPI item.'));
    }
  },
};
