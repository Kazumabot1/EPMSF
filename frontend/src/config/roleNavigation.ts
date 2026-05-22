/*
  Role-based navigation configuration.
  Roles: Employee | Admin | HR | DepartmentHead | Manager | Executive
*//*
 */
/*


export type UserRole =
  | 'Employee'
  | 'Admin'
  | 'HR'
  | 'DepartmentHead'
  | 'Manager'
  | 'Executive';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  end?: boolean;
  children?: NavItem[];
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
    { label: '360 Feedback', path: '/employee/feedback', icon: 'bi-chat-dots' },
    { label: 'One-on-Ones', path: '/employee/one-on-ones', icon: 'bi-calendar-check' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [{ label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' }],
    },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  Admin: [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: 'bi-shield-lock', end: true },
    { label: 'User Accounts', path: '/admin/users', icon: 'bi-person-plus' },
    { label: 'Import Accounts', path: '/admin/employee/import', icon: 'bi-upload' },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    {
      label: 'Access Control',
      path: '/user-roles',
      icon: 'bi-shield-lock',
      children: [
        { label: 'User Roles', path: '/user-roles', icon: 'bi-person-gear' },
        { label: 'Role Permissions', path: '/role-permissions', icon: 'bi-shield-check' },
        { label: 'Permissions', path: '/permissions', icon: 'bi-key' },
      ],
    },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2', end: true },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person' },
    { label: 'Employees', path: '/hr/employee', icon: 'bi-people' },
    {
      label: 'Teams',
      path: '/hr/team',
      icon: 'bi-people-fill',
      children: [
        { label: 'Teams', path: '/hr/team', icon: 'bi-people-fill', end: true },
        { label: 'Create Team', path: '/hr/team/create', icon: 'bi-plus-square' },
        { label: 'Team History', path: '/hr/team/history', icon: 'bi-clock-history' },
      ],
    },
    {
      label: 'Organization',
      path: '/hr/organization',
      icon: 'bi-building',
      children: [
        { label: 'Departments', path: '/hr/department', icon: 'bi-building' },
        { label: 'Department Comparison', path: '/hr/department-comparison', icon: 'bi-columns-gap' },
      ],
    },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    { label: 'Assessment Forms', path: '/hr/assessment-forms', icon: 'bi-ui-checks-grid' },
    {
      label: 'Appraisals',
      path: '/hr/appraisal',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Template Form Create', path: '/hr/appraisal/template-create', icon: 'bi-file-earmark-plus' },
        { label: 'Template Form Records', path: '/hr/appraisal/template-records', icon: 'bi-folder2-open' },
        { label: 'Create Appraisal', path: '/hr/appraisal/create', icon: 'bi-calendar-plus' },
        { label: 'Appraisal Create Records', path: '/hr/appraisal/create-records', icon: 'bi-journal-check' },
        { label: 'Cycle Records', path: '/hr/appraisal/cycles', icon: 'bi-arrow-repeat' },
        { label: 'Manager + Dept Review Check', path: '/hr/appraisal/review-check', icon: 'bi-shield-check' },
      ],
    },
    { label: '360 Feedback', path: '/hr/feedback/dashboard', icon: 'bi-chat-dots' },
    {
      label: 'One-on-One',
      path: '/one-on-one-meetings',
      icon: 'bi-chat-left-text',
      children: [
        { label: '1:1 Meetings', path: '/one-on-one-meetings', icon: 'bi-chat-dots' },
        { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-list-check' },
      ],
    },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [{ label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' }],
    },
  ],

  DepartmentHead: [
    {
      label: 'Department Dashboard',
      path: '/department-head/dashboard',
      icon: 'bi-building-check',
      end: true,
    },
    { label: 'Assessment Scores', path: '/department-head/assessment-scores', icon: 'bi-clipboard-data' },
    { label: '360 Feedback', path: '/department-head/feedback', icon: 'bi-chat-dots' },
    {
      label: 'Appraisals',
      path: '/department-head/appraisals',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Manager Review Check', path: '/department-head/appraisals/review', icon: 'bi-shield-check' },
        { label: 'Review Check Record', path: '/department-head/appraisals/history', icon: 'bi-clock-history' },
      ],
    },
    {
      label: 'One-on-One',
      path: '/one-on-one-meetings',
      icon: 'bi-chat-left-text',
      children: [
        { label: '1:1 Meetings', path: '/one-on-one-meetings', icon: 'bi-chat-dots' },
        { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-list-check' },
      ],
    },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  Manager: [
    { label: 'Manager Dashboard', path: '/manager/dashboard', icon: 'bi-person-workspace', end: true },
    { label: '360 Feedback', path: '/manager/feedback', icon: 'bi-chat-dots' },

    {
      label: 'Assessment Review',
      path: '/manager/assessment-review',
      icon: 'bi-person-check',
    },

    {
      label: 'Team Appraisals',
      path: '/manager/appraisals',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Employee Performance Review', path: '/manager/appraisals', icon: 'bi-pencil-square', end: true },
        { label: 'Review History List', path: '/manager/appraisals/history', icon: 'bi-clock-history' },
      ],
    },
    {
      label: 'One-on-One',
      path: '/one-on-one-meetings',
      icon: 'bi-chat-left-text',
      children: [
        { label: '1:1 Meetings', path: '/one-on-one-meetings', icon: 'bi-chat-dots' },
        { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-list-check' },
      ],
    },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-file-earmark-bar-graph' },
    {
      label: 'KPI Management',
      path: '/manager/kpi-scoring',
      icon: 'bi-graph-up',
      children: [
        { label: 'Employee KPI', path: '/manager/kpi-scoring', icon: 'bi-pencil-square', end: true },
        { label: 'KPI History List', path: '/manager/kpi-scoring', icon: 'bi-clock-history' },
      ],
    },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  Executive: [
    { label: 'Executive Dashboard', path: '/executive/dashboard', icon: 'bi-building', end: true },
    { label: 'Reports', path: '/executive/reports', icon: 'bi-bar-chart-line' },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
  ],
};

const normalizeRoleName = (role: string) =>
  String(role ?? '')
    .replace(/^ROLE_/i, '')
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

export const resolveUserRole = (user?: UserLike | null): UserRole => {
  if (!user) return 'Employee';

  const normalizedRoles = (user.roles ?? []).map(normalizeRoleName);
  const dashboard = normalizeRoleName(user.dashboard ?? '');

  if (normalizedRoles.includes('ADMIN') || dashboard === 'ADMIN_DASHBOARD') {
    return 'Admin';
  }

  if (
    normalizedRoles.includes('DEPARTMENT_HEAD') ||
    normalizedRoles.includes('DEPARTMENTHEAD') ||
    normalizedRoles.includes('DEPT_HEAD') ||
    dashboard === 'DEPARTMENT_HEAD_DASHBOARD' ||
    dashboard === 'DEPARTMENTHEAD_DASHBOARD' ||
    dashboard === 'DEPT_HEAD_DASHBOARD'
  ) {
    return 'DepartmentHead';
  }

  if (normalizedRoles.includes('HR') || dashboard === 'HR_DASHBOARD') {
    return 'HR';
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
  Admin: '/admin/dashboard',
  HR: '/dashboard',
  DepartmentHead: '/department-head/dashboard',
  Manager: '/manager/dashboard',
  Executive: '/executive/dashboard',
};

export const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  return role;
}; *//*








import type { MenuSection } from '../layouts/Sidebar';

export type RoleKey = 'Admin' | 'HR' | 'Manager' | 'DepartmentHead' | 'Employee' | 'Executive';

 */
