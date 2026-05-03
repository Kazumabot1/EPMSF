/*
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
}; */





/*
  Why this file is updated:
  - Removes old One-on-One > PIP Updates menu.
  - Adds professional PIP menu with:
    Create
    Past Plans
  - HR and Employee can view Past Plans only.
*/
/*

import {
  FaHome,
  FaUsers,
  FaBuilding,
  FaUserTie,
  FaLayerGroup,
  FaSitemap,
  FaBell,
  FaUserCircle,
  FaCalendarAlt,
  FaTasks,
  FaClipboardList,
} from "react-icons/fa";

export type NavItem = {
  label: string;
  path?: string;
  icon: any;
  children?: {
    label: string;
    path: string;
  }[];
};

const commonItems: NavItem[] = [
  {
    label: "Notifications",
    path: "/notifications",
    icon: FaBell,
  },
  {
    label: "My Profile",
    path: "/profile",
    icon: FaUserCircle,
  },
];

export const navigationByRole: Record<string, NavItem[]> = {
  ADMIN: [
    { label: "Dashboard", path: "/dashboard", icon: FaHome },
    {
      label: "Employees",
      icon: FaUsers,
      children: [
        { label: "Employee List", path: "/employees" },
        { label: "Create Employee", path: "/employees/create" },
      ],
    },
    {
      label: "Departments",
      icon: FaBuilding,
      children: [
        { label: "Department List", path: "/departments" },
        { label: "Create Department", path: "/departments/create" },
      ],
    },
    {
      label: "Positions",
      icon: FaUserTie,
      children: [
        { label: "Position List", path: "/positions" },
        { label: "Create Position", path: "/positions/create" },
      ],
    },
    {
      label: "Position Levels",
      icon: FaLayerGroup,
      children: [
        { label: "Level List", path: "/position-levels" },
        { label: "Create Level", path: "/position-levels/create" },
      ],
    },
    {
      label: "Roles",
      icon: FaUserTie,
      children: [
        { label: "Role List", path: "/roles" },
        { label: "Create Role", path: "/roles/create" },
      ],
    },
    {
      label: "Users",
      icon: FaUsers,
      children: [
        { label: "User List", path: "/users" },
        { label: "Create User", path: "/users/create" },
      ],
    },
    {
      label: "Teams",
      icon: FaSitemap,
      children: [
        { label: "Team List", path: "/teams" },
        { label: "Create Team", path: "/teams/create" },
      ],
    },
    {
      label: "One-on-One",
      icon: FaCalendarAlt,
      children: [
        { label: "1:1 Meetings", path: "/one-on-one/meetings" },
        { label: "Action Items", path: "/one-on-one/action-items" },
      ],
    },
    {
      label: "PIP",
      icon: FaClipboardList,
      children: [
        { label: "Create", path: "/pip/create" },
        { label: "Past Plans", path: "/pip/past-plans" },
      ],
    },
    ...commonItems,
  ],

  HR: [
    { label: "Dashboard", path: "/hr-dashboard", icon: FaHome },
    {
      label: "Employees",
      icon: FaUsers,
      children: [
        { label: "Employee List", path: "/employees" },
        { label: "Create Employee", path: "/employees/create" },
      ],
    },
    {
      label: "One-on-One",
      icon: FaCalendarAlt,
      children: [
        { label: "1:1 Meetings", path: "/one-on-one/meetings" },
        { label: "Action Items", path: "/one-on-one/action-items" },
      ],
    },
    {
      label: "PIP",
      icon: FaClipboardList,
      children: [{ label: "Past Plans", path: "/pip/past-plans" }],
    },
    ...commonItems,
  ],

  MANAGER: [
    { label: "Dashboard", path: "/dashboard", icon: FaHome },
    {
      label: "Teams",
      icon: FaSitemap,
      children: [
        { label: "Team List", path: "/teams" },
        { label: "Create Team", path: "/teams/create" },
      ],
    },
    {
      label: "One-on-One",
      icon: FaCalendarAlt,
      children: [
        { label: "1:1 Meetings", path: "/one-on-one/meetings" },
        { label: "Action Items", path: "/one-on-one/action-items" },
      ],
    },
    {
      label: "PIP",
      icon: FaClipboardList,
      children: [
        { label: "Create", path: "/pip/create" },
        { label: "Past Plans", path: "/pip/past-plans" },
      ],
    },
    ...commonItems,
  ],

  DEPARTMENT_HEAD: [
    { label: "Dashboard", path: "/department-head-dashboard", icon: FaHome },
    {
      label: "Employees",
      icon: FaUsers,
      children: [{ label: "Employee List", path: "/employees" }],
    },
    {
      label: "Teams",
      icon: FaSitemap,
      children: [{ label: "Team List", path: "/teams" }],
    },
    {
      label: "One-on-One",
      icon: FaCalendarAlt,
      children: [
        { label: "1:1 Meetings", path: "/one-on-one/meetings" },
        { label: "Action Items", path: "/one-on-one/action-items" },
      ],
    },
    {
      label: "PIP",
      icon: FaClipboardList,
      children: [
        { label: "Create", path: "/pip/create" },
        { label: "Past Plans", path: "/pip/past-plans" },
      ],
    },
    ...commonItems,
  ],

  EMPLOYEE: [
    { label: "Dashboard", path: "/employee-dashboard", icon: FaHome },
    {
      label: "One-on-One",
      icon: FaCalendarAlt,
      children: [
        { label: "1:1 Meetings", path: "/one-on-one/meetings" },
        { label: "Action Items", path: "/one-on-one/action-items" },
      ],
    },
    {
      label: "PIP",
      icon: FaClipboardList,
      children: [{ label: "Past Plans", path: "/pip/past-plans" }],
    },
    ...commonItems,
  ],
};

export function normalizeRoleName(role?: string | null): string {
  if (!role) return "EMPLOYEE";

  return role
    .replace("ROLE_", "")
    .replaceAll(" ", "_")
    .replaceAll("-", "_")
    .toUpperCase();
}

export function getNavigationForRole(role?: string | null): NavItem[] {
  const normalized = normalizeRoleName(role);
  return navigationByRole[normalized] || navigationByRole.EMPLOYEE;
} */






