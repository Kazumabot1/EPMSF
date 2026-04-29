import api from './api';

export interface EmployeeResponse {
  id: number;
  firstName?: string;
  lastName?: string;
  fullName?: string;
  email?: string;
  positionName?: string;
  positionTitle?: string;
  active?: boolean;
  currentDepartmentId?: number;
  currentDepartmentName?: string;
}

export interface TeamMemberInfo {
  userId?: number;
  employeeId?: number;
  fullName?: string;
  name?: string;
  startedDate?: string;
}

export interface TeamResponse {
  id: number;
  teamName: string;
  departmentId?: number;
  departmentName?: string;
  teamLeaderId?: number;
  teamLeaderName?: string;
  createdById?: number;
  createdByName?: string;
  createdDate?: string;
  status?: string;
  teamGoal?: string;
  members?: TeamMemberInfo[];
}

export interface CandidateUser {
  id: number;
  name: string;
  sourceType?: string;
  departmentId?: number;
  employeeId?: number | null;
  isAvailable?: boolean;
  currentTeamId?: number | null;
  currentTeamName?: string | null;
}

export interface TeamRequest {
  teamName: string;
  teamLeaderId: number;
  teamGoal?: string;
  status?: string;
  memberUserIds?: number[];
  memberEmployeeIds?: number[];
}

export interface DepartmentHeadDashboardResponse {
  departmentId: number;
  departmentName: string;
  employeeCount: number;
  teamCount: number;
  employees: EmployeeResponse[];
  teams: TeamResponse[];
}

type GenericApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
};

const unwrap = <T>(response: { data: GenericApiResponse<T> }): T => response.data.data;

export const fetchDepartmentHeadDashboard = async (
  includeInactive = false
): Promise<DepartmentHeadDashboardResponse> => {
  const response = await api.get<GenericApiResponse<DepartmentHeadDashboardResponse>>(
    '/department-head/dashboard',
    { params: { includeInactive } }
  );

  return unwrap(response);
};

export const fetchDepartmentHeadEmployees = async (
  includeInactive = false
): Promise<EmployeeResponse[]> => {
  const response = await api.get<GenericApiResponse<EmployeeResponse[]>>(
    '/department-head/employees',
    { params: { includeInactive } }
  );

  return unwrap(response);
};

export const fetchDepartmentHeadTeams = async (): Promise<TeamResponse[]> => {
  const response = await api.get<GenericApiResponse<TeamResponse[]>>(
    '/department-head/teams'
  );

  return unwrap(response);
};

export const fetchDepartmentHeadCandidateUsers = async (): Promise<CandidateUser[]> => {
  const response = await api.get<GenericApiResponse<CandidateUser[]>>(
    '/department-head/teams/candidates/users'
  );

  return unwrap(response);
};

export const fetchDepartmentHeadCandidateMembers = async (): Promise<CandidateUser[]> => {
  const response = await api.get<GenericApiResponse<CandidateUser[]>>(
    '/department-head/teams/candidates/members'
  );

  return unwrap(response);
};

export const createDepartmentHeadTeam = async (
  request: TeamRequest
): Promise<TeamResponse> => {
  const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];

  const response = await api.post<GenericApiResponse<TeamResponse>>(
    '/department-head/teams',
    {
      ...request,
      departmentId: 0,
      createdById: 0,
      memberUserIds: memberIds,
      memberEmployeeIds: memberIds,
    }
  );

  return unwrap(response);
};

export const updateDepartmentHeadTeam = async (
  id: number,
  request: TeamRequest
): Promise<TeamResponse> => {
  const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];

  const response = await api.put<GenericApiResponse<TeamResponse>>(
    `/department-head/teams/${id}`,
    {
      ...request,
      departmentId: 0,
      createdById: 0,
      memberUserIds: memberIds,
      memberEmployeeIds: memberIds,
    }
  );

  return unwrap(response);
};