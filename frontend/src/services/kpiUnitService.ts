import api from './api';
import { extractApiErrorMessage } from './apiError';
import type { KpiUnit, KpiUnitRequest } from '../types/kpiUnit';

const KPI_UNIT_ENDPOINT = '/api/kpi-units';

export const kpiUnitService = {
  async getAll(): Promise<KpiUnit[]> {
    try {
      const response = await api.get<KpiUnit[]>(KPI_UNIT_ENDPOINT);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI units.'));
    }
  },

  async create(payload: KpiUnitRequest): Promise<KpiUnit> {
    try {
      const response = await api.post<KpiUnit>(KPI_UNIT_ENDPOINT, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create KPI unit.'));
    }
  },

  async update(id: number, payload: KpiUnitRequest): Promise<KpiUnit> {
    try {
      const response = await api.put<KpiUnit>(`${KPI_UNIT_ENDPOINT}/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update KPI unit.'));
    }
  },

  async remove(id: number): Promise<void> {
    try {
      await api.delete(`${KPI_UNIT_ENDPOINT}/${id}`);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to delete KPI unit.'));
    }
  },
};
