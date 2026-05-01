import api from './api';

export interface Department {
  id: number;
  departmentName: string;
  departmentCode?: string | null;
  headEmployee?: string | null;
  status?: boolean;
  createdAt?: string;
  createdBy?: string;
}

export interface DepartmentRequest {
  departmentName: string;
  departmentCode?: string | null;
  headEmployee?: string | null;
  status?: boolean;
}

type ApiEnvelope<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
};

const unwrap = <T>(response: { data: ApiEnvelope<T> | T }): T => {
  const body = response.data as ApiEnvelope<T> | T;
  if (body && typeof body === 'object' && 'data' in body) {
    return (body as ApiEnvelope<T>).data;
  }
  return body as T;
};

const cleanPayload = (request: DepartmentRequest): DepartmentRequest => ({
  departmentName: request.departmentName.trim(),
  departmentCode: request.departmentCode?.trim() || null,
  headEmployee: request.headEmployee?.trim() || null,
  status: request.status,
});

export const fetchDepartments = async (): Promise<Department[]> => {
  const response = await api.get<ApiEnvelope<Department[]>>('/departments');
  return unwrap<Department[]>(response);
};

export const createDepartment = async (request: DepartmentRequest): Promise<Department> => {
  const response = await api.post<ApiEnvelope<Department>>('/departments', cleanPayload(request));
  return unwrap<Department>(response);
};

export const updateDepartment = async (
  id: number,
  request: DepartmentRequest,
): Promise<Department> => {
  const response = await api.put<ApiEnvelope<Department>>(`/departments/${id}`, cleanPayload(request));
  return unwrap<Department>(response);
};

export const deleteDepartment = async (id: number): Promise<void> => {
  await api.delete(`/departments/${id}`);
};
