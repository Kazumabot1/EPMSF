import api from './api';
import { extractApiErrorMessage } from './apiError';
import type {
  DepartmentKpiCycle,
  DepartmentKpiCycleRequest,
  DepartmentKpiResult,
  DepartmentKpiTemplate,
  DepartmentKpiTemplateRequest,
  DepartmentKpiTemplateSummary,
} from '../types/departmentKpi';
import type { KpiGraceExtension } from '../types/kpiTemplateCycle';

const TEMPLATE_BASE = '/hr/department-kpi-templates';
const CYCLE_BASE = '/hr/department-kpi-cycles';
const WORKFLOW_BASE = '/hr/department-kpi-workflow';

export const departmentKpiTemplateService = {
  async list(): Promise<DepartmentKpiTemplate[]> {
    try {
      const response = await api.get<DepartmentKpiTemplate[]>(`${TEMPLATE_BASE}/list`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI templates.'));
    }
  },
  async get(id: number): Promise<DepartmentKpiTemplate> {
    try {
      const response = await api.get<DepartmentKpiTemplate>(`${TEMPLATE_BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI template.'));
    }
  },
  async create(payload: DepartmentKpiTemplateRequest): Promise<DepartmentKpiTemplate> {
    try {
      const response = await api.post<DepartmentKpiTemplate>(`${TEMPLATE_BASE}/create`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create Department KPI template.'));
    }
  },
  async update(id: number, payload: DepartmentKpiTemplateRequest): Promise<DepartmentKpiTemplate> {
    try {
      const response = await api.put<DepartmentKpiTemplate>(`${TEMPLATE_BASE}/update/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update Department KPI template.'));
    }
  },
  async delete(id: number): Promise<void> {
    try {
      await api.delete(`${TEMPLATE_BASE}/delete/${id}`);
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to archive Department KPI template.'));
    }
  },
};

export const departmentKpiCycleService = {
  async list(): Promise<DepartmentKpiCycle[]> {
    try {
      const response = await api.get<DepartmentKpiCycle[]>(CYCLE_BASE);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI cycles.'));
    }
  },
  async get(id: number): Promise<DepartmentKpiCycle> {
    try {
      const response = await api.get<DepartmentKpiCycle>(`${CYCLE_BASE}/${id}`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI cycle.'));
    }
  },
  async create(payload: DepartmentKpiCycleRequest): Promise<DepartmentKpiCycle> {
    try {
      const response = await api.post<DepartmentKpiCycle>(CYCLE_BASE, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to create Department KPI cycle.'));
    }
  },
  async update(id: number, payload: DepartmentKpiCycleRequest): Promise<DepartmentKpiCycle> {
    try {
      const response = await api.put<DepartmentKpiCycle>(`${CYCLE_BASE}/${id}`, payload);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update Department KPI cycle.'));
    }
  },
  async updateStatus(id: number, active: boolean, reason?: string, graceExtension?: KpiGraceExtension): Promise<DepartmentKpiCycle> {
    try {
      const response = await api.patch<DepartmentKpiCycle>(`${CYCLE_BASE}/${id}/status`, {
        active,
        ...(reason ? { reason } : {}),
        ...(graceExtension ? { graceExtension } : {}),
      });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to update Department KPI cycle status.'));
    }
  },
};

export const departmentKpiWorkflowService = {
  async templates(): Promise<DepartmentKpiTemplateSummary[]> {
    try {
      const response = await api.get<DepartmentKpiTemplateSummary[]>(`${WORKFLOW_BASE}/templates`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI scoring list.'));
    }
  },
  async assignments(templateId: number, cyclePeriodId?: number | null): Promise<DepartmentKpiResult[]> {
    try {
      const response = await api.get<DepartmentKpiResult[]>(`${WORKFLOW_BASE}/assignments`, {
        params: { templateId, ...(cyclePeriodId != null ? { cyclePeriodId } : {}) },
      });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI assignments.'));
    }
  },
  async updateScores(resultId: number, scores: { templateRowId: number; actualValue?: number | null }[]): Promise<DepartmentKpiResult> {
    try {
      const response = await api.put<DepartmentKpiResult>(`${WORKFLOW_BASE}/results/${resultId}/scores`, { scores });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to save Department KPI scores.'));
    }
  },
  async finalizeResult(resultId: number): Promise<DepartmentKpiResult> {
    try {
      const response = await api.post<DepartmentKpiResult>(`${WORKFLOW_BASE}/results/${resultId}/finalize`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to finalize Department KPI result.'));
    }
  },
  async finalizeTemplate(templateId: number, cyclePeriodId?: number | null): Promise<number> {
    try {
      const response = await api.post<{ finalized: number }>(`${WORKFLOW_BASE}/finalize`, {
        templateId,
        ...(cyclePeriodId != null ? { cyclePeriodId } : {}),
      });
      return response.data.finalized;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to finalize Department KPI results.'));
    }
  },
  async finalizedResults(): Promise<DepartmentKpiResult[]> {
    try {
      const response = await api.get<DepartmentKpiResult[]>(`${WORKFLOW_BASE}/finalized-results`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI results.'));
    }
  },
  async inProgressResults(): Promise<DepartmentKpiResult[]> {
    try {
      const response = await api.get<DepartmentKpiResult[]>(`${WORKFLOW_BASE}/in-progress-results`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI progress.'));
    }
  },
  async departmentHeadResults(): Promise<DepartmentKpiResult[]> {
    try {
      const response = await api.get<DepartmentKpiResult[]>('/department-head/department-kpis/results');
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI results.'));
    }
  },
};

const APPROVAL_BASE = '/executive/department-kpi-approvals';

export const departmentKpiApprovalService = {
  async listPendingEarlyCloseRequests(): Promise<DepartmentKpiCycle[]> {
    try {
      const response = await api.get<DepartmentKpiCycle[]>(`${APPROVAL_BASE}/cycles`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI early close requests.'));
    }
  },
  async approveEarlyClose(id: number, reviewReason?: string): Promise<DepartmentKpiCycle> {
    try {
      const response = await api.post<DepartmentKpiCycle>(`${APPROVAL_BASE}/cycles/${id}/approve`, { reviewReason });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to approve Department KPI early close request.'));
    }
  },
  async rejectEarlyClose(id: number, reviewReason?: string): Promise<DepartmentKpiCycle> {
    try {
      const response = await api.post<DepartmentKpiCycle>(`${APPROVAL_BASE}/cycles/${id}/reject`, { reviewReason });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to reject Department KPI early close request.'));
    }
  },
  async listPendingFinalizationRequests(): Promise<DepartmentKpiResult[]> {
    try {
      const response = await api.get<DepartmentKpiResult[]>(`${APPROVAL_BASE}/finalizations`);
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to load Department KPI finalization requests.'));
    }
  },
  async approveFinalization(resultId: number, reviewReason?: string): Promise<DepartmentKpiResult> {
    try {
      const response = await api.post<DepartmentKpiResult>(`${APPROVAL_BASE}/finalizations/${resultId}/approve`, { reviewReason });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to approve Department KPI finalization request.'));
    }
  },
  async rejectFinalization(resultId: number, reviewReason?: string): Promise<DepartmentKpiResult> {
    try {
      const response = await api.post<DepartmentKpiResult>(`${APPROVAL_BASE}/finalizations/${resultId}/reject`, { reviewReason });
      return response.data;
    } catch (error) {
      throw new Error(extractApiErrorMessage(error, 'Failed to reject Department KPI finalization request.'));
    }
  },
};
