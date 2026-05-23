import api from './api';
import { extractApiErrorMessage } from './apiError';
import type {
  EmployeeKpiResult,
  HrEmployeeKpiRow,
  ManagerKpiAssignment,
  ManagerKpiTemplateSummary,
  UseKpiTemplateResult,
} from '../types/kpiWorkflow';

const M_BASE = '/kpi-workflow';

export const kpiWorkflowService = {
  async listManagerTemplates(): Promise<ManagerKpiTemplateSummary[]> {
    try {
      const response = await api.get<ManagerKpiTemplateSummary[]>(`${M_BASE}/templates`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI templates.'));
    }
  },

  async listAssignments(kpiFormId: number): Promise<ManagerKpiAssignment[]> {
    try {
      const response = await api.get<ManagerKpiAssignment[]>(`${M_BASE}/assignments`, {
        params: { kpiFormId },
      });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI assignments.'));
    }
  },

  async managerHistory(): Promise<ManagerKpiAssignment[]> {
    try {
      const response = await api.get<ManagerKpiAssignment[]>(`${M_BASE}/history`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI history.'));
    }
  },

  async updateScores(
    employeeKpiFormId: number,
    scores: { kpiFormItemId: number; actualValue?: number | null; score?: number | null }[],
  ): Promise<ManagerKpiAssignment> {
    try {
      const response = await api.put<ManagerKpiAssignment>(
        `${M_BASE}/assignments/${employeeKpiFormId}/scores`,
        { scores },
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to save scores.'));
    }
  },

  async finalizeDepartment(kpiFormId: number): Promise<UseKpiTemplateResult> {
    try {
      const response = await api.post<UseKpiTemplateResult>(`${M_BASE}/finalize`, { kpiFormId });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to finalize KPI.'));
    }
  },

  async finalizeEmployee(employeeKpiFormId: number, reason: string): Promise<ManagerKpiAssignment> {
    try {
      const response = await api.post<ManagerKpiAssignment>(
        `${M_BASE}/assignments/${employeeKpiFormId}/finalize`,
        { reason },
      );
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to finalize employee KPI.'));
    }
  },

  async myFinalizedResults(): Promise<EmployeeKpiResult[]> {
    try {
      const response = await api.get<EmployeeKpiResult[]>('/employee/kpis/my-results');
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load KPI results.'));
    }
  },

  async hrFinalizedResults(): Promise<HrEmployeeKpiRow[]> {
    try {
      const response = await api.get<HrEmployeeKpiRow[]>('/hr/employee-kpis/finalized-results');
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load employee KPI results.'));
    }
  },

  async hrInProgressResults(): Promise<HrEmployeeKpiRow[]> {
    try {
      const response = await api.get<HrEmployeeKpiRow[]>('/hr/employee-kpis/in-progress-results');
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load in-progress KPI scores.'));
    }
  },
};
