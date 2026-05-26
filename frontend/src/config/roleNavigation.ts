import type { PositionPermission } from '../types/positionPermission';

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
  position?: string;
}

export const disabledFeatureMessage = (positionName?: string | null) =>
    `Your position (${positionName || 'your position'}) has this feature disabled!`;

const feedbackChildren: NavItem[] = [
  { label: 'Question Bank', path: '/hr/feedback/questions', icon: 'bi-question-circle' },
  { label: 'Question Rules', path: '/hr/feedback/question-rules', icon: 'bi-sliders' },
  { label: 'Dynamic Preview', path: '/hr/feedback/dynamic-preview', icon: 'bi-eye' },
  { label: 'Campaign Setup', path: '/hr/feedback/campaigns', icon: 'bi-calendar-plus' },
  { label: 'Targets & Evaluators', path: '/hr/feedback/targets', icon: 'bi-people' },
  { label: 'Assignment Preview', path: '/hr/feedback/assignment-preview', icon: 'bi-diagram-3' },
  { label: 'Monitoring', path: '/hr/feedback/monitoring', icon: 'bi-activity' },
  { label: 'Analytics', path: '/hr/feedback/analytics', icon: 'bi-graph-up' },
  { label: 'Audit Log', path: '/hr/feedback/audit', icon: 'bi-clock-history' },
];

const hrReportsChildren: NavItem[] = [
  { label: 'Performance Reports', path: '/hr/reports/performance', icon: 'bi-file-earmark-bar-graph', end: true },
  { label: 'Department Performance', path: '/hr/reports/department-performance', icon: 'bi-graph-up-arrow', end: true },
  { label: 'Assessment Scores', path: '/hr/reports/assessment-scores', icon: 'bi-clipboard-data', end: true },
  { label: 'PIP Status', path: '/hr/reports/pip-status', icon: 'bi-clipboard2-pulse', end: true },
  { label: 'Feedback Completion', path: '/hr/reports/feedback-completion', icon: 'bi-chat-dots', end: true },
  { label: 'Recommendations', path: '/hr/reports/recommendations', icon: 'bi-stars', end: true },
  { label: '360 Feedback Analytics', path: '/hr/feedback/analytics', icon: 'bi-graph-up' },
];

const departmentHeadReportsChildren: NavItem[] = [
  { label: 'Performance Reports', path: '/department-head/reports/performance', icon: 'bi-file-earmark-bar-graph', end: true },
  { label: 'Department Performance', path: '/department-head/reports/department-performance', icon: 'bi-building-check', end: true },
  { label: 'Assessment Scores', path: '/department-head/reports/assessment-scores', icon: 'bi-clipboard-data', end: true },
  { label: 'PIP Status', path: '/department-head/reports/pip-status', icon: 'bi-clipboard2-pulse', end: true },
  { label: 'Feedback Completion', path: '/department-head/reports/feedback-completion', icon: 'bi-chat-dots', end: true },
  { label: 'Recommendations', path: '/department-head/reports/recommendations', icon: 'bi-stars', end: true },
];