/* export const dashboardRouteByRole: Record<RoleKey, string> = {
  Admin: '/admin/dashboard',
  HR: '/dashboard',
  Manager: '/manager/dashboard',
  DepartmentHead: '/department-head/dashboard',
  Employee: '/employee/dashboard',
  Executive: '/executive/dashboard',
}; *//*

export const dashboardPathByRole: Record<RoleKey, string> = {
  Admin: '/admin/dashboard',
  HR: '/dashboard',
  Manager: '/manager/dashboard',
  DepartmentHead: '/department-head/dashboard',
  Employee: '/employee/dashboard',
  Executive: '/executive/dashboard',
};

export const dashboardRouteByRole = dashboardPathByRole;


export const roleNavigation: Record<RoleKey, MenuSection[]> = {
  Admin: [
    {
      title: 'Admin',
      items: [
        { label: 'Dashboard', to: '/admin/dashboard', icon: 'bi bi-speedometer2' },
        { label: 'Users', to: '/admin/users', icon: 'bi bi-people' },
        { label: 'Roles', to: '/admin/roles', icon: 'bi bi-shield-lock' },
        { label: 'Permissions', to: '/permissions', icon: 'bi bi-key' },
        { label: 'User Roles', to: '/user-roles', icon: 'bi bi-person-lock' },
        { label: 'Role Permissions', to: '/role-permissions', icon: 'bi bi-diagram-3' },
        { label: 'Audit Logs', to: '/admin/audit-logs', icon: 'bi bi-clock-history' },
      ],
    },
    {
      title: 'Workforce',
      items: [
        { label: 'Employee Accounts', to: '/admin/employee/import', icon: 'bi bi-person-badge' },
      ],
    },
  ],

  HR: [
    {
      title: 'Core',
      items: [
        { label: 'Dashboard', to: '/dashboard', icon: 'bi bi-speedometer2' },
        { label: 'Profile', to: '/hr/profile', icon: 'bi bi-person-circle' },
        { label: 'Notifications', to: '/notifications', icon: 'bi bi-bell' },
      ],
    },
    {
      title: 'Employee',
      items: [
        { label: 'Employee Management', to: '/hr/employee', icon: 'bi bi-people' },
        { label: 'Workforce Dashboard', to: '/hr/employee/workforce', icon: 'bi bi-bar-chart' },
        { label: 'Employee Accounts', to: '/hr/employee/import', icon: 'bi bi-person-badge' },
      ],
    },
    {
      title: 'Organization',
      items: [
        { label: 'Teams', to: '/hr/team', icon: 'bi bi-diagram-3' },
        { label: 'Create Team', to: '/hr/team/create', icon: 'bi bi-plus-circle' },
        { label: 'Team History', to: '/hr/team/history', icon: 'bi bi-clock-history' },
        { label: 'Department', to: '/hr/department', icon: 'bi bi-building' },
        { label: 'Department Comparison', to: '/hr/department-comparison', icon: 'bi bi-bar-chart-steps' },
        { label: 'Audit Logs', to: '/hr/audit-logs', icon: 'bi bi-clock-history' },
      ],
    },
    {
      title: 'Position',
      items: [
        { label: 'Position List', to: '/hr/position', icon: 'bi bi-briefcase' },
        { label: 'Create Position', to: '/hr/position/create', icon: 'bi bi-plus-square' },
        { label: 'Position Level', to: '/hr/position-level', icon: 'bi bi-layers' },
      ],
    },
    {
      title: 'Assessment',
      items: [
        { label: 'Assessment Form', to: '/hr/assessment-form', icon: 'bi bi-ui-checks-grid' },
        { label: 'Assessment Scores', to: '/hr/assessment-score-table', icon: 'bi bi-table' },
      ],
    },
    {
      title: 'Appraisal',
      items: [
        { label: 'Appraisal History', to: '/hr/appraisal', icon: 'bi bi-journal-check' },
        { label: 'Feedback', to: '/hr/feedback', icon: 'bi bi-chat-square-text' },
      ],
    },
    {
      title: 'Performance KPI',
      items: [
        { label: 'KPI Units', to: '/hr/kpi/units', icon: 'bi bi-rulers' },
        { label: 'KPI Categories', to: '/hr/kpi/categories', icon: 'bi bi-tags' },
        { label: 'KPI Items', to: '/hr/kpi/items', icon: 'bi bi-list-check' },
        { label: 'KPI Templates', to: '/hr/kpi/templates', icon: 'bi bi-file-earmark-text' },
      ],
    },
    {
      title: 'PIP',
      items: [
        { label: 'Create PIP', to: '/hr/pip/create', icon: 'bi bi-clipboard-plus' },
        { label: 'Past Plans', to: '/hr/pip/past-plans', icon: 'bi bi-clock-history' },
        { label: 'PIP Updates', to: '/pip-updates', icon: 'bi bi-arrow-repeat' },
      ],
    },
    {
      title: 'System',
      items: [
        { label: 'Notification Templates', to: '/notification-templates', icon: 'bi bi-envelope-paper' },
      ],
    },
  ],

  Manager: [
    {
      title: 'Manager',
      items: [
        { label: 'Dashboard', to: '/manager/dashboard', icon: 'bi bi-speedometer2' },
        { label: 'Appraisal Review', to: '/manager/appraisals', icon: 'bi bi-clipboard-check' },
        { label: 'Appraisal History', to: '/manager/appraisals/history', icon: 'bi bi-clock-history' },
        { label: 'Team Reports', to: '/manager/reports', icon: 'bi bi-bar-chart' },
        { label: 'One-on-Ones', to: '/one-on-one-meetings', icon: 'bi bi-calendar-event' },
        { label: 'Action Items', to: '/one-on-one-action-items', icon: 'bi bi-check2-square' },
        { label: 'Create PIP', to: '/pip/create', icon: 'bi bi-clipboard-plus' },
        { label: 'Past PIPs', to: '/pip/past-plans', icon: 'bi bi-clock-history' },
        { label: 'Feedback', to: '/feedback', icon: 'bi bi-chat-square-text' },
      ],
    },
  ],

  DepartmentHead: [
    {
      title: 'Department Head',
      items: [
        { label: 'Dashboard', to: '/department-head/dashboard', icon: 'bi bi-speedometer2' },
        { label: 'Assessment Scores', to: '/department-head/assessment-scores', icon: 'bi bi-table' },
        { label: 'Appraisal Review', to: '/department-head/appraisals/review', icon: 'bi bi-clipboard-check' },
        { label: 'Appraisal History', to: '/department-head/appraisals/history', icon: 'bi bi-clock-history' },
        { label: 'One-on-Ones', to: '/one-on-one-meetings', icon: 'bi bi-calendar-event' },
        { label: 'Action Items', to: '/one-on-one-action-items', icon: 'bi bi-check2-square' },
        { label: 'Create PIP', to: '/pip/create', icon: 'bi bi-clipboard-plus' },
        { label: 'Past PIPs', to: '/pip/past-plans', icon: 'bi bi-clock-history' },
        { label: 'Feedback', to: '/feedback', icon: 'bi bi-chat-square-text' },
      ],
    },
  ],

  Employee: [
    {
      title: 'Employee',
      items: [
        { label: 'Dashboard', to: '/employee/dashboard', icon: 'bi bi-speedometer2' },
        { label: 'My KPIs', to: '/employee/kpis', icon: 'bi bi-bullseye' },
        { label: 'Appraisals', to: '/employee/appraisals', icon: 'bi bi-journal-check' },
        { label: 'Self Assessment', to: '/employee/self-assessment', icon: 'bi bi-ui-checks' },
        { label: 'Assessment Scores', to: '/employee/assessment-scores', icon: 'bi bi-table' },
        { label: 'Feedback', to: '/employee/feedback', icon: 'bi bi-chat-square-text' },
        { label: 'One-on-Ones', to: '/employee/one-on-ones', icon: 'bi bi-calendar-event' },
        { label: 'PIP', to: '/employee/pip', icon: 'bi bi-clipboard-data' },
        { label: 'Notifications', to: '/employee/notifications', icon: 'bi bi-bell' },
      ],
    },
  ],

  Executive: [
    {
      title: 'Executive',
      items: [
        { label: 'Dashboard', to: '/executive/dashboard', icon: 'bi bi-speedometer2' },
        { label: 'Reports', to: '/executive/reports', icon: 'bi bi-bar-chart-line' },
      ],
    },
  ],
};
 */
