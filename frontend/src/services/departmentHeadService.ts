import { isAxiosError } from 'axios';
import api from './api';

export type DepartmentHeadEmployee = {
  id?: number;
  userId?: number;
  employeeCode?: string;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  phoneNumber?: string;
  email?: string;
  positionTitle?: string;
  positionName?: string;
  positionLevelCode?: string;
  positionRoleName?: string;
  dashboard?: string;
  managerId?: number | null;
  managerName?: string | null;
  managerEmail?: string | null;
  active?: boolean;
  currentDepartmentId?: number | null;
  currentDepartment?: string | null;
  parentDepartmentId?: number | null;
  parentDepartment?: string | null;
  workingDepartmentId?: number | null;
  workingDepartment?: string | null;
  profileImageData?: string | null;
  profileImageType?: string | null;
  profile_image_data?: string | null;
  profile_image_type?: string | null;
  avatarData?: string | null;
  avatarType?: string | null;
  profilePictureData?: string | null;
  profilePictureType?: string | null;
  profilePicture?: string | null;
  [key: string]: unknown;
};

export type DepartmentHeadTeamMember = {
  userId?: number;
  employeeId?: number;
  userName?: string;
  employeeName?: string;
  startedDate?: string | null;
  [key: string]: unknown;
};

export type DepartmentHeadTeam = {
  id: number;
  teamName?: string;
  departmentId?: number;
  departmentName?: string;
  teamLeaderId?: number;
  teamLeaderName?: string;
  projectManagerId?: number | null;
  projectManagerName?: string | null;
  projectManagerTeams?: string | null;
  createdById?: number;
  createdByName?: string;
  createdDate?: string | null;
  status?: string;
  teamGoal?: string;
  members?: DepartmentHeadTeamMember[];
  [key: string]: unknown;
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
  isAvailable?: boolean;
  currentTeamId?: number | null;
  currentTeamName?: string | null;
  currentTeamNames?: string | null;
  [key: string]: unknown;
};

export type DepartmentHeadDashboardData = {
  department?: unknown | null;
  departmentId?: number | null;
  departmentName?: string | null;
  departmentCode?: string | null;
  headEmployee?: string | null;
  status?: boolean | null;
  createdBy?: string | null;
  createdAt?: string | null;
  employeeCount?: number;
  totalEmployees?: number;
  activeEmployees?: number;
  currentDepartmentEmployeeCount?: number;
  parentDepartmentEmployeeCount?: number;
  teamCount?: number;
  totalTeams?: number;
  activeTeamCount?: number;
  activeTeams?: number;
  inactiveTeamCount?: number;
  employees?: DepartmentHeadEmployee[];
  teams?: DepartmentHeadTeam[];
  recentActivities?: unknown[];
  warnings?: string[];
  [key: string]: unknown;
};

export type CandidateUser = DepartmentHeadCandidate;
export type TeamResponse = DepartmentHeadTeam;
export type EmployeeResponse = DepartmentHeadEmployee;

export type DepartmentHeadTeamPayload = {
  teamName: string;
  teamLeaderId: number;
  projectManagerId?: number | null;
  teamGoal?: string;
  status?: string;
  reason?: string;
  memberUserIds?: number[];
  memberEmployeeIds?: number[];
};

const unwrap = <T,>(payload: unknown, fallback: T): T => {
  if (
    payload &&
    typeof payload === 'object' &&
    'data' in payload &&
    (payload as { data?: unknown }).data &&
    typeof (payload as { data?: unknown }).data === 'object' &&
    'data' in ((payload as { data?: unknown }).data as Record<string, unknown>)
  ) {
    return ((payload as { data: { data: T } }).data.data ?? fallback) as T;
  }

  if (payload && typeof payload === 'object' && 'data' in payload) {
    return ((payload as { data?: T }).data ?? fallback) as T;
  }

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
  employeeCount: 0,
  totalEmployees: 0,
  activeEmployees: 0,
  currentDepartmentEmployeeCount: 0,
  parentDepartmentEmployeeCount: 0,
  teamCount: 0,
  totalTeams: 0,
  activeTeamCount: 0,
  activeTeams: 0,
  inactiveTeamCount: 0,
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


export const fetchDepartmentHeadEmployees = async (
  includeInactive = false,
): Promise<DepartmentHeadEmployee[]> => {
  try {
    const response = await api.get('/department-head/employees', {
      params: { includeInactive },
    });
    const data = unwrap<DepartmentHeadEmployee[]>(response, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (is422(error)) return [];
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

export const createDepartmentHeadTeam = async (
  payload: DepartmentHeadTeamPayload,
): Promise<DepartmentHeadTeam> => {
  const response = await api.post('/department-head/teams', payload);
  return unwrap<DepartmentHeadTeam>(response, {} as DepartmentHeadTeam);
};

export const updateDepartmentHeadTeam = async (
  teamId: number,
  payload: DepartmentHeadTeamPayload,
): Promise<DepartmentHeadTeam> => {
  const response = await api.put(`/department-head/teams/${teamId}`, payload);
  return unwrap<DepartmentHeadTeam>(response, {} as DepartmentHeadTeam);
};

export const fetchDepartmentHeadTeamHistory = async (teamId: number): Promise<unknown[]> => {
  try {
    const response = await api.get(`/department-head/teams/${teamId}/history`);
    const data = unwrap<unknown[]>(response, []);
    return Array.isArray(data) ? data : [];
  } catch (error) {
    if (is422(error)) return [];
    throw error;
  }
};
