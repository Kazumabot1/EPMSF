// import api from "./api";
//
// export interface Department {
//   id: number;
//   departmentName?: string;
//   name?: string;
// }
//
// export interface CandidateUser {
//   id: number;
//   name: string;
//   type?: string;
//   departmentId?: number;
//   departmentName?: string;
//   isAvailable?: boolean;
//   currentTeamId?: number;
//   currentTeamName?: string;
// }
//
// export interface TeamMemberResponse {
//   userId?: number;
//   employeeId?: number;
//   userName?: string;
//   employeeName?: string;
//   startedDate?: string;
// }
//
// export interface TeamRequest {
//   teamName: string;
//   departmentId: number;
//   teamLeaderId: number;
//   createdById: number;
//   teamGoal: string;
//   status: string;
//
//   // Preferred by new backend
//   memberUserIds?: number[];
//
//   // Backward compatible name
//  // memberEmployeeIds?: number[];
// }
//
// export interface TeamResponse {
//   id: number;
//   teamName: string;
//   departmentId: number;
//   departmentName: string;
//   teamLeaderId: number;
//   teamLeaderName: string;
//   createdById: number;
//   createdByName: string;
//   createdDate: string;
//   status: string;
//   teamGoal: string;
//   members: TeamMemberResponse[];
// }
//
// const unwrap = <T>(response: any): T => {
//   if (response.data?.data !== undefined) return response.data.data;
//   return response.data;
// };
//
// export const fetchDepartments = async (): Promise<Department[]> => {
//   const response = await api.get("/departments");
//   return unwrap<Department[]>(response);
// };
//
// export const fetchTeams = async (): Promise<TeamResponse[]> => {
//   const response = await api.get("/teams");
//   return unwrap<TeamResponse[]>(response);
// };
//
// export const fetchTeamById = async (id: number): Promise<TeamResponse> => {
//   const response = await api.get(`/teams/${id}`);
//   return unwrap<TeamResponse>(response);
// };
//
// export const fetchTeamsByDepartment = async (
//   departmentId: number
// ): Promise<TeamResponse[]> => {
//   const response = await api.get(`/teams/department/${departmentId}`);
//   return unwrap<TeamResponse[]>(response);
// };
//
// export const fetchCandidateUsers = async (
//   departmentId: number
// ): Promise<CandidateUser[]> => {
//   const response = await api.get(`/teams/candidates/users/${departmentId}`);
//   return unwrap<CandidateUser[]>(response);
// };
//
// export const fetchCandidateMembers = async (
//   departmentId: number
// ): Promise<CandidateUser[]> => {
//   const response = await api.get(`/teams/candidates/members/${departmentId}`);
//   return unwrap<CandidateUser[]>(response);
// };
//
// export const createTeam = async (
//   request: TeamRequest
// ): Promise<TeamResponse> => {
//   const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];
//
//   const response = await api.post("/teams", {
//     ...request,
//     memberUserIds: memberIds,
//     memberEmployeeIds: memberIds,
//   });
//
//   return unwrap<TeamResponse>(response);
// };
//
// export const updateTeam = async (
//   id: number,
//   request: TeamRequest
// ): Promise<TeamResponse> => {
//   const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];
//
//   const response = await api.put(`/teams/${id}`, {
//     ...request,
//     memberUserIds: memberIds,
//     memberEmployeeIds: memberIds,
//   });
//
//   return unwrap<TeamResponse>(response);
// };
//
// export const deleteTeam = async (id: number): Promise<void> => {
//   await api.delete(`/teams/${id}`);
// };



// import api from "./api";
//
// export interface Department {
//   id: number;
//   departmentName?: string;
//   name?: string;
// }
//
// export interface CandidateUser {
//   id: number;
//   name: string;
//   type?: string;
//   departmentId?: number;
//   departmentName?: string;
//   isAvailable?: boolean;
//   currentTeamId?: number;
//   currentTeamName?: string;
// }
//
// export interface TeamMemberResponse {
//   userId?: number;
//   employeeId?: number;
//   userName?: string;
//   employeeName?: string;
//   startedDate?: string;
// }
//
// export interface TeamRequest {
//   teamName: string;
//   departmentId: number;
//   teamLeaderId: number;
//   createdById: number;
//   teamGoal: string;
//   status: string;
//   memberUserIds?: number[];
// }
//
// export interface TeamResponse {
//   id: number;
//   teamName: string;
//   departmentId: number;
//   departmentName: string;
//   teamLeaderId: number;
//   teamLeaderName: string;
//   createdById: number;
//   createdByName: string;
//   createdDate: string;
//   status: string;
//   teamGoal: string;
//   members: TeamMemberResponse[];
// }
//
// const unwrap = <T>(response: any): T => {
//   if (response.data?.data !== undefined) return response.data.data;
//   return response.data;
// };
//
// export const fetchDepartments = async (): Promise<Department[]> => {
//   const response = await api.get("/departments");
//   return unwrap<Department[]>(response);
// };
//
// export const fetchTeams = async (): Promise<TeamResponse[]> => {
//   const response = await api.get("/teams");
//   return unwrap<TeamResponse[]>(response);
// };
//
// export const fetchTeamById = async (id: number): Promise<TeamResponse> => {
//   const response = await api.get(`/teams/${id}`);
//   return unwrap<TeamResponse>(response);
// };
//
// export const fetchCandidateUsers = async (
//   departmentId: number
// ): Promise<CandidateUser[]> => {
//   const response = await api.get(`/teams/candidates/users/${departmentId}`);
//   return unwrap<CandidateUser[]>(response);
// };
//
// export const fetchCandidateMembers = async (
//   departmentId: number
// ): Promise<CandidateUser[]> => {
//   const response = await api.get(`/teams/candidates/members/${departmentId}`);
//   return unwrap<CandidateUser[]>(response);
// };
//
// export const createTeam = async (
//   request: TeamRequest
// ): Promise<TeamResponse> => {
//   const response = await api.post("/teams", request);
//   return unwrap<TeamResponse>(response);
// };
//
// export const updateTeam = async (
//   id: number,
//   request: TeamRequest
// ): Promise<TeamResponse> => {
//   const response = await api.put(`/teams/${id}`, request);
//   return unwrap<TeamResponse>(response);
// };
//
// export const deleteTeam = async (id: number): Promise<void> => {
//   await api.delete(`/teams/${id}`);
// };

// khn ( chatgpt)
import api from "./api";

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
  createdById?: number;
  teamGoal: string;
  status: string;
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
  createdById: number;
  createdByName: string;
  createdDate: string;
  status: string;
  teamGoal: string;
  members: TeamMemberResponse[];
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

export const fetchDepartments = async (): Promise<Department[]> => {
  const response = await api.get("/departments");
  return unwrap<Department[]>(response);
};

export const fetchTeams = async (): Promise<TeamResponse[]> => {
  const response = await api.get("/teams");
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

export const createTeam = async (
  request: TeamRequest
): Promise<TeamResponse> => {
  const memberIds = request.memberUserIds ?? request.memberEmployeeIds ?? [];

  const response = await api.post("/teams", {
    ...request,
    memberUserIds: memberIds,
    memberEmployeeIds: memberIds,
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
  });

  return unwrap<TeamResponse>(response);
};