/*

export const resolveRoleKey = (dashboard?: string, roles: string[] = []): RoleKey => {
  const normalizedDashboard = dashboard?.toUpperCase();

  if (normalizedDashboard === 'ADMIN_DASHBOARD') {
    return 'Admin';
  }

  if (normalizedDashboard === 'HR_DASHBOARD') {
    return 'HR';
  }

  if (normalizedDashboard === 'MANAGER_DASHBOARD') {
    return 'Manager';
  }

  if (normalizedDashboard === 'DEPARTMENT_HEAD_DASHBOARD') {
    return 'DepartmentHead';
  }

  if (normalizedDashboard === 'EXECUTIVE_DASHBOARD') {
    return 'Executive';
  }

  const normalizedRoles = roles.map((role) =>
    role
      .replace(/^ROLE_/i, '')
      .replace(/[\s-]+/g, '_')
      .toUpperCase(),
  );

  if (normalizedRoles.includes('ADMIN')) return 'Admin';
  if (normalizedRoles.some((role) => role.includes('HR') || role.includes('HUMAN_RESOURCE'))) return 'HR';
  if (normalizedRoles.includes('MANAGER')) return 'Manager';
  if (normalizedRoles.includes('DEPARTMENT_HEAD') || normalizedRoles.includes('DEPARTMENTHEAD')) return 'DepartmentHead';
  if (normalizedRoles.includes('CEO') || normalizedRoles.includes('EXECUTIVE')) return 'Executive';

  return 'Employee';
};

export const resolveUserRole = resolveRoleKey;

 *//*

 */
/*
export const getDefaultRouteForRole = (role: RoleKey) => dashboardRouteByRole[role];
 *//*
 */
/*

export const getDefaultRouteForRole = (role: RoleKey) => dashboardPathByRole[role]; *//*

 */
/*
export const resolveRoleKey = (dashboard?: string, roles: string[] = []): RoleKey => {
  const normalizedDashboard = dashboard?.toUpperCase();

  if (normalizedDashboard === 'ADMIN_DASHBOARD') {
    return 'Admin';
  }

  if (normalizedDashboard === 'HR_DASHBOARD') {
    return 'HR';
  }

  if (normalizedDashboard === 'MANAGER_DASHBOARD') {
    return 'Manager';
  }

  if (normalizedDashboard === 'DEPARTMENT_HEAD_DASHBOARD') {
    return 'DepartmentHead';
  }

  if (normalizedDashboard === 'EXECUTIVE_DASHBOARD') {
    return 'Executive';
  }

  const normalizedRoles = roles.map((role) =>
    role
      .replace(/^ROLE_/i, '')
      .replace(/[\s-]+/g, '_')
      .toUpperCase(),
  );

  if (normalizedRoles.includes('ADMIN')) return 'Admin';
  if (normalizedRoles.some((role) => role.includes('HR') || role.includes('HUMAN_RESOURCE'))) return 'HR';
  if (normalizedRoles.includes('MANAGER')) return 'Manager';
  if (normalizedRoles.includes('DEPARTMENT_HEAD') || normalizedRoles.includes('DEPARTMENTHEAD')) return 'DepartmentHead';
  if (normalizedRoles.includes('CEO') || normalizedRoles.includes('EXECUTIVE')) return 'Executive';

  return 'Employee';
};

export const resolveUserRole = resolveRoleKey;

export const displayRoleName = (role: RoleKey): string => {
  switch (role) {
    case 'Admin':
      return 'Admin';
    case 'HR':
      return 'HR';
    case 'Manager':
      return 'Manager';
    case 'DepartmentHead':
      return 'Department Head';
    case 'Employee':
      return 'Employee';
    case 'Executive':
      return 'Executive';
    default:
      return 'User';
  }
};

export const getDefaultRouteForRole = (role: RoleKey) => dashboardPathByRole[role]; *//*







 */
