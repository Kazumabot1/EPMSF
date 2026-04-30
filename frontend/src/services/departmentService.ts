import api from "./api";

export interface Department {
  id: number;
  departmentName?: string;
  name?: string;
  departmentCode?: string;
  headEmployee?: string | null;
  status?: boolean | number;
  createdAt?: string;
  createdBy?: string;
}

export interface DepartmentRequest {
  departmentName: string;
  departmentCode?: string;
  headEmployee?: string | null;
}

const getPayload = (response: any) => {
  if (response?.data !== undefined) {
    return response.data;
  }

  return response;
};

const unwrapArray = <T>(response: any): T[] => {
  const body = getPayload(response);

  console.log("RAW DEPARTMENT RESPONSE:", body);

  if (Array.isArray(body)) {
    return body;
  }

  if (Array.isArray(body?.data)) {
    return body.data;
  }

  if (Array.isArray(body?.result)) {
    return body.result;
  }

  if (Array.isArray(body?.content)) {
    return body.content;
  }

  if (Array.isArray(body?.data?.data)) {
    return body.data.data;
  }

  return [];
};

const unwrapObject = <T>(response: any): T => {
  const body = getPayload(response);

  if (body?.data !== undefined) {
    return body.data;
  }

  if (body?.result !== undefined) {
    return body.result;
  }

  return body;
};

export const fetchDepartments = async (): Promise<Department[]> => {
  const response = await api.get(`/departments?t=${Date.now()}`);
  return unwrapArray<Department>(response);
};

export const createDepartment = async (
  request: DepartmentRequest
): Promise<Department> => {
  const response = await api.post("/departments", {
    departmentName: request.departmentName,
    departmentCode: request.departmentCode || "",
    headEmployee: request.headEmployee || null,
  });

  return unwrapObject<Department>(response);
};

export const updateDepartment = async (
  id: number,
  request: DepartmentRequest
): Promise<Department> => {
  const response = await api.put(`/departments/${id}`, {
    departmentName: request.departmentName,
    departmentCode: request.departmentCode || "",
    headEmployee: request.headEmployee || null,
  });

  return unwrapObject<Department>(response);
};

export const deleteDepartment = async (id: number): Promise<void> => {
  await api.delete(`/departments/${id}`);
};