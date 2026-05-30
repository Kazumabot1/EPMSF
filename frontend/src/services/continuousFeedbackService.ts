import api from './api';
import type { TeamEmployeeOption, TeamOption } from './oneOnOneService';

export interface ContinuousFeedback {
  id: number;
  teamId?: number | null;
  teamName?: string | null;
  employeeId: number;
  employeeName: string;
  employeeEmail?: string | null;
  employeeDepartmentName?: string | null;
  giverUserId: number;
  giverName: string;
  giverEmail?: string | null;
  giverDepartmentName?: string | null;
  feedbackText: string;
  category: string;
  rating?: number | null;
  createdAt: string;
  updatedAt?: string | null;
}

export interface ContinuousFeedbackRequest {
  teamId?: number | null;
  employeeId: number;
  feedbackText: string;
  category: string;
  rating?: number | null;
}

function unwrap<T>(response: any): T {
  if (response?.data?.data !== undefined) {
    return response.data.data as T;
  }

  return response.data as T;
}

export async function getContinuousFeedbackTeams(): Promise<TeamOption[]> {
  const response = await api.get('/continuous-feedback/my-teams');
  return unwrap<TeamOption[]>(response);
}

export async function getContinuousFeedbackTeamEmployees(teamId: number): Promise<TeamEmployeeOption[]> {
  const response = await api.get(`/continuous-feedback/teams/${teamId}/employees`);
  return unwrap<TeamEmployeeOption[]>(response);
}

export async function getContinuousFeedbackEmployees(teamId?: number | null): Promise<TeamEmployeeOption[]> {
  const response = await api.get('/continuous-feedback/employees', {
    params: teamId ? { teamId } : undefined,
  });
  return unwrap<TeamEmployeeOption[]>(response);
}

export async function createContinuousFeedback(
  payload: ContinuousFeedbackRequest,
): Promise<ContinuousFeedback> {
  const response = await api.post('/continuous-feedback', payload);
  return unwrap<ContinuousFeedback>(response);
}

export async function getGivenContinuousFeedback(): Promise<ContinuousFeedback[]> {
  const response = await api.get('/continuous-feedback/given');
  return unwrap<ContinuousFeedback[]>(response);
}

export async function getReceivedContinuousFeedback(): Promise<ContinuousFeedback[]> {
  const response = await api.get('/continuous-feedback/received');
  return unwrap<ContinuousFeedback[]>(response);
}

export async function getVisibleContinuousFeedback(): Promise<ContinuousFeedback[]> {
  const response = await api.get('/continuous-feedback/visible');
  return unwrap<ContinuousFeedback[]>(response);
}
