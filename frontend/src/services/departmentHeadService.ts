import { isAxiosError } from 'axios';
import api from './api';

export type DepartmentHeadDashboardData = {
  department?: any | null;
  departmentId?: number | null;
  departmentName?: string | null;
  totalEmployees?: number;
  activeEmployees?: number;
  totalTeams?: number;
  activeTeams?: number;
  employees?: any[];
  teams?: any[];
  recentActivities?: any[];
  warnings?: string[];
  [key: string]: any;
};

export type DepartmentHeadCandidate = {
  id: number;
  userId?: number;
  name?: string;
  fullName?: string;
  email?: string;
  employeeCode?: string;
  departmentId?: number;
  departmentName?: string;
  positionName?: string;
  positionTitle?: string;
  available?: boolean;
  currentTeamId?: number | null;
  currentTeamName?: string | null;
  currentTeamNames?: string | null;
  [key: string]: any;
};

export type DepartmentHeadTeam = {
  id?: number;
  teamName?: string;
  departmentId?: number;
  departmentName?: string;
  teamLeaderId?: number;
  teamLeaderName?: string;
  projectManagerId?: number | null;
  projectManagerName?: string | null;
  status?: string;
  members?: any[];
  [key: string]: any;
};

const unwrap = <T,>(payload: any, fallback: T): T => {
  if (payload?.data?.data !== undefined) return payload.data.data as T;
  if (payload?.data !== undefined) return payload.data as T;
  return fallback;
};

const is422 = (error: unknown) => isAxiosError(error) && error.response?.status === 422;

const messageOf = (error: unknown, fallback: string) => {
  if (isAxiosError(error)) {
    const data = error.response?.data;

    if (typeof data === 'string') return data;

    if (data && typeof data === 'object') {
      const message = (data as { message?: unknown; error?: unknown }).message;
      const errorText = (data as { message?: unknown; error?: unknown }).error;

      if (typeof message === 'string' && message.trim()) return message;
      if (typeof errorText === 'string' && errorText.trim()) return errorText;
    }
  }

  if (error instanceof Error && error.message) return error.message;

  return fallback;
};

const emptyDashboard = (warning?: string): DepartmentHeadDashboardData => ({
  department: null,
  departmentId: null,
  departmentName: '',
  totalEmployees: 0,
  activeEmployees: 0,
  totalTeams: 0,
  activeTeams: 0,
  employees: [],
  teams: [],
  recentActivities: [],
  warnings: warning ? [warning] : [],
});

export const fetchDepartmentHeadDashboard = async (
  includeInactive = false,
): Promise<DepartmentHeadDashboardData> => {
  try {
    const response = await api.get('/department-head/dashboard', {
      params: { includeInactive },
    });

    return unwrap<DepartmentHeadDashboardData>(response, emptyDashboard());
  } catch (error) {
    if (is422(error)) {
      return emptyDashboard(
        messageOf(
          error,
          'This account is using Department Head dashboard but no working department was found.',
        ),
      );
    }

    throw error;
  }
};

export const fetchDepartmentHeadTeams = async (): Promise<DepartmentHeadTeam[]> => {
  try {
    const response = await api.get('/department-head/teams');
    const data = unwrap<DepartmentHeadTeam[]>(response, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (is422(error)) return [];
    throw error;
  }
};

export const fetchDepartmentHeadCandidateUsers = async (): Promise<DepartmentHeadCandidate[]> => {
  try {
    const response = await api.get('/department-head/teams/candidates/users');
    const data = unwrap<DepartmentHeadCandidate[]>(response, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (is422(error)) return [];
    throw error;
  }
};

export const fetchDepartmentHeadCandidateMembers = async (): Promise<DepartmentHeadCandidate[]> => {
  try {
    const response = await api.get('/department-head/teams/candidates/members');
    const data = unwrap<DepartmentHeadCandidate[]>(response, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (is422(error)) return [];
    throw error;
  }
};

export const fetchDepartmentHeadCandidateProjectManagers = async (): Promise<
  DepartmentHeadCandidate[]
> => {
  try {
    const response = await api.get('/department-head/teams/candidates/project-managers');
    const data = unwrap<DepartmentHeadCandidate[]>(response, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (is422(error)) return [];
    throw error;
  }
};

export const createDepartmentHeadTeam = async (payload: any): Promise<DepartmentHeadTeam> => {
  const response = await api.post('/department-head/teams', payload);
  return unwrap<DepartmentHeadTeam>(response, {});
};

export const updateDepartmentHeadTeam = async (
  teamId: number,
  payload: any,
): Promise<DepartmentHeadTeam> => {
  const response = await api.put(`/department-head/teams/${teamId}`, payload);
  return unwrap<DepartmentHeadTeam>(response, {});
};

export const fetchDepartmentHeadTeamHistory = async (teamId: number): Promise<any[]> => {
  try {
    const response = await api.get(`/department-head/teams/${teamId}/history`);
    const data = unwrap<any[]>(response, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (is422(error)) return [];
    throw error;
  }
};