/*

type UserLike = {
  dashboard?: unknown;
  roles?: unknown;
  role?: unknown;
};

const toText = (value: unknown): string => {
  return typeof value === 'string' ? value : '';
};

const normalizeRoleName = (role: unknown): string =>
  toText(role)
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const getRolesArray = (roles: unknown): string[] => {
  if (Array.isArray(roles)) {
    return roles.map((role) => toText(role)).filter(Boolean);
  }

  if (typeof roles === 'string') {
    return [roles];
  }

  return [];
};

export const resolveRoleKey = (
  dashboardOrUser?: unknown,
  rolesArg: unknown = [],
): RoleKey => {
  let dashboard = '';
  let roles: string[] = [];

  if (
    dashboardOrUser &&
    typeof dashboardOrUser === 'object' &&
    !Array.isArray(dashboardOrUser)
  ) {
    const user = dashboardOrUser as UserLike;
    dashboard = toText(user.dashboard);
    roles = getRolesArray(user.roles);

    if (roles.length === 0 && user.role) {
      roles = getRolesArray(user.role);
    }
  } else {
    dashboard = toText(dashboardOrUser);
    roles = getRolesArray(rolesArg);
  }

  const normalizedDashboard = dashboard.toUpperCase();

  if (normalizedDashboard === 'ADMIN_DASHBOARD') {
    return 'Admin';
  }

  if (normalizedDashboard === 'HR_DASHBOARD') {
    return 'HR';
  }

  if (normalizedDashboard === 'MANAGER_DASHBOARD') {
    return 'Manager';
  }

  if (normalizedDashboard === 'DEPARTMENT_HEAD_DASHBOARD') {
    return 'DepartmentHead';
  }

  if (normalizedDashboard === 'EXECUTIVE_DASHBOARD') {
    return 'Executive';
  }

  if (normalizedDashboard === 'EMPLOYEE_DASHBOARD') {
    return 'Employee';
  }

  const normalizedRoles = roles.map(normalizeRoleName);

  if (normalizedRoles.includes('ADMIN')) return 'Admin';

  if (
    normalizedRoles.some(
      (role) =>
        role === 'HR' ||
        role.includes('HR') ||
        role.includes('HUMAN_RESOURCE') ||
        role.includes('HUMAN_RESOURCES'),
    )
  ) {
    return 'HR';
  }

  if (normalizedRoles.includes('MANAGER')) return 'Manager';

  if (
    normalizedRoles.includes('DEPARTMENT_HEAD') ||
    normalizedRoles.includes('DEPARTMENTHEAD')
  ) {
    return 'DepartmentHead';
  }

  if (normalizedRoles.includes('CEO') || normalizedRoles.includes('EXECUTIVE')) {
    return 'Executive';
  }

  return 'Employee';
};

export const resolveUserRole = resolveRoleKey;

export const displayRoleName = (role: RoleKey): string => {
  switch (role) {
    case 'Admin':
      return 'Admin';
    case 'HR':
      return 'HR';
    case 'Manager':
      return 'Manager';
    case 'DepartmentHead':
      return 'Department Head';
    case 'Employee':
      return 'Employee';
    case 'Executive':
      return 'Executive';
    default:
      return 'User';
  }
};

export const getDefaultRouteForRole = (role: RoleKey) => dashboardPathByRole[role];

 *//*

 */








