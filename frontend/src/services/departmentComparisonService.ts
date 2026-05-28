/*
departmentComparisonService.ts file:
 */
import api from './api';

type GenericApiResponse<T> = {
  success: boolean;
  message: string;
  data: T;
  timestamp?: string;
};

export interface DepartmentComparisonSummary {
  id: number;
  departmentName: string;
  departmentCode?: string | null;
  status?: boolean | number | null;
  createdAt?: string | null;
  createdBy?: string | null;
}

export interface DepartmentComparisonEmployee {
  userId?: number | null;
  employeeId?: number | null;
  employeeName?: string | null;
  email?: string | null;
  positionTitle?: string | null;
}

export interface DepartmentComparisonTeam {
  id: number;
  teamName: string;
  status?: string | null;
  teamGoal?: string | null;

  teamLeaderId?: number | null;
  teamLeaderName?: string | null;
  teamLeaderPositionTitle?: string | null;

  createdDate?: string | null;

  createdById?: number | null;
  createdByName?: string | null;

  employeeCount?: number | null;

  members?: DepartmentComparisonEmployee[];
}

export interface DepartmentComparisonDetail {
  id: number;
  departmentName: string;
  departmentCode?: string | null;
  status?: boolean | number | null;
  createdAt?: string | null;
  createdBy?: string | null;
  headEmployee?: string | null;

  totalEmployeeCount?: number | null;
  currentDepartmentEmployeeCount?: number | null;
  parentDepartmentEmployeeCount?: number | null;
  teamCount?: number | null;

  employees?: DepartmentComparisonEmployee[];
  teams?: DepartmentComparisonTeam[];
}

function unwrap<T>(response: { data: GenericApiResponse<T> | T }): T {
  const body = response.data as GenericApiResponse<T>;

  if (body && typeof body === 'object' && 'data' in body) {
    return body.data;
  }

  return response.data as T;
}

export async function searchDepartmentComparison(
  search = ''
): Promise<DepartmentComparisonSummary[]> {
  const response = await api.get<GenericApiResponse<DepartmentComparisonSummary[]>>(
    '/departments/comparison',
    {
      params: {
        search,
      },
    }
  );

  const data = unwrap<DepartmentComparisonSummary[]>(response);
  return Array.isArray(data) ? data : [];
}

export async function getDepartmentComparisonDetail(
  departmentId: number
): Promise<DepartmentComparisonDetail> {
  const response = await api.get<GenericApiResponse<DepartmentComparisonDetail>>(
    `/departments/${departmentId}/comparison`
  );

  return unwrap<DepartmentComparisonDetail>(response);
}

export function isDepartmentActive(status?: boolean | number | null): boolean {
  return status === true || status === 1;
}

export function isTeamActive(status?: string | null): boolean {
  return String(status ?? '').toLowerCase() === 'active';
}

export function formatPersonWithPosition(
  name?: string | null,
  positionTitle?: string | null
): string {
  const cleanName = name?.trim() || '—';
  const cleanPosition = positionTitle?.trim();

  if (!cleanPosition) {
    return cleanName;
  }

  return `${cleanName} (${cleanPosition})`;
}