const managerReportsChildren: NavItem[] = [
  { label: 'Performance Reports', path: '/manager/reports/performance', icon: 'bi-file-earmark-bar-graph', end: true },
  { label: 'PIP Status', path: '/manager/reports/pip-status', icon: 'bi-clipboard2-pulse', end: true },
  { label: 'Feedback Completion', path: '/manager/reports/feedback-completion', icon: 'bi-chat-dots', end: true },
  { label: 'Recommendations', path: '/manager/reports/recommendations', icon: 'bi-stars', end: true },
];

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
    { label: 'Profile', path: '/profile', icon: 'bi-person' },
    { label: 'User Accounts', path: '/admin/users', icon: 'bi-person-plus' },
    { label: 'Import Accounts', path: '/admin/employee/import', icon: 'bi-upload' },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    {
      label: 'Access Control',
      path: '/position-permissions',
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
    { label: 'Employees', path: '/hr/employee', icon: 'bi-people' },
    {
      label: 'Teams',
      path: '/hr/team',
      icon: 'bi-people-fill',
      children: [
        { label: 'View Teams', path: '/hr/team', icon: 'bi-eye', end: true },
        { label: 'Team History', path: '/hr/team/history', icon: 'bi-clock-history' },
      ],
    },
    {
      label: 'Organization',
      path: '/hr/organization',
      icon: 'bi-building',
      children: [
        { label: 'Departments', path: '/hr/department', icon: 'bi-building', permissionField: 'departmentCrud' },
        {
          label: 'Department Comparison',
          path: '/hr/department-comparison',
          icon: 'bi-columns-gap',
          permissionField: 'departmentComparisonView',
        },
      ],
    },
    {
      label: 'Reports',
      path: '/hr/reports',
      icon: 'bi-file-earmark-bar-graph',
      children: hrReportsChildren,
    },
    {
      label: 'Assessment',
      path: '/hr/assessment-scores',
      icon: 'bi-clipboard-data',
      children: [
        {
          label: 'Scores',
          path: '/hr/assessment-scores',
          icon: 'bi-clipboard-data',
          end: true,
          permissionField: 'selfAssessmentView',
        },
        {
          label: 'Form Create',
          path: '/hr/assessment-forms',
          icon: 'bi-ui-checks-grid',
          permissionField: 'selfAssessmentInput',
        },
      ],
    },
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
    {
      label: '360 Feedback',
      path: '/hr/feedback/questions',
      icon: 'bi-chat-dots',
      children: feedbackChildren,
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
    {
      label: 'Notifications',
      path: '/notifications',
      icon: 'bi-bell',
      children: [
        { label: 'Notification Template', path: '/notification-templates', icon: 'bi-file-earmark-text' },
        { label: 'System Notification', path: '/notifications', icon: 'bi-bell' },
      ],
    },
    {
      label: 'PIP',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [{ label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' }],
    },
    {
      label: 'Positions',
      path: '/hr/position/create',
      icon: 'bi-briefcase',
      permissionField: 'positionCrud',
      children: [
        { label: 'Create Position', path: '/hr/position/create', icon: 'bi-briefcase' },
        { label: 'Position Levels', path: '/hr/position-level/create', icon: 'bi-diagram-3' },
        { label: 'Positions Table', path: '/hr/position/table', icon: 'bi-table' },
      ],
    },
    {
      label: 'KPI Management',
      path: '/hr/performance-kpi/unit',
      icon: 'bi-speedometer2',
      children: [
        { label: 'KPI Units', path: '/hr/performance-kpi/unit', icon: 'bi-speedometer2' },
        { label: 'KPI Categories', path: '/hr/performance-kpi/category', icon: 'bi-tags' },
        { label: 'KPI Items', path: '/hr/performance-kpi/item', icon: 'bi-card-checklist' },
        { label: 'KPI Templates', path: '/hr/kpi-template', icon: 'bi-ui-checks-grid' },
        { label: 'KPI Version History', path: '/hr/kpi-version-history', icon: 'bi-clock-history' },
        { label: 'KPI Template Cycle', path: '/hr/kpi-template-cycle', icon: 'bi-arrow-repeat' },
        { label: 'Employee KPI', path: '/hr/employee-kpis', icon: 'bi-person-lines-fill' },
      ],
    },
    {
      label: 'Department KPI Management',
      path: '/hr/department-kpi-template',
      icon: 'bi-building-gear',
      children: [
        { label: 'Department KPI Templates', path: '/hr/department-kpi-template', icon: 'bi-building-gear' },
        { label: 'Department KPI Cycle', path: '/hr/department-kpi-cycle', icon: 'bi-arrow-repeat' },
        { label: 'Department KPI Scoring', path: '/hr/department-kpi-scoring', icon: 'bi-clipboard2-check' },
        { label: 'Department KPI Results', path: '/hr/department-kpi-results', icon: 'bi-building-check' },
      ],
    },
  ],

  DepartmentHead: [
    { label: 'Department Dashboard', path: '/department-head/dashboard', icon: 'bi-building-check', end: true },
    { label: 'Profile', path: '/profile', icon: 'bi-person' },
    {
      label: 'View Self-assessment Form',
      path: '/department-head/self-assessment-forms',
      icon: 'bi bi-eye',
    },
    {
      label: 'Continuous Feedback',
      path: '/continuous-feedback',
      icon: 'bi-chat-dots',
      permissionField: 'continuousFeedbackGive',
    },
    {
      label: 'Assessment Review',
      path: '/department-head/assessment-scores',
      icon: 'bi-clipboard-data',
      permissionField: 'selfAssessmentView',
    },
    { label: '360 Feedback', path: '/department-head/feedback', icon: 'bi-chat-dots' },
    { label: 'Department KPIs', path: '/department-head/department-kpis', icon: 'bi-building-check' },
    {
      label: 'Teams',
      path: '/department-head/teams',
      icon: 'bi-people-fill',
      permissionField: 'teamView',
      children: [
        { label: 'View Teams', path: '/department-head/teams', icon: 'bi-eye', end: true },
        { label: 'Create Team', path: '/department-head/teams/create', icon: 'bi-plus-square', permissionField: 'teamCreate' },
        { label: 'Team History', path: '/department-head/team-history', icon: 'bi-clock-history', permissionField: 'teamHistory' },
      ],
    },
    {
      label: 'Reports',
      path: '/department-head/reports',
      icon: 'bi-file-earmark-bar-graph',
      children: departmentHeadReportsChildren,
    },
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
    {
      label: 'Assessment Review',
      path: '/manager/assessment-review',
      icon: 'bi-person-check',
      permissionField: 'selfAssessmentSign',
    },
    {
      label: 'Team Appraisals',
      path: '/manager/appraisals',
      icon: 'bi-clipboard-check',
      children: [
        { label: 'Performance Review', path: '/manager/appraisals', icon: 'bi-pencil-square', end: true },
        { label: 'Review History', path: '/manager/appraisals/history', icon: 'bi-clock-history' },
      ],
    },
    {
      label: 'Team KPIs',
      path: '/manager/kpi-scoring',
      icon: 'bi-bullseye',
      permissionField: 'kpiInput',
      children: [
        { label: 'KPI Scoring', path: '/manager/kpi-scoring', icon: 'bi-ui-checks-grid', end: true },
        { label: 'KPI History', path: '/manager/kpi/history', icon: 'bi-clock-history' },
      ],
    },
    { label: '360 Feedback', path: '/manager/feedback', icon: 'bi-chat-dots' },
    {
      label: 'Continuous Feedback',
      path: '/continuous-feedback',
      icon: 'bi-chat-dots',
      permissionField: 'continuousFeedbackGive',
    },
    {
      label: 'One-on-One Meetings',
      path: '/one-on-one-meetings',
      icon: 'bi-chat-left-text',
      children: [
        { label: '1:1 Meetings', path: '/one-on-one-meetings', icon: 'bi-chat-dots' },
        { label: 'Action Items', path: '/one-on-one-action-items', icon: 'bi-list-check' },
      ],
    },
    {
      label: 'PIP Tracking',
      path: '/pip',
      icon: 'bi-clipboard2-pulse',
      children: [
        { label: 'Create PIP', path: '/pip/create', icon: 'bi-plus-square' },
        { label: 'Past Plans', path: '/pip/past-plans', icon: 'bi-clock-history' },
      ],
    },
    {
      label: 'Reports',
      path: '/manager/reports',
      icon: 'bi-file-earmark-bar-graph',
      children: managerReportsChildren,
    },
    { label: 'Notifications', path: '/notifications', icon: 'bi-bell' },
    { label: 'My Self-Assessment', path: '/manager/self-assessment', icon: 'bi-pencil-square' },
  ],

  Executive: [
    { label: 'Executive Dashboard', path: '/executive/dashboard', icon: 'bi-building', end: true },
    { label: 'Profile', path: '/profile', icon: 'bi-person' },
    {
      label: 'Approval',
      path: '/executive/approval/kpi',
      icon: 'bi-shield-check',
      children: [
        { label: 'KPI Approval', path: '/executive/approval/kpi', icon: 'bi-bullseye', end: true },
        { label: 'Department KPI Approval', path: '/executive/approval/department-kpi', icon: 'bi-building-check', end: true },
      ],
    },
    {
      label: 'Reports',
      path: '/executive/reports',
      icon: 'bi-bar-chart-line',
      children: [
        { label: 'Performance Reports', path: '/executive/reports/performance', icon: 'bi-file-earmark-bar-graph', end: true },
        { label: 'Department Performance', path: '/executive/reports/department-performance', icon: 'bi-building-check', end: true },
        { label: 'PIP Status', path: '/executive/reports/pip-status', icon: 'bi-clipboard2-pulse', end: true },
        { label: 'Feedback Completion', path: '/executive/reports/feedback-completion', icon: 'bi-chat-dots', end: true },
        { label: 'Recommendations', path: '/executive/reports/recommendations', icon: 'bi-stars', end: true },
      ],
    },
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
  const normalizedPosition = normalizeRoleName(user.position ?? '');

  if (normalizedRoles.includes('ADMIN') || dashboard === 'ADMIN_DASHBOARD') {
    return 'Admin';
  }

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

  if (
      normalizedRoles.includes('HR') ||
      dashboard === 'HR_DASHBOARD' ||
      normalizedPosition.includes('HR') ||
      normalizedPosition.includes('HUMAN_RESOURCE')
  ) {
    return 'HR';
  }

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
  Executive: '/executive/dashboard',
};

export const displayRoleName = (role: UserRole) => {
  if (role === 'DepartmentHead') return 'Department Head';
  if (role === 'Executive') return 'CEO';
  return role;
};
