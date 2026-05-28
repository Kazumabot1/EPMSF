import api from './api';
import type {
  DepartmentChangeCreatePayload,
  EmployeeChangeDetail,
    EmployeeChangeProfile,
  EmployeeChangeSummary,
  PositionChangeCreatePayload,
  WorkforceDepartment,
  WorkforceEmployee,
  WorkforcePosition,
} from '../types/employeeChangeRequest';

const unwrap = <T>(response: any): T => {
  const body = response?.data;

  if (body?.data !== undefined) {
    return body.data as T;
  }

  return body as T;
};

const unwrapList = <T>(response: any): T[] => {
  const body = response?.data;

  if (Array.isArray(body)) {
    return body as T[];
  }

  if (Array.isArray(body?.data)) {
    return body.data as T[];
  }

  if (Array.isArray(body?.data?.content)) {
    return body.data.content as T[];
  }

  if (Array.isArray(body?.content)) {
    return body.content as T[];
  }

  return [];
};

export const employeeChangeRequestService = {
  async getEmployees(): Promise<WorkforceEmployee[]> {
    const response = await api.get('/employees');
    return unwrapList<WorkforceEmployee>(response);
  },

async getEmployeeProfile(employeeId: number): Promise<EmployeeChangeProfile> {
  const response = await api.get(`/employee-change-requests/employees/${employeeId}/profile`);
  return unwrap<EmployeeChangeProfile>(response);
},

  async getPositions(): Promise<WorkforcePosition[]> {
    const response = await api.get('/positions');
    return unwrapList<WorkforcePosition>(response);
  },

  async getDepartments(): Promise<WorkforceDepartment[]> {
    const response = await api.get('/departments');
    return unwrapList<WorkforceDepartment>(response);
  },

  async getHrRequests(): Promise<EmployeeChangeSummary[]> {
    const response = await api.get('/employee-change-requests/hr');
    return unwrapList<EmployeeChangeSummary>(response);
  },

  async getDetail(requestId: number): Promise<EmployeeChangeDetail> {
    const response = await api.get(`/employee-change-requests/${requestId}`);
    return unwrap<EmployeeChangeDetail>(response);
  },

  async createPositionChange(
    payload: PositionChangeCreatePayload,
  ): Promise<EmployeeChangeSummary> {
    const response = await api.post('/employee-change-requests/position-change', payload);
    return unwrap<EmployeeChangeSummary>(response);
  },

  async createDepartmentChange(
    payload: DepartmentChangeCreatePayload,
  ): Promise<EmployeeChangeSummary> {
    const response = await api.post('/employee-change-requests/department-change', payload);
    return unwrap<EmployeeChangeSummary>(response);
  },

  async getCeoPendingRequests(): Promise<EmployeeChangeSummary[]> {
    const response = await api.get('/employee-change-requests/ceo/pending');
    return unwrapList<EmployeeChangeSummary>(response);
  },

  async getCeoDetail(requestId: number): Promise<EmployeeChangeDetail> {
    const response = await api.get(`/employee-change-requests/ceo/${requestId}`);
    return unwrap<EmployeeChangeDetail>(response);
  },

  async approveByCeo(requestId: number, reason: string): Promise<EmployeeChangeSummary> {
    const response = await api.post(`/employee-change-requests/ceo/${requestId}/approve`, {
      reason,
    });
    return unwrap<EmployeeChangeSummary>(response);
  },

  async rejectByCeo(requestId: number, reason: string): Promise<EmployeeChangeSummary> {
    const response = await api.post(`/employee-change-requests/ceo/${requestId}/reject`, {
      reason,
    });
    return unwrap<EmployeeChangeSummary>(response);
  },

};