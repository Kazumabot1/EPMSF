

import api from './api';

export interface Department {
  id: number;
  departmentName?: string;
  name?: string;
}

export interface CandidateUser {
  id: number;
  name: string;
  type?: string;
  sourceType?: string;

  departmentId?: number;
  departmentName?: string;

  employeeId?: number | null;

  available?: boolean;
  isAvailable?: boolean;

  currentTeamId?: number | null;
  currentTeamName?: string | null;

  /**
   * Used for Project Manager selection.
   * Example: "Team A, Team B"
   */
  currentTeamNames?: string | null;
}

export interface TeamMemberResponse {
  userId?: number;
  employeeId?: number;
  userName?: string;
  employeeName?: string;
  startedDate?: string;
}

export interface TeamRequest {
  teamName: string;
  departmentId: number;
  teamLeaderId: number;

  /**
   * Optional Project Manager.
   */
  projectManagerId?: number | null;

  createdById?: number;
  teamGoal: string;
  status: string;

  /**
   * Required only when editing team.
   * Create Team uses backend default reason.
   */
  reason?: string;

  memberUserIds?: number[];
  memberEmployeeIds?: number[];
}

export interface TeamResponse {
  id: number;
  teamName: string;

  departmentId: number;
  departmentName: string;

  teamLeaderId: number;
  teamLeaderName: string;

  projectManagerId?: number | null;
  projectManagerName?: string | null;
  projectManagerTeams?: string | null;

  createdById: number;
  createdByName: string;

  createdDate: string;
  status: string;
  teamGoal: string;

  members: TeamMemberResponse[];
}

export interface TeamHistoryResponse {
  id: number;

  teamId: number;
  teamName: string;

  actionType: string;
  fieldName?: string | null;

  oldValue?: string | null;
  newValue?: string | null;

  reason?: string | null;

  changedById?: number | null;
  changedByName?: string | null;

  changedAt?: string | null;
}

const unwrap = <T>(response: any): T => {
  if (response?.data?.data !== undefined) {
    return response.data.data;
  }

  return response.data as T;
};

const normalizeCandidate = (candidate: CandidateUser): CandidateUser => {
  const available = candidate.available ?? candidate.isAvailable ?? true;

  return {
    ...candidate,
    available,
    isAvailable: available,
  };
};

export const fetchDepartments = async (): Promise<Department[]> => {
  const response = await api.get('/departments');
  return unwrap<Department[]>(response);
};

export const fetchTeams = async (): Promise<TeamResponse[]> => {
  const response = await api.get('/teams');
  return unwrap<TeamResponse[]>(response);
};

export const fetchTeamsByDepartment = async (
  departmentId: number
): Promise<TeamResponse[]> => {
  const response = await api.get(`/teams/department/${departmentId}`);
  return unwrap<TeamResponse[]>(response);
};

export const fetchMyDepartmentTeams = async (): Promise<TeamResponse[]> => {
  const response = await api.get('/teams/my-department');
  return unwrap<TeamResponse[]>(response);
};

export const fetchCandidateUsers = async (
  departmentId: number
): Promise<CandidateUser[]> => {
  const response = await api.get(`/teams/candidates/users/${departmentId}`);
  return unwrap<CandidateUser[]>(response).map(normalizeCandidate);
};

export const fetchCandidateMembers = async (
  departmentId: number
): Promise<CandidateUser[]> => {
  const response = await api.get(`/teams/candidates/members/${departmentId}`);
  return unwrap<CandidateUser[]>(response).map(normalizeCandidate);
};

export const fetchCandidateProjectManagers = async (
  departmentId: number
): Promise<CandidateUser[]> => {
  const response = await api.get(`/teams/candidates/project-managers/${departmentId}`);
  return unwrap<CandidateUser[]>(response).map(normalizeCandidate);
};

export const fetchMyDepartmentCandidateUsers = async (): Promise<CandidateUser[]> => {
  const response = await api.get('/teams/my-department/candidates/users');
  return unwrap<CandidateUser[]>(response).map(normalizeCandidate);
};

export const fetchMyDepartmentCandidateMembers = async (): Promise<CandidateUser[]> => {
  const response = await api.get('/teams/my-department/candidates/members');
  return unwrap<CandidateUser[]>(response).map(normalizeCandidate);
};

export const fetchMyDepartmentCandidateProjectManagers = async (): Promise<CandidateUser[]> => {
  const response = await api.get('/teams/my-department/candidates/project-managers');
  return unwrap<CandidateUser[]>(response).map(normalizeCandidate);
};

export const createTeam = async (
  request: TeamRequest
): Promise<TeamResponse> => {
  const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];

  const response = await api.post('/teams', {
    ...request,
    memberUserIds: memberIds,
    memberEmployeeIds: memberIds,
    projectManagerId: request.projectManagerId ?? null,
  });

  return unwrap<TeamResponse>(response);
};

export const createMyDepartmentTeam = async (
  request: TeamRequest
): Promise<TeamResponse> => {
  const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];

  const response = await api.post('/teams/my-department', {
    ...request,
    memberUserIds: memberIds,
    memberEmployeeIds: memberIds,
    projectManagerId: request.projectManagerId ?? null,
  });

  return unwrap<TeamResponse>(response);
};

export const updateTeam = async (
  id: number,
  request: TeamRequest
): Promise<TeamResponse> => {
  const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];

  const response = await api.put(`/teams/${id}`, {
    ...request,
    memberUserIds: memberIds,
    memberEmployeeIds: memberIds,
    projectManagerId: request.projectManagerId ?? null,
  });

  return unwrap<TeamResponse>(response);
};

export const updateMyDepartmentTeam = async (
  id: number,
  request: TeamRequest
): Promise<TeamResponse> => {
  const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];

  const response = await api.put(`/teams/my-department/${id}`, {
    ...request,
    memberUserIds: memberIds,
    memberEmployeeIds: memberIds,
    projectManagerId: request.projectManagerId ?? null,
  });

  return unwrap<TeamResponse>(response);
};

export const deleteTeam = async (id: number): Promise<void> => {
  await api.delete(`/teams/${id}`);
};

export const fetchTeamHistory = async (
  teamId: number
): Promise<TeamHistoryResponse[]> => {
  const response = await api.get(`/teams/${teamId}/history`);
  return unwrap<TeamHistoryResponse[]>(response);
};

export const fetchMyDepartmentTeamHistory = async (
  teamId: number
): Promise<TeamHistoryResponse[]> => {
  const response = await api.get(`/teams/my-department/${teamId}/history`);
  return unwrap<TeamHistoryResponse[]>(response);
};

export const formatCandidateLabel = (candidate: CandidateUser): string => {
  if (!candidate.currentTeamNames) {
    return candidate.name;
  }

  if (String(candidate.type ?? '').toLowerCase().includes('project manager')) {
    return `${candidate.name} (Also Project Manager in: ${candidate.currentTeamNames})`;
  }

  return `${candidate.name} (Already in ${candidate.currentTeamNames})`;
};

export const countReasonWords = (reason: string): number => {
  const clean = reason.trim();

  if (!clean) {
    return 0;
  }

  return clean.split(/\s+/).length;
};

export const isReasonOverLimit = (reason: string): boolean => {
  return countReasonWords(reason) > 250;
};
export const fetchMyTeams = async (): Promise<TeamResponse[]> => {
  const response = await api.get('/my-team');
  return unwrap<TeamResponse[]>(response);
};
