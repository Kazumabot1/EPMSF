// pipService.ts

/*
  Why this file exists:
  - Central API helper for PIP feature.
  - Keeps axios/fetch logic out of React UI pages.
  - Uses the existing backend endpoints:
    /api/pips/eligible-employees
    /api/pips
    /api/pips/ongoing
    /api/pips/past
    /api/pips/{id}
    /api/pips/{pipId}/phases/{phaseId}
    /api/pips/{id}/finish
*/

import api from "./api";
import type {
  PipCreateRequest,
  PipDetail,
  PipEligibleEmployee,
  PipFinishRequest,
  PipPhaseUpdateRequest,
} from "../types/pip";

function unwrap<T>(response: any): T {
  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }

  return response.data as T;
}

export const pipService = {
  async getEligibleEmployees(): Promise<PipEligibleEmployee[]> {
    const response = await api.get("/pips/eligible-employees");
    return unwrap<PipEligibleEmployee[]>(response);
  },

  async createPip(payload: PipCreateRequest): Promise<PipDetail> {
    const response = await api.post("/pips", payload);
    return unwrap<PipDetail>(response);
  },

  async getOngoingPips(): Promise<PipDetail[]> {
    const response = await api.get("/pips/ongoing");
    return unwrap<PipDetail[]>(response);
  },

  async getPastPips(): Promise<PipDetail[]> {
    const response = await api.get("/pips/past");
    return unwrap<PipDetail[]>(response);
  },

  async getPipById(id: number): Promise<PipDetail> {
    const response = await api.get(`/pips/${id}`);
    return unwrap<PipDetail>(response);
  },

  async updatePhase(
    pipId: number,
    phaseId: number,
    payload: PipPhaseUpdateRequest
  ): Promise<PipDetail> {
    const response = await api.put(`/pips/${pipId}/phases/${phaseId}`, payload);
    return unwrap<PipDetail>(response);
  },

  async finishPip(id: number, payload: PipFinishRequest): Promise<PipDetail> {
    const response = await api.post(`/pips/${id}/finish`, payload);
    return unwrap<PipDetail>(response);
  },
};