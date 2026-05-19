

import { isAxiosError } from 'axios';
import api from './api';

import { ApiRequestError, extractApiErrorMessage, toApiRequestError } from './apiError';

import type { UseKpiTemplateResult } from '../types/kpiWorkflow';

import type { KpiPositionAssignment } from '../types/kpiPositionAssignment';
import type { KpiPositionAvailability } from '../types/kpiPositionAvailability';
import type { PositionResponse } from '../types/position';

import type { KpiTemplateRequest, KpiTemplateResponse } from '../types/kpiTemplate';



const BASE = '/hr/kpi-templates';



function normalizePositionAssignments(data: unknown): KpiPositionAssignment[] {

  if (!Array.isArray(data)) {

    return [];

  }

  if (data.length === 0) {

    return [];

  }

  if (typeof data[0] === 'number') {

    return (data as number[]).map((positionId) => ({

      positionId,

      positionTitle: '',

      templateId: 0,

      templateTitle: '',

    }));

  }

  return data as KpiPositionAssignment[];

}



async function enrichAssignmentsWithTemplateIds(

  rows: KpiPositionAssignment[],

): Promise<KpiPositionAssignment[]> {

  const needsTemplateId = rows.some((row) => row.templateId == null || row.templateId === 0);

  if (!needsTemplateId) {

    return rows;

  }



  let templates: KpiTemplateResponse[];
  try {
    const listResponse = await api.get<KpiTemplateResponse[]>(`${BASE}/list`);
    templates = listResponse.data;
  } catch {
    return rows;
  }

  return rows.map((row) => {

    if (row.templateId != null && row.templateId > 0) {

      return row;

    }

    const template = templates.find((t) =>

      t.positions.some((link) => link.positionId === row.positionId),

    );

    if (template == null) {

      return row;

    }

    const positionLink = template.positions.find((link) => link.positionId === row.positionId);

    return {

      positionId: row.positionId,

      positionTitle: positionLink?.positionTitle ?? row.positionTitle,

      templateId: template.id,

      templateTitle: template.title,

    };

  });

}



