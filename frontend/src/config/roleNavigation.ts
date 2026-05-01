export type UserRole =
  | 'Employee'
  | 'HR'
  | 'DepartmentHead'
  | 'Manager'
  | 'ProjectManager'
  | 'Executive';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  end?: boolean;
}

export interface UserLike {
  roles?: string[];
  dashboard?: string;
}

export const roleNavigation: Record<UserRole, NavItem[]> = {
  Employee: [
    { label: 'My Dashboard', path: '/employee/dashboard', icon: 'bi-columns-gap', end: true },
    { label: 'My KPIs', path: '/employee/kpis', icon: 'bi-bullseye' },
    { label: 'My Appraisals', path: '/employee/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Self-Assessment', path: '/employee/self-assessment', icon: 'bi-pencil-square' },
    { label: 'My Feedback', path: '/employee/feedback', icon: 'bi-chat-dots' },
    { label: 'One-on-Ones', path: '/employee/one-on-ones', icon: 'bi-calendar-check' },
    { label: 'My PIP', path: '/employee/pip', icon: 'bi-exclamation-triangle' },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2', end: true },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person' },
    { label: 'Employees', path: '/hr/employee', icon: 'bi-people' },
    { label: 'Teams', path: '/hr/team', icon: 'bi-people-fill' },
    { label: 'Departments', path: '/hr/department', icon: 'bi-building' },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
  ],

  DepartmentHead: [
    {
      label: 'Department Dashboard',
      path: '/department-head/dashboard',
      icon: 'bi-building-check',
      end: true,
    },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
  ],

  Manager: [
    { label: 'Manager Dashboard', path: '/manager/dashboard', icon: 'bi-person-workspace', end: true },
    { label: 'Team Appraisals', path: '/manager/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-file-earmark-bar-graph' },
  ],

  ProjectManager: [
    {
      label: 'Project Dashboard',
      path: '/project-manager/dashboard',
      icon: 'bi-kanban',
      end: true,
    },
    {
      label: 'Project Performance',
      path: '/project-manager/performance',
      icon: 'bi-graph-up-arrow',
    },
    {
      label: 'Stakeholder Feedback',
      path: '/project-manager/feedback',
      icon: 'bi-chat-square-text',
    },
    {
      label: 'Project Reports',
      path: '/project-manager/reports',
      icon: 'bi-file-earmark-bar-graph',
    },
  ],

  Executive: [
    { label: 'Executive Dashboard', path: '/executive/dashboard', icon: 'bi-building', end: true },
    { label: 'Reports', path: '/executive/reports', icon: 'bi-bar-chart-line' },
  ],
};

const normalizeRoleName = (role: string) =>
  role
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

export const resolveUserRole = (user?: UserLike | null): UserRole => {
  if (!user) return 'Employee';

  const normalizedRoles = (user.roles ?? []).map(normalizeRoleName);
  const dashboard = user.dashboard ?? '';

  if (
    normalizedRoles.includes('DEPARTMENT_HEAD') ||
    normalizedRoles.includes('DEPARTMENTHEAD') ||
    dashboard === 'DEPARTMENT_HEAD_DASHBOARD'
  ) {
    return 'DepartmentHead';
  }

  if (
    normalizedRoles.includes('HR') ||
    normalizedRoles.includes('ADMIN') ||
    dashboard === 'HR_DASHBOARD' ||
    dashboard === 'ADMIN_DASHBOARD'
  ) {
    return 'HR';
  }

  if (
    normalizedRoles.includes('PROJECT_MANAGER') ||
    normalizedRoles.includes('PROJECTMANAGER') ||
    dashboard === 'PROJECT_MANAGER_DASHBOARD'
  ) {
    return 'ProjectManager';
  }

  if (normalizedRoles.includes('MANAGER') || dashboard === 'MANAGER_DASHBOARD') {
    return 'Manager';
  }

  if (
    normalizedRoles.includes('CEO') ||
    normalizedRoles.includes('EXECUTIVE') ||
    dashboard === 'EXECUTIVE_DASHBOARD'
  ) {
    return 'Executive';
  }

  return 'Employee';
};

export const dashboardPathByRole: Record<UserRole, string> = {
  Employee: '/employee/dashboard',
  HR: '/dashboard',
  DepartmentHead: '/department-head/dashboard',
  Manager: '/manager/dashboard',
  ProjectManager: '/project-manager/dashboard',
  Executive: '/executive/dashboard',
};

export const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  if (role === 'ProjectManager') return 'Project Manager';
  return role;
};