/*

export type UserRole = 'Admin' | 'HR' | 'Manager' | 'DepartmentHead' | 'Employee' | 'Executive';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  end?: boolean;
  children?: NavItem[];
}

export interface UserLike {
  dashboard?: unknown;
  roles?: unknown;
  role?: unknown;
}

export const roleNavigation: Record<UserRole, NavItem[]> = {
  Admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'bi-speedometer2' },
    { label: 'Users', path: '/admin/users', icon: 'bi-people' },
    { label: 'Roles', path: '/admin/roles', icon: 'bi-shield-lock' },
    { label: 'Permissions', path: '/permissions', icon: 'bi-key' },
    { label: 'User Roles', path: '/user-roles', icon: 'bi-person-lock' },
    { label: 'Role Permissions', path: '/role-permissions', icon: 'bi-diagram-3' },
    {
      label: 'Organization',
      path: '/admin/organization',
      icon: 'bi-building',
      children: [
        { label: 'Departments', path: '/admin/department', icon: 'bi-building' },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'bi-clock-history' },
      ],
    },
    {
      label: 'Positions',
      path: '/admin/position',
      icon: 'bi-briefcase',
      children: [
        { label: 'Create Position', path: '/admin/position/create', icon: 'bi-briefcase' },
        { label: 'Position Levels', path: '/admin/position-level/create', icon: 'bi-diagram-3' },
        { label: 'Positions Table', path: '/admin/position/table', icon: 'bi-table' },
      ],
    },
    { label: 'Employee Accounts', path: '/admin/employee/import', icon: 'bi-person-badge' },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-speedometer2' },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person-circle' },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    { label: 'Employee Management', path: '/hr/employee', icon: 'bi-people' },
    { label: 'Workforce Dashboard', path: '/hr/employee/workforce', icon: 'bi-bar-chart' },
    { label: 'Employee Accounts', path: '/hr/employee/import', icon: 'bi-person-badge' },
    { label: 'Teams', path: '/hr/team', icon: 'bi-diagram-3' },
    { label: 'Create Team', path: '/hr/team/create', icon: 'bi-plus-circle' },
    { label: 'Team History', path: '/hr/team/history', icon: 'bi-clock-history' },
    { label: 'Department', path: '/hr/department', icon: 'bi-building' },
    { label: 'Department Comparison', path: '/hr/department-comparison', icon: 'bi-bar-chart-steps' },
    { label: 'Audit Logs', path: '/hr/audit-logs', icon: 'bi-clock-history' },
    { label: 'Create Position', path: '/hr/position/create', icon: 'bi-plus-square' },
    { label: 'Position Level', path: '/hr/position-level/create', icon: 'bi-layers' },
    { label: 'Position List', path: '/hr/position/table', icon: 'bi-briefcase' },
    { label: 'Assessment Form', path: '/hr/assessment-form', icon: 'bi-ui-checks-grid' },
    { label: 'Assessment Scores', path: '/hr/assessment-score-table', icon: 'bi-table' },
    { label: 'Appraisal History', path: '/hr/appraisal', icon: 'bi-journal-check' },
    { label: '360 Feedback', path: '/hr/feedback', icon: 'bi-chat-square-text' },
    { label: 'KPI Units', path: '/hr/kpi/units', icon: 'bi-rulers' },
    { label: 'KPI Categories', path: '/hr/kpi/categories', icon: 'bi-tags' },
    { label: 'KPI Items', path: '/hr/kpi/items', icon: 'bi-list-check' },
    { label: 'KPI Templates', path: '/hr/kpi/templates', icon: 'bi-file-earmark-text' },
    { label: 'Create PIP', path: '/hr/pip/create', icon: 'bi-clipboard-plus' },
    { label: 'Past Plans', path: '/hr/pip/past-plans', icon: 'bi-clock-history' },
    { label: 'PIP Updates', path: '/pip-updates', icon: 'bi-arrow-repeat' },
    { label: 'Notification Templates', path: '/notification-templates', icon: 'bi-envelope-paper' },
  ],

  Manager: [
    { label: 'Dashboard', path: '/manager/dashboard', icon: 'bi-speedometer2' },
    { label: 'Appraisal Review', path: '/manager/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Appraisal History', path: '/manager/appraisals/history', icon: 'bi-clock-history' },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-bar-chart' },
    { label: 'One-on-Ones', path: '/one-on-one-meetings', icon: 'bi-calendar-event' },
    { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-check2-square' },

    { label: 'Continuous Feedback', to: '/continuous-feedback', icon: 'bi bi-chat-left-heart' },
    { label: 'Create PIP', path: '/pip/create', icon: 'bi-clipboard-plus' },
    { label: 'Past PIPs', path: '/pip/past-plans', icon: 'bi-clock-history' },
    { label: 'Feedback', path: '/feedback', icon: 'bi-chat-square-text' },
  ],

  DepartmentHead: [
    { label: 'Dashboard', path: '/department-head/dashboard', icon: 'bi-speedometer2' },
    { label: 'Assessment Scores', path: '/department-head/assessment-scores', icon: 'bi-table' },
    { label: 'Appraisal Review', path: '/department-head/appraisals/review', icon: 'bi-clipboard-check' },
    { label: 'Appraisal History', path: '/department-head/appraisals/history', icon: 'bi-clock-history' },
    { label: 'One-on-Ones', path: '/one-on-one-meetings', icon: 'bi-calendar-event' },
    { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-check2-square' },
    { label: 'Create PIP', path: '/pip/create', icon: 'bi-clipboard-plus' },
    { label: 'Past PIPs', path: '/pip/past-plans', icon: 'bi-clock-history' },
    { label: 'Feedback', path: '/feedback', icon: 'bi-chat-square-text' },
  ],

  Employee: [
    { label: 'Dashboard', path: '/employee/dashboard', icon: 'bi-speedometer2' },
    { label: 'My KPIs', path: '/employee/kpis', icon: 'bi-bullseye' },
    { label: 'Appraisals', path: '/employee/appraisals', icon: 'bi-journal-check' },
    { label: 'Self Assessment', path: '/employee/self-assessment', icon: 'bi-ui-checks' },
    { label: 'Assessment Scores', path: '/employee/assessment-scores', icon: 'bi-table' },
   */
/*   { label: 'Feedback', path: '/employee/feedback', icon: 'bi-chat-square-text' }, *//*

    { label: 'Feedback', to: '/employee/feedback', icon: 'bi bi-chat-square-text' },
    { label: 'Continuous Feedback', to: '/employee/continuous-feedback', icon: 'bi bi-chat-left-heart' },
    { label: 'One-on-Ones', path: '/employee/one-on-ones', icon: 'bi-calendar-event' },
    { label: 'PIP', path: '/employee/pip', icon: 'bi-clipboard-data' },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  Executive: [
    { label: 'Dashboard', path: '/executive/dashboard', icon: 'bi-speedometer2' },
    { label: 'Reports', path: '/executive/reports', icon: 'bi-bar-chart-line' },
  ],
};

export const dashboardPathByRole: Record<UserRole, string> = {
  Admin: '/admin/dashboard',
  HR: '/dashboard',
  Manager: '/manager/dashboard',
  DepartmentHead: '/department-head/dashboard',
  Employee: '/employee/dashboard',
  Executive: '/executive/dashboard',
};

export const dashboardRouteByRole = dashboardPathByRole;

const toText = (value: unknown): string => (typeof value === 'string' ? value : '');

const normalizeRoleName = (role: unknown): string =>
  toText(role)
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .toUpperCase();

const getRolesArray = (roles: unknown): string[] => {
  if (Array.isArray(roles)) {
    return roles.map((role) => toText(role)).filter(Boolean);
  }

  if (typeof roles === 'string') {
    return [roles];
  }

  return [];
};

export const resolveRoleKey = (
  dashboardOrUser?: unknown,
  rolesArg: unknown = [],
): UserRole => {
  let dashboard = '';
  let roles: string[] = [];

  if (dashboardOrUser && typeof dashboardOrUser === 'object' && !Array.isArray(dashboardOrUser)) {
    const user = dashboardOrUser as UserLike;
    dashboard = toText(user.dashboard);
    roles = getRolesArray(user.roles);

    if (roles.length === 0 && user.role) {
      roles = getRolesArray(user.role);
    }
  } else {
    dashboard = toText(dashboardOrUser);
    roles = getRolesArray(rolesArg);
  }

  const normalizedDashboard = dashboard.toUpperCase();

  if (normalizedDashboard === 'ADMIN_DASHBOARD') return 'Admin';
  if (normalizedDashboard === 'HR_DASHBOARD') return 'HR';
  if (normalizedDashboard === 'MANAGER_DASHBOARD') return 'Manager';
  if (normalizedDashboard === 'DEPARTMENT_HEAD_DASHBOARD') return 'DepartmentHead';
  if (normalizedDashboard === 'EXECUTIVE_DASHBOARD') return 'Executive';
  if (normalizedDashboard === 'EMPLOYEE_DASHBOARD') return 'Employee';

  const normalizedRoles = roles.map(normalizeRoleName);

  if (normalizedRoles.includes('ADMIN')) return 'Admin';

  if (
    normalizedRoles.some(
      (role) =>
        role === 'HR' ||
        role.includes('HR') ||
        role.includes('HUMAN_RESOURCE') ||
        role.includes('HUMAN_RESOURCES'),
    )
  ) {
    return 'HR';
  }

  if (normalizedRoles.includes('MANAGER')) return 'Manager';

  if (normalizedRoles.includes('DEPARTMENT_HEAD') || normalizedRoles.includes('DEPARTMENTHEAD')) {
    return 'DepartmentHead';
  }

  if (normalizedRoles.includes('CEO') || normalizedRoles.includes('EXECUTIVE')) return 'Executive';

  return 'Employee';
};

export const resolveUserRole = resolveRoleKey;

export const displayRoleName = (role: UserRole): string => {
  if (role === 'DepartmentHead') return 'Department Head';
  return role;
};

export const getDefaultRouteForRole = (role: UserRole) => dashboardPathByRole[role]; */









