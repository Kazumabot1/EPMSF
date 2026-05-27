import { useCallback, useEffect, useMemo, useState } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { authStorage } from '../../services/authStorage';
import api from '../../services/api';
import { useNotificationsWebSocket } from '../../hooks/useNotificationsWebSocket';
import SidebarCompanyLogo from './SidebarCompanyLogo';

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

const normalizeRoleName = (role: string) =>
    String(role ?? '')
        .replace(/^ROLE_/i, '')
        .replace(/([a-z])([A-Z])/g, '$1_$2')
        .replace(/[\s-]+/g, '_')
        .toUpperCase();

const Sidebar = ({ collapsed, onToggle, variant }: SidebarProps) => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = authStorage.getUser();
  const [unreadCount, setUnreadCount] = useState(0);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const dashboard = user?.dashboard ?? '';
  const normalizedRoles = (user?.roles ?? []).map(normalizeRoleName);
  const normalizedDashboard = normalizeRoleName(dashboard);

  const isAdmin =
    normalizedRoles.includes('ADMIN') ||
    normalizedDashboard === 'ADMIN_DASHBOARD';

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

  const isEmployee =
    !isAdmin &&
    !isHr &&
    !isDepartmentHead &&
    !isManager &&
    (normalizedRoles.includes('EMPLOYEE') ||
      normalizedDashboard === 'EMPLOYEE_DASHBOARD');

  const isExecutive =
    normalizedRoles.includes('CEO') ||
    normalizedRoles.includes('EXECUTIVE') ||
    normalizedDashboard === 'CEO_DASHBOARD' ||
    normalizedDashboard === 'EXECUTIVE_DASHBOARD';

  const isHrOnly = variant === 'hr' || isHr;
  const canCreatePip = !isHrOnly && !isEmployee && variant !== 'admin';