export const kpiTemplateService = {

  /** Positions that can receive a new KPI template (authoritative; same rules as create duplicate guard). */
  async getAvailablePositions(excludeFormId?: number): Promise<PositionResponse[]> {
    const params: { excludeFormId?: number } = {};
    if (excludeFormId != null) {
      params.excludeFormId = excludeFormId;
    }
    try {
      const response = await api.get<PositionResponse[]>(`${BASE}/available-positions`, { params });
      return response.data;
    } catch (primaryError) {
      if (!isAxiosError(primaryError)) {
        throw toApiRequestError(primaryError, 'Failed to load available positions.');
      }
      const status = primaryError.response?.status;
      if (status !== 403 && status !== 404) {
        throw toApiRequestError(primaryError, 'Failed to load available positions.');
      }
      try {
        const fallback = await api.get<PositionResponse[]>(`${BASE}/assigned-position-ids`, {
          params: { ...params, view: 'available' },
        });
        return fallback.data;
      } catch (fallbackError) {
        throw toApiRequestError(primaryError, 'Failed to load available positions.');
      }
    }
  },

  /** Active position → template links (GET assigned-position-ids). */

  async getPositionAssignments(excludeFormId?: number): Promise<KpiPositionAssignment[]> {

    try {

      const response = await api.get<unknown>(`${BASE}/assigned-position-ids`, {

        params: excludeFormId != null ? { excludeFormId } : undefined,

      });

      const rows = normalizePositionAssignments(response.data);

      return enrichAssignmentsWithTemplateIds(rows);

    } catch (error) {

      throw toApiRequestError(error, 'Failed to load KPI position assignments.');

    }

  },



  async resolveTemplateIdForPosition(

    positionId: number,

    excludeFormId?: number,

  ): Promise<number | null> {

    try {

      const assignments = await this.getPositionAssignments(excludeFormId);

      const hit = assignments.find((row) => row.positionId === positionId);

      if (hit?.templateId != null && hit.templateId > 0) {

        return hit.templateId;

      }

    } catch {

      // fall through to list

    }



    const templates = await this.getAllTemplates();

    for (const template of templates) {

      if (template.positions.some((link) => link.positionId === positionId)) {

        return template.id;

      }

    }

    return null;

  },



  async createTemplate(payload: KpiTemplateRequest): Promise<KpiTemplateResponse> {
    const positionId = payload.positionIds?.length === 1 ? payload.positionIds[0] : undefined;
    if (positionId != null) {
      const availability = await this.checkPositionAvailability(positionId);
      if (!availability.available) {
        throw new ApiRequestError(
          availability.templateTitle
            ? `This position already has a KPI form: ${availability.templateTitle}.`
            : 'This position already has a KPI form. Choose another position or edit the existing form.',
          {
            status: 409,
            existingTemplateId:
              availability.existingTemplateId != null && availability.existingTemplateId > 0
                ? availability.existingTemplateId
                : undefined,
          },
        );
      }
    }

    try {

      const response = await api.post<KpiTemplateResponse>(`${BASE}/create`, payload);

      return response.data;

    } catch (error) {

      throw toApiRequestError(error, 'Failed to create KPI template.');

    }

  },



  async updateTemplate(id: number, payload: KpiTemplateRequest): Promise<KpiTemplateResponse> {

    try {

      const response = await api.put<KpiTemplateResponse>(`${BASE}/update/${id}`, payload);

      return response.data;

    } catch (error) {

      throw toApiRequestError(error, 'Failed to update KPI template.');

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



  /** Pre-create check on GET assigned-position-ids?checkPositionId= (same path as assignment list). */
  async checkPositionAvailability(
    positionId: number,
    excludeFormId?: number,
  ): Promise<KpiPositionAvailability> {
    const params: { checkPositionId: number; excludeFormId?: number } = { checkPositionId: positionId };
    if (excludeFormId != null) {
      params.excludeFormId = excludeFormId;
    }
    try {
      const response = await api.get<KpiPositionAvailability>(`${BASE}/assigned-position-ids`, { params });
      return response.data;
    } catch (error) {
      return this.checkPositionAvailabilityFromAssignedList(positionId, excludeFormId, error);
    }
  },

  async checkPositionAvailabilityFromAssignedList(
    positionId: number,
    excludeFormId?: number,
    error?: unknown,
  ): Promise<KpiPositionAvailability> {
    try {
      const assigned = await this.getAssignedPositionIdsOnly(excludeFormId);
      if (!assigned.includes(positionId)) {
        return { available: true };
      }
      const templateId = await this.resolveTemplateIdForPosition(positionId, excludeFormId);
      return {
        available: false,
        existingTemplateId: templateId ?? undefined,
      };
    } catch {
      if (error != null) {
        throw toApiRequestError(error, 'Failed to verify position availability.');
      }
      throw new Error('Failed to verify position availability.');
    }
  },

  /** Legacy-friendly: returns position ids even when full assignment DTOs are unavailable. */
  async getAssignedPositionIdsOnly(excludeFormId?: number): Promise<number[]> {
    const response = await api.get<unknown>(`${BASE}/assigned-position-ids`, {
      params: excludeFormId != null ? { excludeFormId } : undefined,
    });
    const data = response.data;
    if (!Array.isArray(data)) {
      return [];
    }
    if (data.length === 0 || typeof data[0] === 'number') {
      return data as number[];
    }
    return (data as KpiPositionAssignment[]).map((row) => row.positionId);
  },

  async getAssignedPositionIds(excludeFormId?: number): Promise<number[]> {
    try {
      const assignments = await this.getPositionAssignments(excludeFormId);
      return assignments.map((row) => row.positionId);
    } catch {
      return this.getAssignedPositionIdsOnly(excludeFormId);
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



  async useForDepartment(

    templateId: number,

    payload:

      | { applyToAllDepartments: true }

      | { departmentIds: number[] }

      | { departmentId: number },

  ): Promise<UseKpiTemplateResult> {

    try {

      let body: { applyToAllDepartments?: true; departmentIds?: number[]; departmentId?: number };



      if ('applyToAllDepartments' in payload && payload.applyToAllDepartments === true) {

        body = { applyToAllDepartments: true };

      } else if ('departmentIds' in payload) {

        body = { departmentIds: payload.departmentIds };

      } else if ('departmentId' in payload) {

        body = { departmentId: payload.departmentId };

      } else {

        throw new Error('Department selection is required.');

      }

      const response = await api.post<UseKpiTemplateResult>(

        `${BASE}/${templateId}/use-for-department`,

        body,

      );

      return response.data;

    } catch (error) {

      throw new Error(extractApiErrorMessage(error, 'Could not apply KPI to department.'));

    }

  },

};