/*
export type UserRole = 'Admin' | 'HR' | 'Manager' | 'DepartmentHead' | 'Employee' | 'Executive';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  end?: boolean;
  children?: NavItem[];
}

export interface UserLike {
  dashboard?: unknown;
  roles?: unknown;
  role?: unknown;
  position?: unknown;
}

export const roleNavigation: Record<UserRole, NavItem[]> = {
  Admin: [
    { label: 'Dashboard', path: '/admin/dashboard', icon: 'bi-speedometer2' },
    { label: 'Users', path: '/admin/users', icon: 'bi-people' },
    { label: 'Roles', path: '/admin/roles', icon: 'bi-shield-lock' },
    { label: 'Permissions', path: '/permissions', icon: 'bi-key' },
    { label: 'User Roles', path: '/user-roles', icon: 'bi-person-lock' },
    { label: 'Role Permissions', path: '/role-permissions', icon: 'bi-diagram-3' },
    {
      label: 'Organization',
      path: '/admin/organization',
      icon: 'bi-building',
      children: [
        { label: 'Departments', path: '/admin/department', icon: 'bi-building' },
        { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'bi-clock-history' },
      ],
    },
    {
      label: 'Positions',
      path: '/admin/position',
      icon: 'bi-briefcase',
      children: [
        { label: 'Create Position', path: '/admin/position/create', icon: 'bi-briefcase' },
        { label: 'Position Levels', path: '/admin/position-level/create', icon: 'bi-diagram-3' },
        { label: 'Positions Table', path: '/admin/position/table', icon: 'bi-table' },
      ],
    },
    { label: 'Employee Accounts', path: '/admin/employee/import', icon: 'bi-person-badge' },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-speedometer2' },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person-circle' },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    { label: 'Employee Management', path: '/hr/employee', icon: 'bi-people' },
    { label: 'Workforce Dashboard', path: '/hr/employee/workforce', icon: 'bi-bar-chart' },
    { label: 'Employee Accounts', path: '/hr/employee/import', icon: 'bi-person-badge' },
    { label: 'Teams', path: '/hr/team', icon: 'bi-diagram-3' },
    { label: 'Create Team', path: '/hr/team/create', icon: 'bi-plus-circle' },
    { label: 'Team History', path: '/hr/team/history', icon: 'bi-clock-history' },
    { label: 'Department', path: '/hr/department', icon: 'bi-building' },
    { label: 'Department Comparison', path: '/hr/department-comparison', icon: 'bi-bar-chart-steps' },
    { label: 'Audit Logs', path: '/hr/audit-logs', icon: 'bi-clock-history' },
    { label: 'Create Position', path: '/hr/position/create', icon: 'bi-plus-square' },
    { label: 'Position Level', path: '/hr/position-level/create', icon: 'bi-layers' },
    { label: 'Position List', path: '/hr/position/table', icon: 'bi-briefcase' },
    { label: 'Assessment Form', path: '/hr/assessment-form', icon: 'bi-ui-checks-grid' },
    { label: 'Assessment Scores', path: '/hr/assessment-score-table', icon: 'bi-table' },
    { label: 'Appraisal History', path: '/hr/appraisal', icon: 'bi-journal-check' },
    { label: '360 Feedback', path: '/hr/feedback', icon: 'bi-chat-square-text' },
    { label: 'KPI Units', path: '/hr/kpi/units', icon: 'bi-rulers' },
    { label: 'KPI Categories', path: '/hr/kpi/categories', icon: 'bi-tags' },
    { label: 'KPI Items', path: '/hr/kpi/items', icon: 'bi-list-check' },
    { label: 'KPI Templates', path: '/hr/kpi/templates', icon: 'bi-file-earmark-text' },
    { label: 'Create PIP', path: '/hr/pip/create', icon: 'bi-clipboard-plus' },
    { label: 'Past Plans', path: '/hr/pip/past-plans', icon: 'bi-clock-history' },
    { label: 'PIP Updates', path: '/pip-updates', icon: 'bi-arrow-repeat' },
    { label: 'Notification Templates', path: '/notification-templates', icon: 'bi-envelope-paper' },
  ],

  Manager: [
    { label: 'Dashboard', path: '/manager/dashboard', icon: 'bi-speedometer2' },
    { label: 'Appraisal Review', path: '/manager/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Appraisal History', path: '/manager/appraisals/history', icon: 'bi-clock-history' },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-bar-chart' },
    { label: 'One-on-Ones', path: '/one-on-one-meetings', icon: 'bi-calendar-event' },
    { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-check2-square' },
    { label: 'Continuous Feedback', path: '/continuous-feedback', icon: 'bi-chat-left-heart' },
    { label: 'Create PIP', path: '/pip/create', icon: 'bi-clipboard-plus' },
    { label: 'Past PIPs', path: '/pip/past-plans', icon: 'bi-clock-history' },
    { label: 'Feedback', path: '/feedback', icon: 'bi-chat-square-text' },
  ],

  DepartmentHead: [
    { label: 'Dashboard', path: '/department-head/dashboard', icon: 'bi-speedometer2' },
    { label: 'Assessment Scores', path: '/department-head/assessment-scores', icon: 'bi-table' },
    { label: 'Appraisal Review', path: '/department-head/appraisals/review', icon: 'bi-clipboard-check' },
    { label: 'Appraisal History', path: '/department-head/appraisals/history', icon: 'bi-clock-history' },
    { label: 'One-on-Ones', path: '/one-on-one-meetings', icon: 'bi-calendar-event' },
    { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-check2-square' },
    { label: 'Create PIP', path: '/pip/create', icon: 'bi-clipboard-plus' },
    { label: 'Past PIPs', path: '/pip/past-plans', icon: 'bi-clock-history' },
    { label: 'Feedback', path: '/feedback', icon: 'bi-chat-square-text' },
  ],

  Employee: [
    { label: 'Dashboard', path: '/employee/dashboard', icon: 'bi-speedometer2' },
    { label: 'My KPIs', path: '/employee/kpis', icon: 'bi-bullseye' },
    { label: 'Appraisals', path: '/employee/appraisals', icon: 'bi-journal-check' },
    { label: 'Self Assessment', path: '/employee/self-assessment', icon: 'bi-ui-checks' },
    { label: 'Assessment Scores', path: '/employee/assessment-scores', icon: 'bi-table' },
    { label: 'Feedback', path: '/employee/feedback', icon: 'bi-chat-square-text' },
    { label: 'Continuous Feedback', path: '/employee/continuous-feedback', icon: 'bi-chat-left-heart' },
    { label: 'One-on-Ones', path: '/employee/one-on-ones', icon: 'bi-calendar-event' },
    { label: 'PIP', path: '/employee/pip', icon: 'bi-clipboard-data' },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  Executive: [
    { label: 'Dashboard', path: '/executive/dashboard', icon: 'bi-speedometer2' },
    { label: 'Reports', path: '/executive/reports', icon: 'bi-bar-chart-line' },
  ],
};

export const dashboardPathByRole: Record<UserRole, string> = {
  Admin: '/admin/dashboard',
  HR: '/dashboard',
  Manager: '/manager/dashboard',
  DepartmentHead: '/department-head/dashboard',
  Employee: '/employee/dashboard',
  Executive: '/executive/dashboard',
};

export const dashboardRouteByRole = dashboardPathByRole;

const toText = (value: unknown): string => {
  if (typeof value === 'string') return value;

  if (value && typeof value === 'object') {
    const objectValue = value as Record<string, unknown>;

    return (
      toText(objectValue.positionTitle) ||
      toText(objectValue.title) ||
      toText(objectValue.name) ||
      toText(objectValue.label)
    );
  }

  return '';
};

const normalizeRoleName = (role: unknown): string =>
  toText(role)
    .replace(/^ROLE_/i, '')
    .replace(/[\s-]+/g, '_')
    .replace(/[^A-Za-z0-9_]/g, '')
    .toUpperCase();

const getRolesArray = (roles: unknown): string[] => {
  if (Array.isArray(roles)) {
    return roles.map((role) => toText(role)).filter(Boolean);
  }

  if (typeof roles === 'string') {
    return [roles];
  }

  return [];
};

const isManagerLike = (value: string) =>
  value === 'MANAGER' ||
  value === 'PROJECT_MANAGER' ||
  value === 'PROJECTMANAGER' ||
  value === 'TEAM_LEADER' ||
  value === 'TEAMLEADER' ||
  value.includes('PROJECT_MANAGER') ||
  value.includes('PROJECTMANAGER') ||
  value.includes('TEAM_LEADER') ||
  value.includes('TEAMLEADER');

export const resolveRoleKey = (
  dashboardOrUser?: unknown,
  rolesArg: unknown = [],
): UserRole => {
  let dashboard = '';
  let roles: string[] = [];
  let position = '';

  if (dashboardOrUser && typeof dashboardOrUser === 'object' && !Array.isArray(dashboardOrUser)) {
    const user = dashboardOrUser as UserLike;
    dashboard = toText(user.dashboard);
    position = toText(user.position);
    roles = getRolesArray(user.roles);

    if (roles.length === 0 && user.role) {
      roles = getRolesArray(user.role);
    }
  } else {
    dashboard = toText(dashboardOrUser);
    roles = getRolesArray(rolesArg);
  }

  const normalizedDashboard = dashboard.toUpperCase();

  if (normalizedDashboard === 'ADMIN_DASHBOARD') return 'Admin';
  if (normalizedDashboard === 'HR_DASHBOARD') return 'HR';
  if (normalizedDashboard === 'MANAGER_DASHBOARD') return 'Manager';
  if (normalizedDashboard === 'DEPARTMENT_HEAD_DASHBOARD') return 'DepartmentHead';
  if (normalizedDashboard === 'EXECUTIVE_DASHBOARD') return 'Executive';

  const normalizedRoles = roles.map(normalizeRoleName);
  const normalizedPosition = normalizeRoleName(position);

  if (normalizedRoles.includes('ADMIN')) return 'Admin';

  if (
    normalizedRoles.some(
      (role) =>
        role === 'HR' ||
        role.includes('HR') ||
        role.includes('HUMAN_RESOURCE') ||
        role.includes('HUMAN_RESOURCES'),
    )
  ) {
    return 'HR';
  }

  if (normalizedRoles.includes('DEPARTMENT_HEAD') || normalizedRoles.includes('DEPARTMENTHEAD')) {
    return 'DepartmentHead';
  }

  if (normalizedRoles.includes('CEO') || normalizedRoles.includes('EXECUTIVE')) return 'Executive';

  if (normalizedRoles.some(isManagerLike) || isManagerLike(normalizedPosition)) {
    return 'Manager';
  }

  if (normalizedDashboard === 'EMPLOYEE_DASHBOARD') return 'Employee';

  return 'Employee';
};

export const resolveUserRole = resolveRoleKey;

export const displayRoleName = (role: UserRole): string => {
  if (role === 'DepartmentHead') return 'Department Head';
  return role;
};

export const getDefaultRouteForRole = (role: UserRole) => dashboardPathByRole[role]; */

