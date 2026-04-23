import api from './api';

export interface EmployeeResponse {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string;
  staffNrc: string;
  gender: string;
  race: string;
  religion: string;
  dateOfBirth: string | null;
  maritalStatus: string;
  contactAddress: string;
  permanentAddress: string;
  currentDepartment: string | null;
  parentDepartment: string | null;
  assignedBy: string | null;
  departmentStartDate: string | null;
  departmentEndDate: string | null;
  departmentHistoryCount: number;
}

type ApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export const fetchEmployees = async (): Promise<EmployeeResponse[]> => {
  const response = await api.get<ApiResponse<EmployeeResponse[]>>('/api/employees');
  return response.data.data;
};