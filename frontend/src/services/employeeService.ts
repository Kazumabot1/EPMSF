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

export interface Employee {
  id: number;
  name: string;
  email: string;
  gender: string;
  position: string | null;
  department: string | null;
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

export const getAllEmployees = async (): Promise<Employee[]> => {
  const employees = await fetchEmployees();
  return employees.map(emp => ({
    id: emp.id,
    name: emp.fullName,
    email: emp.staffNrc, // using staffNrc as email placeholder since API doesn't return email
    gender: emp.gender,
    position: null, // not available in EmployeeResponse
    department: emp.currentDepartment,
  }));
};
