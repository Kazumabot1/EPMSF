import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';
import api from '../../services/api';
import { useNotificationsWebSocket } from '../../hooks/useNotificationsWebSocket';
import SidebarCompanyLogo from './SidebarCompanyLogo';
import {
  emptyPositionPermission,
  positionPermissionService,
} from '../../services/positionPermissionService';
import type { PositionPermission } from '../../types/positionPermission';

type SidebarProps = {
  collapsed: boolean;
  onToggle: () => void;
  variant?: 'admin' | 'hr';
};

type NavItem = {
  to: string;
  label: string;
  icon: string;
  end?: boolean;
  children?: NavItem[];
};

const normalizeRoleName = (role?: string | null) =>
    String(role ?? '')
        .replace(/^ROLE_/i, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toUpperCase();

const allow = (permissions: PositionPermission, key: keyof PositionPermission) => {
  switch (key) {
    case 'teamPermission':
      return Boolean(permissions.teamPermission);
    case 'teamView':
      return Boolean(permissions.teamView);
    case 'teamCreate':
      return Boolean(permissions.teamCreate);
    case 'teamEdit':
      return Boolean(permissions.teamEdit);
    case 'teamHistory':
      return Boolean(permissions.teamHistory);

    case 'departmentCrud':
    case 'departmentComparisonView':
    case 'employeeCrud':
    case 'employeeExcelImport':
      return Boolean(permissions.organizationPermission && permissions[key]);

    case 'assessmentScoresView':
    case 'assessmentFormCreate':
      return Boolean(permissions.assessmentPermission && permissions[key]);

    case 'appraisalPermission':
      return Boolean(permissions.appraisalPermission);

    case 'continuousFeedbackView':
    case 'continuousFeedbackGive':
      return Boolean(permissions.continuousFeedbackView);

    case 'feedback360Permission':
      return Boolean(permissions.feedback360Permission);

    case 'oneOnOnePermission':
      return Boolean(permissions.oneOnOnePermission);

    case 'pipViewAll':
      return Boolean(permissions.pipViewAll);

    case 'positionPermission':
    case 'positionCrud':
      return Boolean(permissions.positionPermission);

    case 'kpiPermission':
      return Boolean(permissions.kpiPermission);

    case 'departmentKpiPermission':
      return Boolean(permissions.departmentKpiPermission);

    default:
      return Boolean(permissions[key]);
  }
};

const compactItems = (items: Array<NavItem | false | null | undefined>) => {
  return items.filter(Boolean) as NavItem[];
};

const Sidebar = ({ collapsed, onToggle, variant }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStorage.getUser();

  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [positionPermissions, setPositionPermissions] = useState<PositionPermission>(
      emptyPositionPermission(),
  );
  const [hasMyTeams, setHasMyTeams] = useState(false);

  const dashboard = user?.dashboard ?? '';
  const normalizedRoles = (user?.roles ?? []).map(normalizeRoleName);
  const normalizedDashboard = normalizeRoleName(dashboard);

  const isHrAdmin =
      normalizedRoles.includes('HRADMIN') ||
      normalizedDashboard === 'HRADMIN_DASHBOARD';

  const isHr =
      normalizedRoles.includes('HR') ||
      normalizedDashboard === 'HR_DASHBOARD';

  const isDepartmentHead =
      normalizedRoles.includes('DEPARTMENT_HEAD') ||
      normalizedRoles.includes('DEPARTMENTHEAD') ||
      normalizedRoles.includes('DEPT_HEAD') ||
      normalizedRoles.includes('HEAD_OF_DEPARTMENT') ||
      normalizedDashboard === 'DEPARTMENT_HEAD_DASHBOARD';

  const isManager =
      normalizedRoles.includes('MANAGER') ||
      normalizedRoles.includes('PROJECT_MANAGER') ||
      normalizedRoles.includes('TEAM_MANAGER') ||
      normalizedDashboard === 'MANAGER_DASHBOARD';

  const isExecutive =
      normalizedRoles.includes('CEO') ||
      normalizedRoles.includes('EXECUTIVE') ||
      normalizedDashboard === 'CEO_DASHBOARD' ||
      normalizedDashboard === 'EXECUTIVE_DASHBOARD';

  const isEmployee =
      !isHrAdmin &&
      !isHr &&
      !isDepartmentHead &&
      !isManager &&
      !isExecutive &&
      (normalizedRoles.includes('EMPLOYEE') ||
          normalizedDashboard === 'EMPLOYEE_DASHBOARD');

  const canCreatePip = variant !== 'admin' && !isEmployee && allow(positionPermissions, 'pipCreate');
  const canViewPip = allow(positionPermissions, 'pipViewAll') || canCreatePip || allow(positionPermissions, 'pipEdit');

  const roleLabel =
      variant === 'admin'
          ? 'HR Admin'
          : variant === 'hr'
              ? 'HR'
              : isHrAdmin
                  ? 'HR Admin'
                  : isHr
                      ? 'HR'
                      : isDepartmentHead
                          ? 'Department Head'
                          : isManager
                              ? 'Manager'
                              : isEmployee
                                  ? 'Employee'
                                  : isExecutive
                                      ? 'Executive'
                                      : 'User';

  useEffect(() => {
    let cancelled = false;

    positionPermissionService
        .getMyPermissions()
        .then((data) => {
          if (!cancelled) {
            setPositionPermissions({ ...emptyPositionPermission(), ...data });
          }
        })
        .catch(() => {
          if (!cancelled) {
            setPositionPermissions(emptyPositionPermission());
          }
        });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    api.get('/teams/my-teams')
        .then((response) => {
          if (cancelled) {
            return;
          }

          const payload = response.data as { data?: unknown } | unknown;
          const list = payload && typeof payload === 'object' && 'data' in payload
              ? (payload as { data?: unknown }).data
              : payload;

          setHasMyTeams(Array.isArray(list) && list.length > 0);
        })
        .catch(() => {
          if (!cancelled) {
            setHasMyTeams(false);
          }
        });

    return () => {
      cancelled = true;
    };
  }, [user?.id, location.pathname]);

  const navItems: NavItem[] = useMemo(() => {
    const pipChildren: NavItem[] = canCreatePip
        ? [
          { to: '/pip/create', label: 'Create', icon: 'bi bi-plus-square' },
          { to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' },
        ]
        : [{ to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' }];

    const hrAdminNavItems: NavItem[] = [
      { to: '/hradmin/dashboard', label: 'HR Admin Dashboard', icon: 'bi bi-shield-lock' },
      { to: '/hradmin/users', label: 'User Accounts', icon: 'bi bi-person-plus' },
      { to: '/hradmin/employee/import', label: 'Import Accounts', icon: 'bi bi-upload' },
      {
        to: '/hradmin/approval/kpi',
        label: 'Approval',
        icon: 'bi bi-shield-check',
        children: [
          { to: '/hradmin/approval/kpi', label: 'KPI Approval', icon: 'bi bi-bullseye', end: true },
          { to: '/hradmin/approval/department-kpi', label: 'Department KPI Approval', icon: 'bi bi-building-check' },
          { to: '/hradmin/approval/changes', label: 'Position & Department Changes', icon: 'bi bi-arrow-left-right' },
        ],
      },
      { to: '/hradmin/audit-logs', label: 'Audit Logs', icon: 'bi bi-clock-history' },
      { to: '/notifications', label: 'Notifications', icon: 'bi bi-bell' },
      {
        to: '/position-permissions',
        label: 'Access Control',
        icon: 'bi bi-shield-lock',
        children: [
          {
            to: '/position-permissions',
            label: 'Position Permissions',
            icon: 'bi bi-sliders2-vertical',
          },
        ],
      },
    ];

    const assessmentChildren = compactItems([
      allow(positionPermissions, 'assessmentScoresView') && {
        to: '/hr/assessment-scores',
        label: 'Scores',
        icon: 'bi bi-clipboard-data',
        end: true,
      },
      allow(positionPermissions, 'assessmentFormCreate') && {
        to: '/hr/assessment-forms',
        label: 'Form Create',
        icon: 'bi bi-ui-checks-grid',
        end: true,
      },
    ]);

    const organizationChildren = compactItems([
      allow(positionPermissions, 'departmentCrud') && {
        to: '/hr/department',
        label: 'Departments',
        icon: 'bi bi-building',
      },
      allow(positionPermissions, 'departmentComparisonView') && {
        to: '/hr/department-comparison',
        label: 'Departments Comparison',
        icon: 'bi bi-columns-gap',
        end: true,
      },
      allow(positionPermissions, 'employeeCrud') && {
        to: '/hr/employee',
        label: 'Employee',
        icon: 'bi bi-people',
        end: true,
      },
    ]);

    const hrNavItems: NavItem[] = compactItems([
      { to: '/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
      { to: '/hr/kpis', label: 'My KPIs', icon: 'bi bi-bullseye' },

      {
        to: '/hr/team',
        label: 'Teams',
        icon: 'bi bi-people-fill',
        children: [
          { to: '/hr/team', label: 'View Teams', icon: 'bi bi-eye', end: true },
          {
            to: '/hr/team/history',
            label: 'Team History',
            icon: 'bi bi-clock-history',
            end: true,
          },
        ],
      },

      organizationChildren.length > 0 && {
        to: '/hr/organization',
        label: 'Organization',
        icon: 'bi bi-building',
        children: organizationChildren,
      },

      assessmentChildren.length > 0 && {
        to: '/hr/assessment-scores',
        label: 'Assessment',
        icon: 'bi bi-clipboard-data',
        children: [
          { to: '/hr/assessment-scores', label: 'Scores', icon: 'bi bi-clipboard-data', end: true },
          { to: '/hr/assessment-forms', label: 'Form Create', icon: 'bi bi-ui-checks-grid', end: true },
          { to: '/hr/assessment-form-records', label: 'Form Record', icon: 'bi bi-folder2-open', end: true },
        ],
      },

      {
        to: '/hr/reports',
        label: 'Reports',
        icon: 'bi bi-file-earmark-bar-graph',
        children: [
          {
            to: '/hr/reports/performance',
            label: 'Performance Reports',
            icon: 'bi bi-file-earmark-bar-graph',
            end: true,
          },
          {
            to: '/hr/reports/department-performance',
            label: 'Department Performance',
            icon: 'bi bi-graph-up-arrow',
            end: true,
          },
          {
            to: '/hr/reports/assessment-scores',
            label: 'Assessment Scores',
            icon: 'bi bi-clipboard-data',
            end: true,
          },
          {
            to: '/hr/reports/pip-status',
            label: 'PIP Status',
            icon: 'bi bi-clipboard2-pulse',
            end: true,
          },
          {
            to: '/hr/reports/feedback-completion',
            label: 'Feedback Completion',
            icon: 'bi bi-chat-dots',
            end: true,
          },
          {
            to: '/hr/reports/recommendations',
            label: 'Recommendations',
            icon: 'bi bi-stars',
            end: true,
          },
          {
            to: '/hr/feedback/analytics',
            label: '360 Feedback Analytics',
            icon: 'bi bi-bar-chart-line',
          },
        ],
      },

      allow(positionPermissions, 'appraisalPermission') && {
        to: '/hr/appraisal',
        label: 'Appraisals',
        icon: 'bi bi-clipboard-check',
        children: [
          {
            to: '/hr/appraisal',
            label: 'Appraisal Cycle Dashboard',
            icon: 'bi bi-speedometer2',
            end: true,
          },
          {
            to: '/hr/appraisal/template-create',
            label: 'Template Form Create',
            icon: 'bi bi-file-earmark-plus',
          },
          {
            to: '/hr/appraisal/template-forms',
            label: 'Template Form Records',
            icon: 'bi bi-folder2-open',
          },
          {
            to: '/hr/appraisal/create',
            label: 'Create Appraisal',
            icon: 'bi bi-calendar-plus',
          },
          {
            to: '/hr/appraisal/cycles',
            label: 'Cycle Records',
            icon: 'bi bi-arrow-repeat',
          },
          {
            to: '/hr/appraisal/review-check',
            label: 'Manager + Dept Review Check',
            icon: 'bi bi-shield-check',
          },
          {
            to: '/hr/appraisal/employee-reviews',
            label: 'Employee Reviews',
            icon: 'bi bi-person-lines-fill',
          },
        ],
      },

      allow(positionPermissions, 'feedback360Permission') && {
        to: '/hr/feedback/questions',
        label: '360 Feedback',
        icon: 'bi bi-chat-square-dots',
        children: [
          {
            to: '/hr/feedback/questions',
            label: 'Question Bank',
            icon: 'bi bi-collection',
            end: true,
          },
          { to: '/hr/feedback/question-rules', label: 'Question Rules', icon: 'bi bi-sliders' },
          { to: '/hr/feedback/campaigns', label: 'Campaign Setup', icon: 'bi bi-megaphone' },
          { to: '/hr/feedback/monitoring', label: 'Monitoring', icon: 'bi bi-graph-up-arrow' },
          { to: '/hr/feedback/analytics', label: 'Analytics', icon: 'bi bi-bar-chart-line' },
        ],
      },

      allow(positionPermissions, 'oneOnOnePermission') && {
        to: '/one-on-one-meetings',
        label: 'One-on-One',
        icon: 'bi bi-chat-left-text',
        children: [
          { to: '/one-on-one-meetings', label: '1:1 Meetings', icon: 'bi bi-chat-dots' },
          { to: '/one-on-one-action-items', label: 'Action Items', icon: 'bi bi-list-check' },
        ],
      },

      canViewPip && {
        to: '/pip',
        label: 'PIP',
        icon: 'bi bi-clipboard2-pulse',
        children: pipChildren,
      },

      {
        to: '/notifications',
        label: 'Notifications',
        icon: 'bi bi-bell',
        children: [
          {
            to: '/announcements',
            label: 'Announcement',
            icon: 'bi bi-file-earmark-text',
          },
          { to: '/notifications', label: 'Notifications', icon: 'bi bi-bell' },
        ],
      },

      allow(positionPermissions, 'positionPermission') && {
        to: '/hr/position/create',
        label: 'Positions',
        icon: 'bi bi-briefcase',
        children: [
          { to: '/hr/position/create', label: 'Create Position', icon: 'bi bi-briefcase' },
          { to: '/hr/position-level/create', label: 'Position Levels', icon: 'bi bi-diagram-3' },
          { to: '/hr/position/table', label: 'Positions Table', icon: 'bi bi-table' },
        ],
      },

      allow(positionPermissions, 'kpiPermission') && {
        to: '/hr/performance-kpi/unit',
        label: 'KPI Management',
        icon: 'bi bi-speedometer2',
        children: [
          { to: '/hr/performance-kpi/unit', label: 'KPI Units', icon: 'bi bi-speedometer2' },
          { to: '/hr/performance-kpi/category', label: 'KPI Categories', icon: 'bi bi-tags' },
          { to: '/hr/performance-kpi/item', label: 'KPI Items', icon: 'bi bi-card-checklist' },
          { to: '/hr/kpi-template', label: 'KPI Templates', icon: 'bi bi-ui-checks-grid' },
          { to: '/hr/kpi-version-history', label: 'KPI Version History', icon: 'bi bi-clock-history' },
          { to: '/hr/kpi-template-cycle', label: 'KPI Template Cycle', icon: 'bi bi-arrow-repeat' },
          { to: '/hr/employee-kpis', label: 'Employee KPI', icon: 'bi bi-person-lines-fill' },
        ],
      },

      allow(positionPermissions, 'departmentKpiPermission') && {
        to: '/hr/department-kpi-template',
        label: 'Department KPI Management',
        icon: 'bi bi-building-gear',
        children: [
          {
            to: '/hr/department-kpi-template',
            label: 'Department KPI Templates',
            icon: 'bi bi-building-gear',
          },
          {
            to: '/hr/department-kpi-cycle',
            label: 'Department KPI Cycle',
            icon: 'bi bi-arrow-repeat',
          },
          {
            to: '/hr/department-kpi-scoring',
            label: 'Department KPI Scoring',
            icon: 'bi bi-clipboard2-check',
          },
          {
            to: '/hr/department-kpi-results',
            label: 'Department KPI Results',
            icon: 'bi bi-building-check',
          },
        ],
      },
    ]);

    const employeeNavItems: NavItem[] = compactItems([
      { to: '/employee/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
      { to: '/profile', label: 'Profile', icon: 'bi bi-person' },
      hasMyTeams && { to: '/my-team', label: 'My Team', icon: 'bi bi-diagram-3' },
      { to: '/employee/kpis', label: 'My KPIs', icon: 'bi bi-bullseye' },
      { to: '/employee/appraisals', label: 'My Appraisals', icon: 'bi bi-clipboard-check' },
      { to: '/employee/self-assessment', label: 'Self-Assessment', icon: 'bi bi-pencil-square' },
      { to: '/employee/feedback', label: '360 Feedback', icon: 'bi bi-chat-dots' },
      { to: '/employee/one-on-ones', label: 'One-on-Ones', icon: 'bi bi-calendar-check' },
      {
        to: '/pip',
        label: 'PIP',
        icon: 'bi bi-clipboard2-pulse',
        children: [{ to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' }],
      },
      { to: '/employee/notifications', label: 'Notifications', icon: 'bi bi-bell' },
    ]);

    const managerNavItems: NavItem[] = compactItems([
      {
        to: '/manager/dashboard',
        label: 'Manager Dashboard',
        icon: 'bi bi-grid-1x2',
      },
      {
        to: '/profile',
        label: 'Profile',
        icon: 'bi bi-person',
      },
      hasMyTeams && {
        to: '/my-team',
        label: 'My Team',
        icon: 'bi bi-diagram-3',
      },
      {
        to: '/manager/self-assessment',
        label: 'My Self-Assessment',
        icon: 'bi bi-pencil-square',
      },
      {
        to: '/manager/assessment-review',
        label: 'Assessment Review',
        icon: 'bi bi-clipboard-check',
      },
      {
        to: '/manager/kpis',
        label: 'My KPIs',
        icon: 'bi bi-bullseye',
      },
      {
        to: '/manager/kpi-scoring',
        label: 'Team KPIs',
        icon: 'bi bi-bullseye',
        children: [
          {
            to: '/manager/kpi-scoring',
            label: 'KPI Scoring',
            icon: 'bi bi-clipboard2-check',
            end: true,
          },
          {
            to: '/manager/kpi/history',
            label: 'KPI History',
            icon: 'bi bi-clock-history',
          },
        ],
      },

      {
        to: '/manager/appraisals',
        label: 'Appraisal Review',
        icon: 'bi bi-clipboard-data',
        children: [
          {
            to: '/manager/appraisals',
            label: 'Review Forms',
            icon: 'bi bi-ui-checks',
            end: true,
          },
          {
            to: '/manager/appraisals/history',
            label: 'Review History',
            icon: 'bi bi-clock-history',
          },
        ],
      },

      {
        to: '/manager/feedback',
        label: '360 Feedback',
        icon: 'bi bi-chat-square-dots',
        children: [
          { to: '/manager/feedback', label: 'My Assignments', icon: 'bi bi-chat-dots', end: true },
          { to: '/manager/feedback/summary', label: 'Team Summary', icon: 'bi bi-people' },
          { to: '/manager/reports/feedback-completion', label: 'Feedback Completion', icon: 'bi bi-activity' },
        ],
      },

      {
        to: '/continuous-feedback',
        label: 'Continuous Feedback',
        icon: 'bi bi-chat-dots',
      },

      {
        to: '/one-on-one-meetings',
        label: 'One-on-One',
        icon: 'bi bi-chat-left-text',
        children: [
          {
            to: '/one-on-one-meetings',
            label: '1:1 Meetings',
            icon: 'bi bi-chat-dots',
          },
          {
            to: '/one-on-one-action-items',
            label: 'Action Items',
            icon: 'bi bi-list-check',
          },
        ],
      },

      {
        to: '/pip',
        label: 'PIP',
        icon: 'bi bi-clipboard2-pulse',
        children: [
          {
            to: '/pip/create',
            label: 'Create PIP',
            icon: 'bi bi-plus-square',
          },
          {
            to: '/pip/past-plans',
            label: 'Past Plans',
            icon: 'bi bi-clock-history',
          },
        ],
      },

      {
        to: '/manager/reports',
        label: 'Reports',
        icon: 'bi bi-file-earmark-bar-graph',
        children: [
          {
            to: '/manager/reports/performance',
            label: 'Performance Reports',
            icon: 'bi bi-file-earmark-bar-graph',
          },
          {
            to: '/manager/reports/pip-status',
            label: 'PIP Status',
            icon: 'bi bi-clipboard2-pulse',
          },
          {
            to: '/manager/reports/feedback-completion',
            label: 'Feedback Completion',
            icon: 'bi bi-chat-dots',
          },
          {
            to: '/manager/reports/recommendations',
            label: 'Recommendations',
            icon: 'bi bi-stars',
          },
        ],
      },

      {
        to: '/notifications',
        label: 'Notifications',
        icon: 'bi bi-bell',
        children: [
          {
            to: '/notifications',
            label: 'Notifications',
            icon: 'bi bi-bell',
          },
        ],
      },
    ]);

    const executiveNavItems: NavItem[] = [
      { to: '/executive/dashboard', label: 'Executive Dashboard', icon: 'bi bi-building' },
      { to: '/profile', label: 'Profile', icon: 'bi bi-person' },
      {
        to: '/executive/kpi-scoring',
        label: 'KPI Management',
        icon: 'bi bi-bullseye',
        children: [
          { to: '/executive/kpi-scoring', label: 'KPI Scoring', icon: 'bi bi-ui-checks-grid', end: true },
          { to: '/executive/kpi/history', label: 'KPI History', icon: 'bi bi-clock-history' },
        ],
      },
      {
        to: '/executive/reports',
        label: 'Reports',
        icon: 'bi bi-file-earmark-bar-graph',
        children: [
          { to: '/executive/reports/performance', label: 'Performance Reports', icon: 'bi bi-file-earmark-bar-graph', end: true },
          { to: '/executive/reports/department-performance', label: 'Department Performance', icon: 'bi bi-building-check', end: true },
          { to: '/executive/reports/pip-status', label: 'PIP Status', icon: 'bi bi-clipboard2-pulse', end: true },
          { to: '/executive/reports/feedback-completion', label: 'Feedback Completion', icon: 'bi bi-chat-dots', end: true },
          { to: '/executive/reports/recommendations', label: 'Recommendations', icon: 'bi bi-stars', end: true },
        ],
      },
      { to: '/notifications', label: 'Notifications', icon: 'bi bi-bell' },
    ];

    const departmentHeadNavItems: NavItem[] = compactItems([
      {
        to: '/department-head/dashboard',
        label: 'Department Dashboard',
        icon: 'bi bi-grid-1x2',
      },
      {
        to: '/profile',
        label: 'Profile',
        icon: 'bi bi-person',
      },
      hasMyTeams && {
        to: '/my-team',
        label: 'My Team',
        icon: 'bi bi-diagram-3',
      },
      {
        to: '/department-head/self-assessment-forms',
        label: 'View Self-assessment Form',
        icon: 'bi bi-eye',
      },
      {
        to: '/department-head/assessment-scores',
        label: 'Assessment Review',
        icon: 'bi bi-clipboard-data',
      },

      {
        to: '/continuous-feedback',
        label: 'Continuous Feedback',
        icon: 'bi bi-chat-dots',
      },

      {
        to: '/department-head/feedback',
        label: '360 Feedback',
        icon: 'bi bi-chat-square-dots',
      },

      {
        to: '/department-head/kpis',
        label: 'My KPIs',
        icon: 'bi bi-bullseye',
      },
      {
        to: '/department-head/department-kpis',
        label: 'Department KPIs',
        icon: 'bi bi-building-check',
      },
      {
        to: '/department-head/kpi-scoring',
        label: 'Manager KPI Scoring',
        icon: 'bi bi-ui-checks-grid',
        children: [
          {
            to: '/department-head/kpi-scoring',
            label: 'Score Managers',
            icon: 'bi bi-clipboard2-check',
            end: true,
          },
          {
            to: '/department-head/kpi/history',
            label: 'KPI History',
            icon: 'bi bi-clock-history',
          },
        ],
      },

      {
        to: '/department-head/teams',
        label: 'Teams',
        icon: 'bi bi-people-fill',
        children: compactItems([
          {
            to: '/department-head/teams',
            label: 'View Teams',
            icon: 'bi bi-eye',
            end: true,
          },
          allow(positionPermissions, 'teamCreate') && {
            to: '/department-head/teams/create',
            label: 'Create Team',
            icon: 'bi bi-plus-square',
          },
          allow(positionPermissions, 'teamHistory') && {
            to: '/department-head/team-history',
            label: 'Team History',
            icon: 'bi bi-clock-history',
          },
        ]),
      },

      {
        to: '/department-head/reports',
        label: 'Reports',
        icon: 'bi bi-file-earmark-bar-graph',
        children: [
          {
            to: '/department-head/reports/performance',
            label: 'Performance Reports',
            icon: 'bi bi-file-earmark-bar-graph',
          },
          {
            to: '/department-head/reports/department-performance',
            label: 'Department Performance',
            icon: 'bi bi-graph-up-arrow',
          },
          {
            to: '/department-head/reports/assessment-scores',
            label: 'Assessment Scores',
            icon: 'bi bi-clipboard-data',
          },
          {
            to: '/department-head/reports/pip-status',
            label: 'PIP Status',
            icon: 'bi bi-clipboard2-pulse',
          },
          {
            to: '/department-head/reports/feedback-completion',
            label: 'Feedback Completion',
            icon: 'bi bi-chat-dots',
          },
          {
            to: '/department-head/reports/recommendations',
            label: 'Recommendations',
            icon: 'bi bi-stars',
          },
        ],
      },

      {
        to: '/department-head/appraisals/review',
        label: 'Appraisals',
        icon: 'bi bi-clipboard-check',
        children: [
          {
            to: '/department-head/appraisals/review',
            label: 'Review Check',
            icon: 'bi bi-shield-check',
            end: true,
          },
          {
            to: '/department-head/appraisals/history',
            label: 'Review History',
            icon: 'bi bi-clock-history',
          },
        ],
      },

      {
        to: '/one-on-one-meetings',
        label: 'One-on-One',
        icon: 'bi bi-chat-left-text',
        children: [
          {
            to: '/one-on-one-meetings',
            label: '1:1 Meetings',
            icon: 'bi bi-chat-dots',
          },
          {
            to: '/one-on-one-action-items',
            label: 'Action Items',
            icon: 'bi bi-list-check',
          },
        ],
      },

      {
        to: '/pip',
        label: 'PIP',
        icon: 'bi bi-clipboard2-pulse',
        children: [
          {
            to: '/pip/create',
            label: 'Create PIP',
            icon: 'bi bi-plus-square',
          },
          {
            to: '/pip/past-plans',
            label: 'Past Plans',
            icon: 'bi bi-clock-history',
          },
        ],
      },

      {
        to: '/notifications',
        label: 'Notifications',
        icon: 'bi bi-bell',
        children: [
          {
            to: '/notifications',
            label: 'Notifications',
            icon: 'bi bi-bell',
          },
        ],
      },
    ]);

    if (variant === 'admin') return hrAdminNavItems;
    if (variant === 'hr') return hrNavItems;
    if (isHrAdmin) return hrAdminNavItems;
    if (isHr) return hrNavItems;
    if (isDepartmentHead) return departmentHeadNavItems;
    if (isExecutive) return executiveNavItems;
    if (isManager) return managerNavItems;
    if (isEmployee) return employeeNavItems;

    return hrNavItems;
  }, [
    variant,
    isHrAdmin,
    isHr,
    isDepartmentHead,
    isExecutive,
    isManager,
    isEmployee,
    canCreatePip,
    canViewPip,
    positionPermissions,
    hasMyTeams,
  ]);
  const loadUnreadCount = useCallback(async () => {
    try {
      const response = await api.get('/notifications/unread-count');
      const body = response.data as { data?: number } | number;
      const count = typeof body === 'number' ? body : body?.data;

      setUnreadCount(typeof count === 'number' ? count : 0);
    } catch {
      setUnreadCount(0);
    }
  }, []);

  useEffect(() => {
    void loadUnreadCount();
  }, [loadUnreadCount, location.pathname]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadUnreadCount();
    }, 30000);

    return () => {
      window.clearInterval(timer);
    };
  }, [loadUnreadCount]);

  useEffect(() => {
    const onNotificationsUpdated = () => {
      void loadUnreadCount();
    };
    const onNotificationsReadStateChanged = (event: Event) => {
      const detail = (event as CustomEvent<{ unreadCount?: number }>).detail;

      if (typeof detail?.unreadCount === 'number') {
        setUnreadCount(detail.unreadCount);
        return;
      }

      void loadUnreadCount();
    };

    window.addEventListener('epms:notifications-updated', onNotificationsUpdated);
    window.addEventListener('epms:notifications-read-state-changed', onNotificationsReadStateChanged);

    return () => {
      window.removeEventListener('epms:notifications-updated', onNotificationsUpdated);
      window.removeEventListener('epms:notifications-read-state-changed', onNotificationsReadStateChanged);
    };
  }, [loadUnreadCount]);

  useNotificationsWebSocket(() => {
    setUnreadCount((prev) => prev + 1);
  });

  const notificationBadge =
      unreadCount > 0 ? (
          <span className="hr-nav-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
      ) : null;

  const hasActiveChild = useCallback(
      (item: NavItem): boolean =>
          item.children?.some((child) => {
            const childActive = child.end
                ? location.pathname === child.to
                : location.pathname === child.to || location.pathname.startsWith(`${child.to}/`);

            return childActive || hasActiveChild(child);
          }) ?? false,
      [location.pathname],
  );

  useEffect(() => {
    setExpanded((prev) => {
      const next = new Set(prev);

      navItems.forEach((item) => {
        if (hasActiveChild(item)) {
          next.add(item.to);
        }
      });

      if (next.size === prev.size && [...next].every((value) => prev.has(value))) {
        return prev;
      }

      return next;
    });
  }, [hasActiveChild, navItems]);

  const isParentActive = (item: NavItem) =>
      location.pathname.startsWith(item.to) || hasActiveChild(item);

  const toggleParent = (item: NavItem) => {
    if (!item.children?.length) {
      navigate(item.to);
      return;
    }

    setExpanded((prev) => {
      const next = new Set(prev);

      if (next.has(item.to)) {
        next.delete(item.to);
      } else {
        next.add(item.to);
      }

      return next;
    });
  };

  const renderSubmenuItem = (child: NavItem, depth = 0) => {
    const childExpanded = expanded.has(child.to);
    const childActive = child.end
        ? location.pathname === child.to
        : location.pathname === child.to || location.pathname.startsWith(`${child.to}/`) || hasActiveChild(child);

    if (child.children?.length) {
      return (
          <div key={child.to} className="hr-submenu-group">
            <button
                type="button"
                className={`hr-submenu-link hr-submenu-toggle ${childActive ? 'active' : ''}`}
                style={{ marginLeft: depth * 12 }}
                onClick={() => toggleParent(child)}
            >
              <i className={child.icon} />
              <span>{child.label}</span>
              <i className={`bi ${childExpanded ? 'bi-chevron-down' : 'bi-chevron-right'} hr-submenu-caret`} />
            </button>
            {childExpanded && (
                <div className="hr-submenu hr-submenu-nested">
                  {child.children.map((grandchild) => renderSubmenuItem(grandchild, depth + 1))}
                </div>
            )}
          </div>
      );
    }

    return (
        <NavLink
            key={child.to}
            to={child.to}
            end={child.end}
            className={({ isActive }) =>
                `hr-submenu-link ${isActive ? 'active' : ''}`
            }
            style={{ marginLeft: depth * 12 }}
        >
          <i className={child.icon} />
          <span>{child.label}</span>
          {child.to.includes('notifications') && notificationBadge}
        </NavLink>
    );
  };

  return (
      <aside className={`hr-sidebar ${collapsed ? 'collapsed' : ''}`}>
        <div className="hr-sidebar-top">
          <div className="hr-brand">
            <SidebarCompanyLogo />

            {!collapsed && (
                <div className="hr-brand-copy">
                  <h2>EPMS</h2>
                  <p>Performance System</p>
                </div>
            )}
          </div>

          {!collapsed && <div className="hr-sidebar-top-divider" />}
        </div>

        {!collapsed && (
            <div className="hr-role-chip">
              <small>CURRENT ROLE</small>
              <strong>{roleLabel}</strong>
            </div>
        )}

        <nav className="hr-nav">
          {navItems.map((item) => {
            const isExpanded = expanded.has(item.to);
            const parentActive = isParentActive(item);

            if (!item.children?.length) {
              return (
                  <NavLink
                      key={item.to}
                      to={item.to}
                      end={item.end}
                      className={({ isActive }) => `hr-nav-link ${isActive ? 'active' : ''}`}
                      title={collapsed ? item.label : undefined}
                  >
                    <i className={item.icon} />
                    {!collapsed && <span>{item.label}</span>}
                    {item.to.includes('notifications') && notificationBadge}
                  </NavLink>
              );
            }

            return (
                <div key={item.to} className="hr-nav-group">
                  <button
                      type="button"
                      className={`hr-nav-link hr-nav-group-toggle ${parentActive ? 'active' : ''}`}
                      onClick={() => toggleParent(item)}
                      title={collapsed ? item.label : undefined}
                  >
                    <i className={item.icon} />

                    {!collapsed && (
                        <>
                          <span>{item.label}</span>
                          {item.to.includes('notifications') && notificationBadge}
                          <i className={`bi bi-chevron-${isExpanded ? 'up' : 'down'} hr-submenu-caret`} />
                        </>
                    )}
                  </button>

                  {!collapsed && isExpanded && (
                      <div className="hr-submenu">
                        {item.children.map((child) => renderSubmenuItem(child))}
                      </div>
                  )}
                </div>
            );
          })}
        </nav>

        <div className="hr-sidebar-footer">
          <button
              type="button"
              className="hr-sidebar-collapse"
              onClick={onToggle}
              aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <i className={`bi ${collapsed ? 'bi-chevron-right' : 'bi-chevron-left'}`} />
            {!collapsed && <span>Collapse</span>}
          </button>
        </div>
      </aside>
  );
};

export default Sidebar;
