import api from "./api";

export interface CandidateUser {
  id: number;
  name: string;
  sourceType?: string;
  type?: string;
  departmentId?: number;
  employeeId?: number | null;
  available?: boolean;
  isAvailable?: boolean;
  currentTeamId?: number | null;
  currentTeamName?: string | null;
}

export interface EmployeeResponse {
  id: number;
  fullName?: string;
  firstName?: string;
  lastName?: string;
  email?: string;
  positionTitle?: string;
  positionName?: string;
  active?: boolean;
}

export interface TeamMemberResponse {
  userId?: number;
  employeeId?: number;
  userName?: string;
  employeeName?: string;
  startedDate?: string;
}

export interface TeamResponse {
  id: number;
  teamName: string;
  departmentId?: number;
  departmentName?: string;
  teamLeaderId: number;
  teamLeaderName?: string;
  createdById?: number;
  createdByName?: string;
  createdDate?: string;
  status?: string;
  teamGoal?: string;
  members?: TeamMemberResponse[];
}

export interface TeamRequest {
  teamName: string;
  teamLeaderId: number;
  teamGoal: string;
  status: string;
  memberUserIds?: number[];
  memberEmployeeIds?: number[];
}

export interface DepartmentHeadDashboardResponse {
  departmentName?: string;
  employees?: EmployeeResponse[];
  teams?: TeamResponse[];
}

interface GenericApiResponse<T> {
  success?: boolean;
  message?: string;
  data: T;
}

const unwrap = <T>(response: any): T => {
  if (response.data?.data !== undefined) {
    return response.data.data;
  }

  return response.data;
};

const normalizeCandidate = (candidate: CandidateUser): CandidateUser => {
  const available = candidate.available ?? candidate.isAvailable ?? true;

  return {
    ...candidate,
    available,
    isAvailable: available,
  };
};

export const fetchDepartmentHeadDashboard = async (
  includeInactive = false
): Promise<DepartmentHeadDashboardResponse> => {
  const response = await api.get<
    GenericApiResponse<DepartmentHeadDashboardResponse> | DepartmentHeadDashboardResponse
  >(`/department-head/dashboard?includeInactive=${includeInactive}`);

  return unwrap<DepartmentHeadDashboardResponse>(response);
};

export const fetchDepartmentHeadTeams = async (): Promise<TeamResponse[]> => {
  const response = await api.get<
    GenericApiResponse<TeamResponse[]> | TeamResponse[]
  >("/department-head/teams");

  return unwrap<TeamResponse[]>(response);
};

export const fetchDepartmentHeadCandidateUsers = async (): Promise<
  CandidateUser[]
> => {
  const response = await api.get<
    GenericApiResponse<CandidateUser[]> | CandidateUser[]
  >("/department-head/teams/candidates/users");

  return unwrap<CandidateUser[]>(response).map(normalizeCandidate);
};

export const fetchDepartmentHeadCandidateMembers = async (): Promise<
  CandidateUser[]
> => {
  const response = await api.get<
    GenericApiResponse<CandidateUser[]> | CandidateUser[]
  >("/department-head/teams/candidates/members");

  return unwrap<CandidateUser[]>(response).map(normalizeCandidate);
};

export const createDepartmentHeadTeam = async (
  request: TeamRequest
): Promise<TeamResponse> => {
  const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];

  const response = await api.post<
    GenericApiResponse<TeamResponse> | TeamResponse
  >("/department-head/teams", {
    ...request,
    memberUserIds: memberIds,
    memberEmployeeIds: memberIds,
  });

  return unwrap<TeamResponse>(response);
};

export const updateDepartmentHeadTeam = async (
  id: number,
  request: TeamRequest
): Promise<TeamResponse> => {
  const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];

  const response = await api.put<
    GenericApiResponse<TeamResponse> | TeamResponse
  >(`/department-head/teams/${id}`, {
    ...request,
    memberUserIds: memberIds,
    memberEmployeeIds: memberIds,
  });

  return unwrap<TeamResponse>(response);
};

export const deleteDepartmentHeadTeam = async (id: number): Promise<void> => {
  await api.delete(`/department-head/teams/${id}`);
};