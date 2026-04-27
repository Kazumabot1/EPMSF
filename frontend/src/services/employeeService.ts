import api from './api';
import { isAxiosError } from 'axios';

type GenericApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp: string;
};

export interface EmployeeResponse {
  id: number;
  firstName: string;
  lastName: string;
  fullName: string;
  phoneNumber: string | null;
  email?: string | null;
  staffNrc: string | null;
  gender: string | null;
  race: string | null;
  religion: string | null;
  dateOfBirth: string | null;
  maritalStatus: string | null;
  spouseName: string | null;
  spouseNrc: string | null;
  fatherName: string | null;
  fatherNrc: string | null;
  active: boolean | null;
  contactAddress: string | null;
  permanentAddress: string | null;
  currentDepartment: string | null;
  parentDepartment: string | null;
  assignedBy: string | null;
  departmentStartDate: string | null;
  departmentEndDate: string | null;
  departmentHistoryCount: number;
  positionId?: number | null;
  positionTitle?: string | null;
  positionLevelCode?: string | null;
  currentDepartmentId?: number | null;
  userId?: number | null;
  loginAccountCreated?: boolean | null;
  mustChangePassword?: boolean | null;
  accountProvisioningMessage?: string | null;
  accountProvisioningSuccess?: boolean | null;
  accountProvisioningSmtpError?: string | null;
}

export interface EmployeeRequestPayload {
  firstName: string;
  lastName: string;
  phoneNumber?: string;
  email?: string;
  staffNrc?: string;
  gender?: string;
  race?: string;
  religion?: string;
  dateOfBirth?: string | null;
  contactAddress?: string;
  permanentAddress?: string;
  maritalStatus?: string;
  spouseName?: string;
  spouseNrc?: string;
  fatherName?: string;
  fatherNrc?: string;
  /** Set to `null` to clear assigned position. */
  positionId?: number | null;
  /** Set to `null` to clear current department assignment. */
  departmentId?: number | null;
  createLoginAccount?: boolean;
  sendTemporaryPasswordEmail?: boolean;
}

const unwrap = <T>(response: { data: GenericApiResponse<T> }): T => response.data.data;

export const isEmployeeActive = (emp: Pick<EmployeeResponse, 'active'>): boolean => emp.active !== false;

export const parseApiError = (err: unknown): string => {
  if (isAxiosError(err)) {
    const data = err.response?.data as
      | { message?: string; validationErrors?: Record<string, string> }
      | undefined;
    if (data?.validationErrors && Object.keys(data.validationErrors).length > 0) {
      return Object.values(data.validationErrors).join(' ');
    }
    if (data?.message) {
      return data.message;
    }
  }
  if (err instanceof Error) {
    return err.message;
  }
  return 'Request failed';
};

export const fetchEmployees = async (includeInactive = false): Promise<EmployeeResponse[]> => {
  const response = await api.get<GenericApiResponse<EmployeeResponse[]>>('/employees', {
    params: { includeInactive: includeInactive ? 'true' : 'false' },
  });
  return unwrap(response);
};

export const getEmployee = async (id: number): Promise<EmployeeResponse> => {
  const response = await api.get<GenericApiResponse<EmployeeResponse>>(`/employees/${id}`);
  return unwrap(response);
};

export const createEmployee = async (payload: EmployeeRequestPayload): Promise<EmployeeResponse> => {
  const body = buildJsonBody(payload);
  const response = await api.post<GenericApiResponse<EmployeeResponse>>('/employees', body);
  return unwrap(response);
};

export const updateEmployee = async (id: number, payload: EmployeeRequestPayload): Promise<EmployeeResponse> => {
  const body = buildJsonBody(payload);
  const response = await api.put<GenericApiResponse<EmployeeResponse>>(`/employees/${id}`, body);
  return unwrap(response);
};

export const deactivateEmployee = async (id: number): Promise<EmployeeResponse> => {
  const response = await api.patch<GenericApiResponse<EmployeeResponse>>(
    `/employees/${id}/deactivate`
  );
  return unwrap(response);
};

function buildJsonBody(payload: EmployeeRequestPayload): Record<string, unknown> {
  const out: Record<string, unknown> = {
    firstName: payload.firstName.trim(),
    lastName: payload.lastName.trim(),
  };
  const optional = [
    'phoneNumber',
  'email',
    'staffNrc',
    'gender',
    'race',
    'religion',
    'contactAddress',
    'permanentAddress',
    'maritalStatus',
    'spouseName',
    'spouseNrc',
    'fatherName',
    'fatherNrc',
  ] as const;
  for (const k of optional) {
    const v = payload[k]?.trim();
    if (v) {
      out[k] = v;
    }
  }
  if (payload.dateOfBirth && payload.dateOfBirth.trim() !== '') {
    out.dateOfBirth = payload.dateOfBirth.trim();
  } else {
    out.dateOfBirth = null;
  }
  out.positionId = payload.positionId ?? null;
  out.departmentId = payload.departmentId ?? null;
  if (payload.createLoginAccount !== undefined) {
    out.createLoginAccount = payload.createLoginAccount;
  }
  if (payload.sendTemporaryPasswordEmail !== undefined) {
    out.sendTemporaryPasswordEmail = payload.sendTemporaryPasswordEmail;
  }
  return out;
}

export const responseToFormDefaults = (e: EmployeeResponse) => ({
  firstName: e.firstName ?? '',
  lastName: e.lastName ?? '',
  phoneNumber: e.phoneNumber ?? '',
  email: e.email ?? '',
  staffNrc: e.staffNrc ?? '',
  gender: e.gender ?? '',
  race: e.race ?? '',
  religion: e.religion ?? '',
  dateOfBirth: formatDateForInput(e.dateOfBirth),
  contactAddress: e.contactAddress ?? '',
  permanentAddress: e.permanentAddress ?? '',
  maritalStatus: e.maritalStatus ?? '',
  spouseName: e.spouseName ?? '',
  spouseNrc: e.spouseNrc ?? '',
  fatherName: e.fatherName ?? '',
  fatherNrc: e.fatherNrc ?? '',
  positionId: e.positionId != null && e.positionId !== undefined ? String(e.positionId) : '',
  departmentId:
    e.currentDepartmentId != null && e.currentDepartmentId !== undefined
      ? String(e.currentDepartmentId)
      : '',
  createLoginAccount: true,
  sendTemporaryPasswordEmail: true,
});

export const formatDateForInput = (iso: string | null | undefined): string => {
  if (!iso) {
    return '';
  }
  if (/^\d{4}-\d{2}-\d{2}/.test(iso)) {
    return iso.slice(0, 10);
  }
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) {
    return '';
  }
  return d.toISOString().slice(0, 10);
};
