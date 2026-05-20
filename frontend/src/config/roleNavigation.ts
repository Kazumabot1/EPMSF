import type { PositionPermission } from '../types/positionPermission';

/*
  Role-based navigation configuration.
  Roles decide which dashboard/menu exists.
  Position permissions decide which visible features are shown.
*/

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
  permissionField?: keyof PositionPermission;
  children?: NavItem[];
}

export interface UserLike {
  roles?: string[];
  dashboard?: string;
}

export const disabledFeatureMessage = (positionName?: string | null) =>
  `Your position (${positionName || 'your position'}) has this feature disabled!`;

export const roleNavigation: Record<UserRole, NavItem[]> = {
  Employee: [
    { label: 'My Dashboard', path: '/employee/dashboard', icon: 'bi-columns-gap', end: true },
    { label: 'Team Management', path: '/employee/team-management', icon: 'bi-people-fill', permissionField: 'teamView' },
    { label: 'My KPIs', path: '/employee/kpis', icon: 'bi-bullseye', permissionField: 'kpiView' },
    { label: 'My Appraisals', path: '/employee/appraisals', icon: 'bi-clipboard-check', permissionField: 'appraisalView' },
    { label: 'Self-Assessment', path: '/employee/self-assessment', icon: 'bi-pencil-square', permissionField: 'selfAssessmentView' },
    { label: 'Received Continuous Feedback', path: '/employee/continuous-feedback', icon: 'bi-chat-dots', permissionField: 'continuousFeedbackView' },
    { label: 'Give Continuous Feedback', path: '/continuous-feedback', icon: 'bi-send', permissionField: 'continuousFeedbackGive' },
    { label: 'One-on-Ones', path: '/one-on-one-meetings', icon: 'bi-calendar-check', permissionField: 'oneOnOneCreate' },
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
        { label: 'Position Permissions', path: '/position-permissions', icon: 'bi-sliders2-vertical' },
      ],
    },
  ],

  HR: [
    { label: 'Dashboard', path: '/dashboard', icon: 'bi-grid-1x2', end: true },
    { label: 'Profile', path: '/hr/profile', icon: 'bi-person' },
    { label: 'Employees', path: '/hr/employee', icon: 'bi-people', permissionField: 'employeeCrud' },
    {
      label: 'Organization',
      path: '/hr/organization',
      icon: 'bi-building',
      children: [
        { label: 'Departments', path: '/hr/department', icon: 'bi-building', permissionField: 'departmentCrud' },
        { label: 'Department Comparison', path: '/hr/department-comparison', icon: 'bi-columns-gap', permissionField: 'departmentComparisonView' },
      ],
    },
    {
      label: 'Assessment',
      path: '/hr/assessment-scores',
      icon: 'bi-clipboard-data',
      children: [
        { label: 'Scores', path: '/hr/assessment-scores', icon: 'bi-clipboard-data', end: true, permissionField: 'selfAssessmentView' },
        { label: 'Form Create', path: '/hr/assessment-forms', icon: 'bi-ui-checks-grid', permissionField: 'selfAssessmentInput' },
      ],
    },
    {
      label: 'Appraisals',
      path: '/hr/appraisal',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Template Form Create', path: '/hr/appraisal/template-create', icon: 'bi-file-earmark-plus', permissionField: 'appraisalReview' },
        { label: 'Template Form Records', path: '/hr/appraisal/template-records', icon: 'bi-folder2-open', permissionField: 'appraisalView' },
        { label: 'Create Appraisal', path: '/hr/appraisal/create', icon: 'bi-calendar-plus', permissionField: 'appraisalApprove' },
        { label: 'Appraisal Create Records', path: '/hr/appraisal/create-records', icon: 'bi-journal-check', permissionField: 'appraisalView' },
        { label: 'Cycle Records', path: '/hr/appraisal/cycles', icon: 'bi-arrow-repeat', permissionField: 'appraisalView' },
        { label: 'Manager + Dept Review Check', path: '/hr/appraisal/review-check', icon: 'bi-shield-check', permissionField: 'appraisalReview' },
      ],
    },
    { label: '360 Feedback', path: '/hr/feedback/dashboard', icon: 'bi-chat-dots', permissionField: 'feedbackFormCreate' },
    {
      label: 'One-on-One',
      path: '/one-on-one-meetings',
      icon: 'bi-chat-left-text',
      children: [
        { label: '1:1 Meetings', path: '/one-on-one-meetings', icon: 'bi-chat-dots', permissionField: 'oneOnOneCreate' },
        { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-list-check', permissionField: 'oneOnOneCreate' },
      ],
    },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'View PIP', path: '/pip/past-plans', icon: 'bi-search', permissionField: 'pipViewAll' },
      ],
    },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    {
      label: 'Positions',
      path: '/hr/position/create',
      icon: 'bi-briefcase',
      permissionField: 'positionCrud',
      children: [
        { label: 'Create Position', path: '/hr/position/create', icon: 'bi-briefcase', permissionField: 'positionCrud' },
        { label: 'Position Levels', path: '/hr/position-level/create', icon: 'bi-diagram-3', permissionField: 'positionCrud' },
        { label: 'Positions Table', path: '/hr/position/table', icon: 'bi-table', permissionField: 'positionCrud' },
      ],
    },
    {
      label: 'KPI Management',
      path: '/hr/performance-kpi/unit',
      icon: 'bi-speedometer2',
      children: [
        { label: 'KPI Units', path: '/hr/performance-kpi/unit', icon: 'bi-speedometer2', permissionField: 'kpiCreate' },
        { label: 'KPI Categories', path: '/hr/performance-kpi/category', icon: 'bi-tags', permissionField: 'kpiCreate' },
        { label: 'KPI Items', path: '/hr/performance-kpi/item', icon: 'bi-card-checklist', permissionField: 'kpiCreate' },
        { label: 'KPI Templates', path: '/hr/kpi-template', icon: 'bi-ui-checks-grid', permissionField: 'kpiCreate' },
      ],
    },
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

  DepartmentHead: [
    { label: 'Department Dashboard', path: '/department-head/dashboard', icon: 'bi-building-check', end: true },
    {
      label: 'Teams',
      path: '/department-head/teams',
      icon: 'bi-people-fill',
      children: [
        { label: 'Teams', path: '/department-head/teams', icon: 'bi-people-fill', end: true },
        { label: 'Create Team', path: '/department-head/teams/create', icon: 'bi-plus-square', permissionField: 'teamCreate' },
        { label: 'Team History', path: '/department-head/team-history', icon: 'bi-clock-history', permissionField: 'teamHistory' },
      ],
    },
    { label: 'Continuous Feedback', path: '/continuous-feedback', icon: 'bi-chat-dots', permissionField: 'continuousFeedbackGive' },
    { label: 'Assessment Review', path: '/department-head/assessment-scores', icon: 'bi-clipboard-data', permissionField: 'selfAssessmentView' },
    {
      label: 'Appraisals',
      path: '/department-head/appraisals',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Manager Review Check', path: '/department-head/appraisals/review', icon: 'bi-shield-check', permissionField: 'appraisalReview' },
        { label: 'Review Check Record', path: '/department-head/appraisals/history', icon: 'bi-clock-history', permissionField: 'appraisalView' },
      ],
    },
    {
      label: 'One-on-One',
      path: '/one-on-one-meetings',
      icon: 'bi-chat-left-text',
      children: [
        { label: '1:1 Meetings', path: '/one-on-one-meetings', icon: 'bi-chat-dots', permissionField: 'oneOnOneCreate' },
        { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-list-check', permissionField: 'oneOnOneCreate' },
      ],
    },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create PIP', path: '/pip/create', icon: 'bi-plus-square', permissionField: 'pipCreate' },
        { label: 'PIP Records', path: '/pip/past-plans', icon: 'bi-search', permissionField: 'pipViewAll' },
      ],
    },
  ],

  Manager: [
    { label: 'Manager Dashboard', path: '/manager/dashboard', icon: 'bi-person-workspace', end: true },
    { label: 'Continuous Feedback', path: '/continuous-feedback', icon: 'bi-chat-dots', permissionField: 'continuousFeedbackGive' },
    { label: 'KPI Scoring', path: '/manager/kpi-scoring', icon: 'bi-bullseye', permissionField: 'kpiInput' },
    { label: 'Self-Assessment Review', path: '/manager/assessment-review', icon: 'bi-person-check', permissionField: 'selfAssessmentSign' },
    {
      label: 'Team Appraisals',
      path: '/manager/appraisals',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Employee Performance Review', path: '/manager/appraisals', icon: 'bi-pencil-square', end: true, permissionField: 'appraisalScoreInput' },
        { label: 'Review History List', path: '/manager/appraisals/history', icon: 'bi-clock-history', permissionField: 'appraisalView' },
      ],
    },
    {
      label: 'One-on-One',
      path: '/one-on-one-meetings',
      icon: 'bi-chat-left-text',
      children: [
        { label: '1:1 Meetings', path: '/one-on-one-meetings', icon: 'bi-chat-dots', permissionField: 'oneOnOneCreate' },
        { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-list-check', permissionField: 'oneOnOneCreate' },
      ],
    },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create PIP', path: '/pip/create', icon: 'bi-plus-square', permissionField: 'pipCreate' },
        { label: 'PIP Records', path: '/pip/past-plans', icon: 'bi-search', permissionField: 'pipCreate' },
      ],
    },
  ],

  Executive: [
    { label: 'CEO Dashboard', path: '/ceo/dashboard', icon: 'bi-building', end: true },
    { label: 'Reports', path: '/ceo/reports', icon: 'bi-bar-chart-line' },
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

  if (normalizedRoles.includes('ADMIN') || dashboard === 'ADMIN_DASHBOARD') return 'Admin';

  if (
    normalizedRoles.includes('DEPARTMENT_HEAD') ||
    normalizedRoles.includes('DEPARTMENTHEAD') ||
    normalizedRoles.includes('DEPT_HEAD') ||
    normalizedRoles.includes('HEAD_OF_DEPARTMENT') ||
    dashboard === 'DEPARTMENT_HEAD_DASHBOARD' ||
    dashboard === 'DEPARTMENTHEAD_DASHBOARD' ||
    dashboard === 'DEPT_HEAD_DASHBOARD'
  ) {
    return 'DepartmentHead';
  }

  if (normalizedRoles.includes('HR') || dashboard === 'HR_DASHBOARD') return 'HR';

  if (
    normalizedRoles.includes('MANAGER') ||
    normalizedRoles.includes('PROJECT_MANAGER') ||
    normalizedRoles.includes('TEAM_MANAGER') ||
    dashboard === 'MANAGER_DASHBOARD'
  ) {
    return 'Manager';
  }

  if (
    normalizedRoles.includes('CEO') ||
    normalizedRoles.includes('EXECUTIVE') ||
    dashboard === 'CEO_DASHBOARD' ||
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
  Executive: '/ceo/dashboard',
};

export const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  if (role === 'Executive') return 'CEO';
  return role;
};