export type UserRole = 'Admin' | 'HR' | 'Manager' | 'DepartmentHead' | 'Employee' | 'Executive';

export interface NavItem {
  label: string;
  path: string;
  icon: string;
  end?: boolean;
  children?: NavItem[];
}

export interface UserLike {
  dashboard?: unknown;
  roles?: unknown;
  role?: unknown;
}

export const roleNavigation: Record<UserRole, NavItem[]> = {
  Admin: [
    { label: 'Admin Dashboard', path: '/admin/dashboard', icon: 'bi-shield-lock', end: true },
    { label: 'User Accounts', path: '/admin/users', icon: 'bi-person-plus' },
    { label: 'Import Accounts', path: '/admin/employee/import', icon: 'bi-upload' },
    { label: 'Roles', path: '/admin/roles', icon: 'bi-person-badge' },
    { label: 'Audit Logs', path: '/admin/audit-logs', icon: 'bi-clock-history' },
    { label: 'Permissions', path: '/permissions', icon: 'bi-key' },
    { label: 'User Roles', path: '/user-roles', icon: 'bi-person-gear' },
    { label: 'Role Permissions', path: '/role-permissions', icon: 'bi-shield-check' },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-speedometer2', end: true },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person-circle' },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
  ],

  Manager: [
    { label: 'Manager Dashboard', path: '/manager/dashboard', icon: 'bi-person-workspace', end: true },
    { label: '360 Feedback', path: '/manager/feedback', icon: 'bi-chat-dots' },

    {
      label: 'Team Appraisals',
      path: '/manager/appraisals',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Employee Performance Review', path: '/manager/appraisals', icon: 'bi-pencil-square', end: true },
        { label: 'Review History List', path: '/manager/appraisals/history', icon: 'bi-clock-history' },
      ],
    },

    {
      label: 'One-on-One',
      path: '/one-on-one-meetings',
      icon: 'bi-chat-left-text',
      children: [
        { label: '1:1 Meetings', path: '/one-on-one-meetings', icon: 'bi-chat-dots', end: true },
        { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-list-check' },
      ],
    },

    { label: 'Continuous Feedback', path: '/continuous-feedback', icon: 'bi-chat-left-heart' },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-file-earmark-bar-graph' },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },

    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  DepartmentHead: [
    { label: 'Department Dashboard', path: '/department-head/dashboard', icon: 'bi-building-check', end: true },
    { label: 'Assessment Scores', path: '/department-head/assessment-scores', icon: 'bi-clipboard-data' },
    { label: '360 Feedback', path: '/department-head/feedback', icon: 'bi-chat-dots' },

    {
      label: 'Appraisals',
      path: '/department-head/appraisals',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Manager Review Check', path: '/department-head/appraisals/review', icon: 'bi-shield-check' },
        { label: 'Review Check Record', path: '/department-head/appraisals/history', icon: 'bi-clock-history' },
      ],
    },

    {
      label: 'One-on-One',
      path: '/one-on-one-meetings',
      icon: 'bi-chat-left-text',
      children: [
        { label: '1:1 Meetings', path: '/one-on-one-meetings', icon: 'bi-chat-dots', end: true },
        { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-list-check' },
      ],
    },

    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },

    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  Employee: [
    { label: 'My Dashboard', path: '/employee/dashboard', icon: 'bi-columns-gap', end: true },
    { label: 'My KPIs', path: '/employee/kpis', icon: 'bi-bullseye' },
    { label: 'My Appraisals', path: '/employee/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Self-Assessment', path: '/employee/self-assessment', icon: 'bi-pencil-square' },
    { label: 'Assessment Scores', path: '/employee/assessment-scores', icon: 'bi-table' },
    { label: '360 Feedback', path: '/employee/feedback', icon: 'bi-chat-dots' },
    { label: 'Continuous Feedback', path: '/employee/continuous-feedback', icon: 'bi-chat-left-heart' },
    { label: 'One-on-Ones', path: '/employee/one-on-ones', icon: 'bi-calendar-check' },
    { label: 'PIP', path: '/employee/pip', icon: 'bi-clipboard-data' },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  Executive: [
    { label: 'Executive Dashboard', path: '/executive/dashboard', icon: 'bi-building', end: true },
    { label: 'Reports', path: '/executive/reports', icon: 'bi-bar-chart-line' },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
  ],
};

export const dashboardPathByRole: Record<UserRole, string> = {
  Admin: '/admin/dashboard',
  HR: '/dashboard',
  Manager: '/manager/dashboard',
  DepartmentHead: '/department-head/dashboard',
  Employee: '/employee/dashboard',
  Executive: '/executive/dashboard',
};

export const dashboardRouteByRole = dashboardPathByRole;

const toText = (value: unknown): string => (typeof value === 'string' ? value : '');

const normalizeRoleName = (role: unknown): string =>
    toText(role)
        .replace(/^ROLE_/i, '')
        .replace(/[\s-]+/g, '_')
        .toUpperCase();

const getRolesArray = (roles: unknown): string[] => {
  if (Array.isArray(roles)) {
    return roles.map((role) => toText(role)).filter(Boolean);
  }

  if (typeof roles === 'string') {
    return [roles];
  }

  return [];
};

export const resolveRoleKey = (
    dashboardOrUser?: unknown,
    rolesArg: unknown = [],
): UserRole => {
  let dashboard = '';
  let roles: string[] = [];

  if (dashboardOrUser && typeof dashboardOrUser === 'object' && !Array.isArray(dashboardOrUser)) {
    const user = dashboardOrUser as UserLike;
    dashboard = toText(user.dashboard);
    roles = getRolesArray(user.roles);

    if (roles.length === 0 && user.role) {
      roles = getRolesArray(user.role);
    }
  } else {
    dashboard = toText(dashboardOrUser);
    roles = getRolesArray(rolesArg);
  }

  const normalizedDashboard = dashboard.toUpperCase();

  if (normalizedDashboard === 'ADMIN_DASHBOARD') return 'Admin';
  if (normalizedDashboard === 'HR_DASHBOARD') return 'HR';
  if (normalizedDashboard === 'MANAGER_DASHBOARD') return 'Manager';
  if (normalizedDashboard === 'DEPARTMENT_HEAD_DASHBOARD') return 'DepartmentHead';
  if (normalizedDashboard === 'EXECUTIVE_DASHBOARD') return 'Executive';
  if (normalizedDashboard === 'EMPLOYEE_DASHBOARD') return 'Employee';

  const normalizedRoles = roles.map(normalizeRoleName);

  if (normalizedRoles.includes('ADMIN')) return 'Admin';

  if (
      normalizedRoles.some(
          (role) =>
              role === 'HR' ||
              role.includes('HR') ||
              role.includes('HUMAN_RESOURCE') ||
              role.includes('HUMAN_RESOURCES'),
      )
  ) {
    return 'HR';
  }

  if (
      normalizedRoles.includes('MANAGER') ||
      normalizedRoles.includes('PROJECTMANAGER') ||
      normalizedRoles.includes('PROJECT_MANAGER') ||
      normalizedRoles.includes('TEAMLEADER') ||
      normalizedRoles.includes('TEAM_LEADER')
  ) {
    return 'Manager';
  }

  if (normalizedRoles.includes('DEPARTMENT_HEAD') || normalizedRoles.includes('DEPARTMENTHEAD')) {
    return 'DepartmentHead';
  }

  if (normalizedRoles.includes('CEO') || normalizedRoles.includes('EXECUTIVE')) {
    return 'Executive';
  }

  return 'Employee';
};

export const resolveUserRole = resolveRoleKey;

export const displayRoleName = (role: UserRole): string => {
  if (role === 'DepartmentHead') return 'Department Head';
  return role;
};

export const getDefaultRouteForRole = (role: UserRole) => dashboardPathByRole[role];