/*
  Why this file is fixed:
  - Your project uses Bootstrap Icons, not react-icons.
  - So this file must keep icon as string, like "bi-clipboard-check".
  - Adds PIP navigation without importing any new package.
*/
/*

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
    { label: 'PIP Past Plans', path: '/pip/past-plans', icon: 'bi-clipboard2-pulse' },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2', end: true },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person' },
    { label: 'Employees', path: '/hr/employee', icon: 'bi-people' },
    { label: 'Teams', path: '/hr/team', icon: 'bi-people-fill' },
    { label: 'Departments', path: '/hr/department', icon: 'bi-building' },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    { label: 'PIP Past Plans', path: '/pip/past-plans', icon: 'bi-clipboard2-pulse' },
  ],

  DepartmentHead: [
    {
      label: 'Department Dashboard',
      path: '/department-head/dashboard',
      icon: 'bi-building-check',
      end: true,
    },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    { label: 'PIP Create', path: '/pip/create', icon: 'bi-plus-square' },
    { label: 'PIP Past Plans', path: '/pip/past-plans', icon: 'bi-clipboard2-pulse' },
  ],

  Manager: [
    { label: 'Manager Dashboard', path: '/manager/dashboard', icon: 'bi-person-workspace', end: true },
    { label: 'Team Appraisals', path: '/manager/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-file-earmark-bar-graph' },
    { label: 'PIP Create', path: '/pip/create', icon: 'bi-plus-square' },
    { label: 'PIP Past Plans', path: '/pip/past-plans', icon: 'bi-clipboard2-pulse' },
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
}; */




