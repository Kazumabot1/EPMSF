export type UserRole = 'Employee' | 'HR' | 'DepartmentHead';

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
  ],
  DepartmentHead: [
    {
      label: 'Department Dashboard',
      path: '/department-head/dashboard',
      icon: 'bi-building-check',
      end: true,
    },
  ],
};

export const resolveUserRole = (user?: UserLike | null): UserRole => {
  if (!user) return 'Employee';

  const normalizedRoles = (user.roles ?? []).map((role) =>
    role.replace('ROLE_', '').replace(/\s+/g, '_').toUpperCase()
  );

  if (
    normalizedRoles.includes('DEPARTMENT_HEAD') ||
    user.dashboard === 'DEPARTMENT_HEAD_DASHBOARD'
  ) {
    return 'DepartmentHead';
  }

  if (normalizedRoles.includes('HR') || user.dashboard === 'HR_DASHBOARD') {
    return 'HR';
  }

  return 'Employee';
};