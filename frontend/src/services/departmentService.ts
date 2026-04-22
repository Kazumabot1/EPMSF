import api from './api';

export interface Department {
  id: number;
  departmentName: string;
}

export interface DepartmentPayload {
  departmentName: string;
}

type ApiResponse<T> = {
  data?: T;
  message?: string;
};

const normalizeDepartment = (item: any): Department => ({
  id: Number(item.id),
  departmentName: item.departmentName ?? item.department_name ?? '',
});

const normalizeDepartmentList = (payload: any): Department[] => {
  const rawList = Array.isArray(payload?.data) ? payload.data : Array.isArray(payload) ? payload : [];
  return rawList.map(normalizeDepartment);
};

export const fetchDepartments = async (): Promise<Department[]> => {
  const response = await api.get<ApiResponse<any[]>>('/api/departments');
  return normalizeDepartmentList(response.data);
};

export const createDepartment = async (payload: DepartmentPayload): Promise<Department> => {
  const response = await api.post<ApiResponse<any>>('/api/departments', payload);
  return normalizeDepartment(response.data?.data ?? response.data);
};

export const updateDepartment = async (id: number, payload: DepartmentPayload): Promise<Department> => {
  const response = await api.put<ApiResponse<any>>(`/api/departments/${id}`, payload);
  return normalizeDepartment(response.data?.data ?? response.data);
};

export const deleteDepartment = async (id: number): Promise<void> => {
  await api.delete(`/api/departments/${id}`);
};