/* roleNavigation.ts
   Why this file is fixed:
   - Manager sidebar uses this config.
   - Adds PIP as a dropdown for Manager and Department Head.
   - Employee gets Past Plans only.
   - HR still uses HR sidebar, but this also keeps HR role data consistent.
*/
/*
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
    { label: 'My Feedback', path: '/employee/feedback', icon: 'bi-chat-dots' },
    { label: 'One-on-Ones', path: '/employee/one-on-ones', icon: 'bi-calendar-check' },
    {
      label: 'PIP',
      path: '/pip/past-plans',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2', end: true },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person' },
    { label: 'Employees', path: '/hr/employee', icon: 'bi-people' },
    { label: 'Teams', path: '/hr/team', icon: 'bi-people-fill' },
    { label: 'Departments', path: '/hr/department', icon: 'bi-building' },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    {
      label: 'PIP',
      path: '/pip/past-plans',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  DepartmentHead: [
    {
      label: 'Department Dashboard',
      path: '/department-head/dashboard',
      icon: 'bi-building-check',
      end: true,
    },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    {
      label: 'PIP',
      path: '/pip/past-plans',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  Manager: [
    { label: 'Manager Dashboard', path: '/manager/dashboard', icon: 'bi-person-workspace', end: true },
    { label: 'Team Appraisals', path: '/manager/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-file-earmark-bar-graph' },
    {
      label: 'PIP',
      path: '/pip/past-plans',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
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
}; */





/* roleNavigation.ts
   Why this file is fixed:
   - Manager sidebar uses this config.
   - Adds PIP as a dropdown for Manager and Department Head.
   - Employee gets Past Plans only.
   - HR still uses HR sidebar, but this also keeps HR role data consistent.
*/
/*

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
    { label: 'My Feedback', path: '/employee/feedback', icon: 'bi-chat-dots' },
    { label: 'One-on-Ones', path: '/employee/one-on-ones', icon: 'bi-calendar-check' },
    {
      label: 'PIP',
      path: '/pip/past-plans',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2', end: true },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person' },
    { label: 'Employees', path: '/hr/employee', icon: 'bi-people' },
    { label: 'Teams', path: '/hr/team', icon: 'bi-people-fill' },
    { label: 'Departments', path: '/hr/department', icon: 'bi-building' },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    {
      label: 'PIP',
      path: '/pip/past-plans',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  DepartmentHead: [
    {
      label: 'Department Dashboard',
      path: '/department-head/dashboard',
      icon: 'bi-building-check',
      end: true,
    },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    {
      label: 'PIP',
      path: '/pip/past-plans',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  Manager: [
    { label: 'Manager Dashboard', path: '/manager/dashboard', icon: 'bi-person-workspace', end: true },
    { label: 'Team Appraisals', path: '/manager/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-file-earmark-bar-graph' },
    {
      label: 'PIP',
      path: '/pip/past-plans',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
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
}; */




/* roleNavigation.ts
   Why this file is fixed:
   - Manager sidebar uses this config.
   - Adds clear PIP dropdown for Manager and Department Head.
   - Employee gets Past Plans only.
   - Important:
     The parent PIP path is "/pip", not "/pip/past-plans".
     This makes active-child checking cleaner.
*/

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
    { label: 'My Feedback', path: '/employee/feedback', icon: 'bi-chat-dots' },
    { label: 'One-on-Ones', path: '/employee/one-on-ones', icon: 'bi-calendar-check' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
    { label: 'Notifications', path: '/employee/notifications', icon: 'bi-bell' },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2', end: true },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person' },
    { label: 'Employees', path: '/hr/employee', icon: 'bi-people' },
    { label: 'Teams', path: '/hr/team', icon: 'bi-people-fill' },
    { label: 'Departments', path: '/hr/department', icon: 'bi-building' },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
  ],

  DepartmentHead: [
    {
      label: 'Department Dashboard',
      path: '/department-head/dashboard',
      icon: 'bi-building-check',
      end: true,
    },
    { label: 'Assessment Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data' },
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
    { label: 'Team Appraisals', path: '/manager/appraisals', icon: 'bi-clipboard-check' },
    { label: 'Team Reports', path: '/manager/reports', icon: 'bi-file-earmark-bar-graph' },
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