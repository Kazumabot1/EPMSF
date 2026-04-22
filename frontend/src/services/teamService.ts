// KHN new file
// (Frontend service for Team management APIs)

import api from './api';

export interface TeamRequest {
  teamName: string;
  departmentId: number;
  teamLeaderId: number;
  createdById: number;
  teamGoal: string;
  status: string;
  memberEmployeeIds: number[];
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
  members: {
    employeeId: number;
    employeeName: string;
    startedDate: string;
  }[];
}

export const fetchTeams = async (): Promise<TeamResponse[]> => {
  const response = await api.get('/api/teams');
  return response.data;
};

export const createTeam = async (data: TeamRequest): Promise<TeamResponse> => {
  const response = await api.post('/api/teams', data);
  return response.data;
};

// KHN added parts
// (Fetch departments for dropdown selection)
export const fetchDepartments = async () => {
  const response = await api.get('/api/departments'); // KHN updated URL
  return response.data.data;
};

// KHN added parts
// (Fetch employees for membership selection)
export const fetchEmployees = async () => {
  const response = await api.get('/api/employees'); // KHN updated URL
  return response.data.data;
};

// KHN added parts
// (Fetch users for team leader selection - filtered by dept)
export const fetchUsersByDepartment = async (deptId: number) => {
  const response = await api.get(`/api/users/department/${deptId}`); // KHN updated URL
  return response.data.data;
};

// KHN added parts
// (Candidate API types and calls for exclusivity logic)
export interface CandidateResponse {
  id: number;
  name: string;
  type: string;
  departmentId?: number;
  departmentName?: string;
  isAvailable: boolean;
  currentTeamId?: number;
  currentTeamName?: string;
}

export const updateTeam = async (id: number, data: TeamRequest): Promise<TeamResponse> => {
  const response = await api.put(`/api/teams/${id}`, data);
  return response.data.data;
};

export const fetchCandidateUsers = async (deptId: number): Promise<CandidateResponse[]> => {
  const response = await api.get(`/api/teams/candidates/users/${deptId}`);
  return response.data.data;
};

export const fetchCandidateEmployees = async (): Promise<CandidateResponse[]> => {
  const response = await api.get('/api/teams/candidates/employees');
  return response.data.data;
};
