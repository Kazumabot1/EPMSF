export type DashboardValue =
  | 'EMPLOYEE_DASHBOARD'
  | 'MANAGER_DASHBOARD'
  | 'DEPARTMENT_HEAD_DASHBOARD'
  | 'HR_DASHBOARD'
  | 'EXECUTIVE_DASHBOARD'
  | 'HRADMIN_DASHBOARD'
  | 'ADMIN_DASHBOARD';

export type DashboardOption = {
  value: DashboardValue;
  label: string;
  helper: string;
};

export const DASHBOARD_OPTIONS: DashboardOption[] = [
  {
    value: 'EMPLOYEE_DASHBOARD',
    label: 'Employee Dashboard',
    helper: 'Employee self-service workspace.',
  },
  {
    value: 'MANAGER_DASHBOARD',
    label: 'Manager Dashboard',
    helper: 'Manager assessment review, KPI scoring, feedback, and team tasks.',
  },
  {
    value: 'DEPARTMENT_HEAD_DASHBOARD',
    label: 'Department Head Dashboard',
    helper: 'Department review, assessment forwarding, reports, and department actions.',
  },
  {
    value: 'HR_DASHBOARD',
    label: 'HR Dashboard',
    helper: 'HR configuration, organization, KPI, appraisal, and people management.',
  },
  {
    value: 'EXECUTIVE_DASHBOARD',
    label: 'CEO / Executive Dashboard',
    helper: 'Executive reporting and organization-level overview.',
  },
  {
    value: 'HRADMIN_DASHBOARD',
    label: 'HR Admin Dashboard',
    helper: 'User accounts, access control, and admin-only settings.',
  },
];

export const normalizeRoleName = (role?: string | null) => {
  const value = String(role || 'EMPLOYEE')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .trim()
    .toUpperCase();

  if (
    value === 'PROJECT_MANAGER' ||
    value === 'PROJECTMANAGER' ||
    value === 'TEAM_MANAGER' ||
    value === 'PM'
  ) {
    return 'MANAGER';
  }

  if (
    value === 'DEPARTMENTHEAD' ||
    value === 'DEPT_HEAD' ||
    value === 'DEPTHEAD' ||
    value === 'HEAD_OF_DEPARTMENT'
  ) {
    return 'DEPARTMENT_HEAD';
  }

  if (value === 'EXECUTIVE' || value === 'CEO') {
    return 'CEO';
  }

  if (
    value === 'HRADMIN' ||
    value === 'ADMIN' ||
    value === 'HR' ||
    value === 'MANAGER' ||
    value === 'DEPARTMENT_HEAD' ||
    value === 'EMPLOYEE' ||
    value === 'CEO'
  ) {
    return value;
  }

  return 'EMPLOYEE';
};

export const defaultDashboardForRole = (role?: string | null): DashboardValue => {
  const normalized = normalizeRoleName(role);

  switch (normalized) {
    case 'HRADMIN':
    case 'ADMIN':
      return 'HRADMIN_DASHBOARD';
    case 'HR':
      return 'HR_DASHBOARD';
    case 'CEO':
      return 'EXECUTIVE_DASHBOARD';
    case 'DEPARTMENT_HEAD':
      return 'DEPARTMENT_HEAD_DASHBOARD';
    case 'MANAGER':
      return 'MANAGER_DASHBOARD';
    case 'EMPLOYEE':
    default:
      return 'EMPLOYEE_DASHBOARD';
  }
};

export const normalizeDashboard = (
  dashboard?: string | null,
  role?: string | null,
): DashboardValue => {
  const value = String(dashboard || '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .trim()
    .toUpperCase();

  switch (value) {
    case 'HRADMIN':
    case 'ADMIN':
    case 'HRADMIN_DASHBOARD':
    case 'ADMIN_DASHBOARD':
      return 'HRADMIN_DASHBOARD';

    case 'HR':
    case 'HR_DASHBOARD':
      return 'HR_DASHBOARD';

    case 'CEO':
    case 'EXECUTIVE':
    case 'CEO_DASHBOARD':
    case 'EXECUTIVE_DASHBOARD':
      return 'EXECUTIVE_DASHBOARD';

    case 'DEPARTMENTHEAD':
    case 'DEPARTMENT_HEAD':
    case 'DEPT_HEAD':
    case 'DEPTHEAD':
    case 'HEAD_OF_DEPARTMENT':
    case 'DEPARTMENTHEAD_DASHBOARD':
    case 'DEPARTMENT_HEAD_DASHBOARD':
    case 'DEPT_HEAD_DASHBOARD':
    case 'DEPTHEAD_DASHBOARD':
      return 'DEPARTMENT_HEAD_DASHBOARD';

    case 'MANAGER':
    case 'PROJECT_MANAGER':
    case 'TEAM_MANAGER':
    case 'MANAGER_DASHBOARD':
      return 'MANAGER_DASHBOARD';

    case 'EMPLOYEE':
    case 'EMPLOYEE_DASHBOARD':
      return 'EMPLOYEE_DASHBOARD';

    default:
      return defaultDashboardForRole(role);
  }
};

export const dashboardDisplayName = (
  dashboard?: string | null,
  role?: string | null,
) => {
  const normalized = normalizeDashboard(dashboard, role);
  return DASHBOARD_OPTIONS.find((item) => item.value === normalized)?.label ?? normalized;
};

export const roleDisplayName = (role?: string | null) => {
  const normalized = normalizeRoleName(role);

  switch (normalized) {
    case 'DEPARTMENT_HEAD':
      return 'Department Head';
    case 'EMPLOYEE':
      return 'Employee';
    case 'MANAGER':
      return 'Manager';
    case 'HRADMIN':
    case 'ADMIN':
      return 'HR Admin';
    case 'HR':
      return 'HR';
    case 'CEO':
      return 'CEO';
    default:
      return normalized;
  }
};