const roleLabel =
  variant === 'admin'
    ? 'Admin'
    : variant === 'hr'
      ? 'HR'
      : isAdmin
        ? 'Admin'
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

  const navItems: NavItem[] = useMemo(() => {
    const pipChildren: NavItem[] = canCreatePip
        ? [
          { to: '/pip/create', label: 'Create', icon: 'bi bi-plus-square' },
          { to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' },
        ]
        : [{ to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' }];

    const adminNavItems: NavItem[] = [
      { to: '/admin/dashboard', label: 'Admin Dashboard', icon: 'bi bi-shield-lock' },
      { to: '/admin/users', label: 'User Accounts', icon: 'bi bi-person-plus' },
      { to: '/admin/audit-logs', label: 'Audit Logs', icon: 'bi bi-clock-history' },
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

    const hrNavItems: NavItem[] = [
      { to: '/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
      { to: '/hr/kpis', label: 'My KPIs', icon: 'bi bi-bullseye' },
      {
        to: '/hr/team',
        label: 'Teams',
        icon: 'bi bi-people-fill',
        children: [
          { to: '/hr/team', label: 'View Teams', icon: 'bi bi-eye', end: true },
          { to: '/hr/team/history', label: 'Team History', icon: 'bi bi-clock-history', end: true },
        ],
      },
      {
        to: '/hr/organization',
        label: 'Organization',
        icon: 'bi bi-building',
        children: [
          { to: '/hr/department', label: 'Departments', icon: 'bi bi-building' },
          {
            to: '/hr/department-comparison',
            label: 'Department Comparison',
            icon: 'bi bi-columns-gap',
            end: true,
          },
          { to: '/hr/employee', label: 'Employee', icon: 'bi bi-people', end: true },
        ],
      },
      {
        to: '/hr/assessment-scores',
        label: 'Assessment',
        icon: 'bi bi-clipboard-data',
        children: [
          { to: '/hr/assessment-scores', label: 'Scores', icon: 'bi bi-clipboard-data', end: true },
          { to: '/hr/assessment-forms', label: 'Form Create', icon: 'bi bi-ui-checks-grid', end: true },
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
      {
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
            to: '/hr/appraisal/template-forms',
            label: 'Template Form Records',
            icon: 'bi bi-folder2-open',
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
      {
        to: '/hr/feedback/questions',
        label: '360 Feedback',
        icon: 'bi bi-chat-square-dots',
        children: [
          { to: '/hr/feedback/questions', label: 'Question Bank', icon: 'bi bi-collection', end: true },
          { to: '/hr/feedback/question-rules', label: 'Question Rules', icon: 'bi bi-sliders' },
          { to: '/hr/feedback/dynamic-preview', label: 'Dynamic Preview', icon: 'bi bi-eye' },
          { to: '/hr/feedback/campaigns', label: 'Campaign Setup', icon: 'bi bi-megaphone' },
          // { to: '/hr/feedback/targets', label: 'Targets & Evaluators', icon: 'bi bi-people' },
          // { to: '/hr/feedback/assignment-preview', label: 'Assignment Preview', icon: 'bi bi-diagram-3' },
          { to: '/hr/feedback/monitoring', label: 'Monitoring', icon: 'bi bi-graph-up-arrow' },
          { to: '/hr/feedback/analytics', label: 'Analytics', icon: 'bi bi-bar-chart-line' },
          { to: '/hr/feedback/audit', label: 'Audit Log', icon: 'bi bi-shield-check' },
        ],
      },
      {
        to: '/one-on-one-meetings',
        label: 'One-on-One',
        icon: 'bi bi-chat-left-text',
        children: [
          { to: '/one-on-one-meetings', label: '1:1 Meetings', icon: 'bi bi-chat-dots' },
          { to: '/one-on-one-action-items', label: 'Action Items', icon: 'bi bi-list-check' },
        ],
      },
      {
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
          { to: '/notification-templates', label: 'Notification Template', icon: 'bi bi-file-earmark-text' },
          { to: '/notifications', label: 'System Notification', icon: 'bi bi-bell' },
        ],
      },
      {
        to: '/hr/position/create',
        label: 'Positions',
        icon: 'bi bi-briefcase',
        children: [
          { to: '/hr/position/create', label: 'Create Position', icon: 'bi bi-briefcase' },
          { to: '/hr/position-level/create', label: 'Position Levels', icon: 'bi bi-diagram-3' },
          { to: '/hr/position/table', label: 'Positions Table', icon: 'bi bi-table' },
        ],
      },
      {
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
      {
        to: '/hr/department-kpi-template',
        label: 'Department KPI Management',
        icon: 'bi bi-building-gear',
        children: [
          { to: '/hr/department-kpi-template', label: 'Department KPI Templates', icon: 'bi bi-building-gear' },
          { to: '/hr/department-kpi-cycle', label: 'Department KPI Cycle', icon: 'bi bi-arrow-repeat' },
          { to: '/hr/department-kpi-scoring', label: 'Department KPI Scoring', icon: 'bi bi-clipboard2-check' },
          { to: '/hr/department-kpi-results', label: 'Department KPI Results', icon: 'bi bi-building-check' },
        ],
      },
    ];

    const employeeNavItems: NavItem[] = [
      { to: '/employee/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
      { to: '/profile', label: 'Profile', icon: 'bi bi-person' },
      { to: '/employee/kpis', label: 'My KPIs', icon: 'bi bi-bullseye' },
      { to: '/employee/appraisals', label: 'My Appraisals', icon: 'bi bi-clipboard-check' },
      { to: '/employee/self-assessment', label: 'Self-Assessment', icon: 'bi bi-pencil-square' },
      { to: '/employee/feedback', label: 'My Feedback', icon: 'bi bi-chat-dots' },
      { to: '/employee/one-on-ones', label: 'One-on-Ones', icon: 'bi bi-calendar-check' },
      {
        to: '/pip',
        label: 'PIP',
        icon: 'bi bi-clipboard2-pulse',
        children: [{ to: '/pip/past-plans', label: 'Past Plans', icon: 'bi bi-clock-history' }],
      },
      { to: '/employee/notifications', label: 'Notifications', icon: 'bi bi-bell' },
    ];

    const executiveNavItems: NavItem[] = [
      { to: '/executive/dashboard', label: 'Executive Dashboard', icon: 'bi bi-building' },
      { to: '/profile', label: 'Profile', icon: 'bi bi-person' },
      {
        to: '/executive/approval/kpi',
        label: 'Approval',
        icon: 'bi bi-shield-check',
        children: [
          { to: '/executive/approval/kpi', label: 'KPI Approval', icon: 'bi bi-bullseye', end: true },
          { to: '/executive/approval/department-kpi', label: 'Department KPI Approval', icon: 'bi bi-building-check', end: true },
        ],
      },
      {
        to: '/executive/reports',
        label: 'Reports',
        icon: 'bi bi-bar-chart-line',
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

const departmentHeadNavItems: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: 'bi bi-grid-1x2' },
  { to: '/profile', label: 'Profile', icon: 'bi bi-person' },
  { to: '/department-head/teams', label: 'View Teams', icon: 'bi bi-people-fill' },
  {
    to: '/notifications',
    label: 'Notifications',
    icon: 'bi bi-bell',
    children: [
      { to: '/notifications', label: 'System Notification', icon: 'bi bi-bell' },
    ],
  },
];

  if (variant === 'admin') return adminNavItems;
  if (variant === 'hr') return hrNavItems;
  if (isAdmin) return adminNavItems;
  if (isHr) return hrNavItems;
  if (isDepartmentHead) return departmentHeadNavItems;
  if (isExecutive) return executiveNavItems;
  if (isEmployee) return employeeNavItems;

  return hrNavItems;

}, [variant, isAdmin, isHr, isDepartmentHead, isExecutive, isEmployee, canCreatePip]);
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

    window.addEventListener('epms:notifications-updated', onNotificationsUpdated);

    return () => {
      window.removeEventListener('epms:notifications-updated', onNotificationsUpdated);
    };
  }, [loadUnreadCount]);

  useNotificationsWebSocket(() => {
    setUnreadCount((prev) => prev + 1);
  });

  const notificationBadge = unreadCount > 0 ? (
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
                          <i
                              className={`bi ${
                                  isExpanded ? 'bi-chevron-down' : 'bi-chevron-right'
                              } hr-submenu-caret`}
                          />
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
